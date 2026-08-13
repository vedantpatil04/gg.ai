import { Response, NextFunction } from "express";
import mongoose                   from "mongoose";
import { CommunityPost }          from "../models/CommunityPost";
import { AppError }               from "../middleware/errorHandler";
import { AuthRequest }            from "../middleware/auth";

// ─── List posts ───────────────────────────────────────────────────────────────

export async function getPosts(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(100, Number(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query.type)   filter.type   = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    // Simple text search
    if (req.query.q) {
      const q = (req.query.q as string).trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { body:  { $regex: q, $options: "i" } },
        { tags:  { $regex: q, $options: "i" } },
      ];
    }

    const sort: Record<string, 1 | -1> = req.query.sort === "views"
      ? { views: -1, createdAt: -1 }
      : { createdAt: -1 };

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .select("-replies")          // exclude reply bodies from list
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { posts, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
}

// ─── Single post ──────────────────────────────────────────────────────────────

export async function getPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    ).lean();

    if (!post) return next(new AppError("Post not found", 404));
    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
}

// ─── Create post ──────────────────────────────────────────────────────────────

export async function createPost(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const post = await CommunityPost.create({
      ...req.body,
      authorId:   req.user._id,
      authorName: req.user.name ?? "User",
    });
    res.status(201).json({ success: true, data: { post } });
  } catch (err) { next(err); }
}

// ─── Add reply ────────────────────────────────────────────────────────────────

export async function addReply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return next(new AppError("Post not found", 404));

    post.replies.push({
      _id:          new mongoose.Types.ObjectId(),
      body:         req.body.body,
      authorId:     req.user._id as mongoose.Types.ObjectId,
      authorName:   req.user.name ?? "User",
      isBestAnswer: false,
      createdAt:    new Date(),
      updatedAt:    new Date(),
    });
    post.replyCount = post.replies.length;
    await post.save();

    res.status(201).json({ success: true, data: { post } });
  } catch (err) { next(err); }
}

// ─── Mark best answer ─────────────────────────────────────────────────────────

export async function markBestAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return next(new AppError("Post not found", 404));

    // Only the post author or admin can mark best answer
    const isOwner = post.authorId.toString() === (req.user._id as mongoose.Types.ObjectId).toString();
    const isAdmin = req.user.role === "administrator";
    if (!isOwner && !isAdmin) return next(new AppError("Not authorised", 403));
    if (post.type !== "question") return next(new AppError("Only questions can have a best answer", 400));

    const { replyId } = req.params;

    // Clear existing best answer, set new one
    post.replies.forEach(r => { r.isBestAnswer = false; });
    const reply = post.replies.find(r => r._id.toString() === replyId);
    if (!reply) return next(new AppError("Reply not found", 404));
    reply.isBestAnswer  = true;
    post.hasBestAnswer  = true;
    post.status         = "resolved";

    await post.save();
    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
}

// ─── Edit reply ───────────────────────────────────────────────────────────────

export async function editReply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return next(new AppError("Post not found", 404));

    const reply = post.replies.find(r => r._id.toString() === req.params.replyId);
    if (!reply) return next(new AppError("Reply not found", 404));

    const isOwner = reply.authorId.toString() === (req.user._id as mongoose.Types.ObjectId).toString();
    if (!isOwner && req.user.role !== "administrator") return next(new AppError("Not authorised", 403));

    reply.body      = req.body.body;
    reply.updatedAt = new Date();
    await post.save();

    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
}

// ─── Delete reply ─────────────────────────────────────────────────────────────

export async function deleteReply(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return next(new AppError("Post not found", 404));

    const reply = post.replies.find(r => r._id.toString() === req.params.replyId);
    if (!reply) return next(new AppError("Reply not found", 404));

    const isOwner = reply.authorId.toString() === (req.user._id as mongoose.Types.ObjectId).toString();
    if (!isOwner && req.user.role !== "administrator") return next(new AppError("Not authorised", 403));

    post.replies    = post.replies.filter(r => r._id.toString() !== req.params.replyId) as typeof post.replies;
    post.replyCount = post.replies.length;
    if (reply.isBestAnswer) post.hasBestAnswer = false;
    await post.save();

    res.json({ success: true, data: { post } });
  } catch (err) { next(err); }
}
