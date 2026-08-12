import { Response, NextFunction } from "express";
import { v4 as uuidv4 }           from "uuid";
import { AppError }               from "../middleware/errorHandler";
import { AuthRequest }            from "../middleware/auth";
import { AIConversation }         from "../models/AIConversation";
import {
  generateHelpAnswer,
  getArticleRecommendations,
  generateTicketDraft,
  checkDuplicateTicket,
  generateArticleSummary,
  explainSelection,
  expandSearchQuery,
  generateHelpInsights,
  type HelpAIMessage,
} from "../services/gemini.service";
import { SupportTicket } from "../models/SupportTicket";

// ─── KB + Tutorial context (static titles for prompt context) ─────────────────

const KB_TITLES = [
  "Getting Started with GreenGuard AI",
  "Understanding the AQI Dashboard",
  "How to Submit an Environmental Complaint",
  "Smart Maps and Layer Management",
  "AI Copilot Usage Guide",
  "Two-Factor Authentication Setup",
  "Authority Command Center Overview",
  "Generating Environmental Reports",
  "Sensor Network and Data Validation",
  "Account Security and Privacy Settings",
  "Notification Preferences",
  "Role-Based Access Control",
  "Environmental Data Exports",
  "Understanding Pollution Alerts",
  "Mobile App Usage Guide",
];

const TUTORIAL_TITLES = [
  "GreenGuard Platform Walkthrough",
  "Submitting Your First Complaint",
  "Reading Your Local AQI",
  "Command Center Fundamentals",
  "AI Copilot: Your First Conversation",
  "Smart Maps: Complete Layer Guide",
  "Securing Your Account",
  "Sensor Network Deep Dive",
  "Configuring Alert Thresholds",
  "Advanced AI Copilot Analysis",
];

// ─── POST /api/help-ai/chat ───────────────────────────────────────────────────

export async function helpChat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { question, sessionId, history = [] } = req.body;
    if (!question?.trim()) return next(new AppError("Question is required", 400));

    const sid      = sessionId || uuidv4();
    const userRole = req.user?.role ?? "citizen";

    const result = await generateHelpAnswer(question, history as HelpAIMessage[], {
      kbTitles:       KB_TITLES,
      tutorialTitles: TUTORIAL_TITLES,
      userRole,
    });

    // Persist to AIConversation for history
    await AIConversation.findOneAndUpdate(
      { sessionId: sid },
      {
        $setOnInsert: {
          cityId:    "help",
          cityName:  "Help Center",
          sessionId: sid,
          userId:    req.user?._id,
        },
        $push: {
          messages: {
            $each: [
              { role: "user",      content: question,       timestamp: new Date() },
              { role: "assistant", content: result.answer,  timestamp: new Date() },
            ],
          },
        },
      },
      { upsert: true },
    );

    res.json({ success: true, data: { sessionId: sid, ...result } });
  } catch (err) { next(err); }
}

// ─── GET /api/help-ai/history ─────────────────────────────────────────────────

export async function getHelpHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));

    const conversations = await AIConversation.find({
      userId: req.user._id,
      cityId: "help",
    })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select("sessionId messages createdAt updatedAt")
      .lean();

    res.json({ success: true, data: { conversations } });
  } catch (err) { next(err); }
}

// ─── DELETE /api/help-ai/history/:sessionId ───────────────────────────────────

export async function deleteHelpConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    await AIConversation.deleteOne({ sessionId: req.params.sessionId, userId: req.user._id });
    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/recommend ─────────────────────────────────────────────

export async function getRecommendations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query?.trim()) { res.json({ success: true, data: { recommendations: [] } }); return; }

    const kbArticles = KB_TITLES.map((t, i) => ({
      id:   `kb-${i + 1}`,
      title: t,
      tags: t.toLowerCase().split(" ").filter(w => w.length > 3),
    }));
    const tutorials = TUTORIAL_TITLES.map((t, i) => ({
      id:   `tut-${i + 1}`,
      title: t,
      tags: t.toLowerCase().split(" ").filter(w => w.length > 3),
    }));

    const recommendations = await getArticleRecommendations(query, kbArticles, tutorials);
    res.json({ success: true, data: { recommendations } });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/draft-ticket ──────────────────────────────────────────

export async function draftTicket(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { description } = req.body;
    if (!description?.trim()) return next(new AppError("Description is required", 400));

    const draft = await generateTicketDraft(description);
    res.json({ success: true, data: { draft } });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/check-duplicate ───────────────────────────────────────

export async function checkDuplicate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const { subject } = req.body;
    if (!subject?.trim()) { res.json({ success: true, data: { isDuplicate: false } }); return; }

    const existing = await SupportTicket.find({
      status: { $in: ["open", "in_progress", "waiting"] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("subject status category")
      .lean();

    const result = await checkDuplicateTicket(
      subject,
      existing.map(t => ({ subject: t.subject, status: t.status, category: t.category })),
    );

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/summarize ─────────────────────────────────────────────

export async function summarizeArticle(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) return next(new AppError("title and content are required", 400));

    const summary = await generateArticleSummary(title, content);
    res.json({ success: true, data: { summary } });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/explain ────────────────────────────────────────────────

export async function explain(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, mode = "explain" } = req.body;
    if (!text?.trim()) return next(new AppError("text is required", 400));
    if (!["explain", "simplify", "expand"].includes(mode)) return next(new AppError("Invalid mode", 400));

    const result = await explainSelection(text, mode as "explain" | "simplify" | "expand");
    res.json({ success: true, data: { explanation: result, mode } });
  } catch (err) { next(err); }
}

// ─── POST /api/help-ai/search-expand ─────────────────────────────────────────

export async function searchExpand(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query?.trim()) { res.json({ success: true, data: { terms: [] } }); return; }

    const terms = await expandSearchQuery(query);
    res.json({ success: true, data: { terms } });
  } catch (err) { next(err); }
}

// ─── GET /api/help-ai/insights ────────────────────────────────────────────────

export async function getInsights(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const recentTickets = await SupportTicket.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("subject category")
      .lean();

    const recentQuestions = recentTickets.map(t => t.subject);
    const categories      = recentTickets.map(t => t.category);

    const insights = await generateHelpInsights(recentQuestions, categories);
    res.json({ success: true, data: { insights } });
  } catch (err) { next(err); }
}
