import { useState, useCallback } from "react";
import type { SupportTicket } from "./support-data";
import { MOCK_TICKETS, SUPPORT_STORAGE_KEYS } from "./support-data";

// ─── helpers ──────────────────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export interface NewTicketInput {
  subject: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  description: string;
  department: string;
  environment: string;
}

export function useTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>(() =>
    readLS<SupportTicket[]>(SUPPORT_STORAGE_KEYS.tickets, MOCK_TICKETS),
  );

  const createTicket = useCallback((input: NewTicketInput): SupportTicket => {
    const ticket: SupportTicket = {
      id: `TKT-${Math.floor(2100 + Math.random() * 900)}`,
      subject: input.subject,
      category: input.category,
      status: "open",
      priority: input.priority,
      createdAt: "Just now",
      updatedAt: "Just now",
      assignedTeam: "Support Team",
      department: input.department || "General",
      environment: input.environment || "Production",
      estimatedResponse:
        input.priority === "critical" ? "Within 1 hour" :
        input.priority === "high"     ? "Within 2 hours" :
                                        "Within 4 hours",
      description: input.description,
      tags: [],
    };
    setTickets(prev => {
      const next = [ticket, ...prev];
      writeLS(SUPPORT_STORAGE_KEYS.tickets, next);
      return next;
    });
    return ticket;
  }, []);

  return { tickets, createTicket };
}

// ─── Feature votes ────────────────────────────────────────────────────────────

export function useFeatureRequests() {
  const [votedIds, setVotedIds] = useState<string[]>(() =>
    readLS<string[]>(SUPPORT_STORAGE_KEYS.featureVotes, []),
  );
  const [localVotes, setLocalVotes] = useState<Record<string, number>>({});

  const toggleVote = useCallback((id: string) => {
    setVotedIds(prev => {
      const hasVoted = prev.includes(id);
      const next = hasVoted ? prev.filter(v => v !== id) : [...prev, id];
      writeLS(SUPPORT_STORAGE_KEYS.featureVotes, next);
      setLocalVotes(lv => ({ ...lv, [id]: hasVoted ? -1 : 1 }));
      return next;
    });
  }, []);

  const hasVoted = useCallback((id: string) => votedIds.includes(id), [votedIds]);

  const getVotes = useCallback((id: string, baseVotes: number) =>
    baseVotes + (localVotes[id] ?? 0), [localVotes]);

  return { toggleVote, hasVoted, getVotes };
}

// ─── Bug reports ──────────────────────────────────────────────────────────────

export interface BugReportInput {
  title: string;
  category: string;
  severity: string;
  browser: string;
  device: string;
  steps: string;
  expected: string;
  actual: string;
}

export function useBugReports() {
  const [submitted, setSubmitted] = useState(false);

  const submitBug = useCallback((input: BugReportInput) => {
    const reports = readLS<BugReportInput[]>(SUPPORT_STORAGE_KEYS.bugReports, []);
    writeLS(SUPPORT_STORAGE_KEYS.bugReports, [input, ...reports]);
    setSubmitted(true);
  }, []);

  const reset = useCallback(() => setSubmitted(false), []);

  return { submitted, submitBug, reset };
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export interface FeedbackInput {
  rating: number;
  category: string;
  comment: string;
  nps: number;
  uiSatisfaction: number;
  aiSatisfaction: number;
}

export function useFeedback() {
  const [submitted, setSubmitted] = useState(false);

  const submitFeedback = useCallback((input: FeedbackInput) => {
    const history = readLS<FeedbackInput[]>(SUPPORT_STORAGE_KEYS.feedbackHistory, []);
    writeLS(SUPPORT_STORAGE_KEYS.feedbackHistory, [input, ...history]);
    setSubmitted(true);
  }, []);

  const reset = useCallback(() => setSubmitted(false), []);

  return { submitted, submitFeedback, reset };
}
