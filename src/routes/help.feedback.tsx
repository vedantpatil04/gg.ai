import { createFileRoute } from "@tanstack/react-router";
import { FeedbackCenterPage } from "@/components/feedback/feedback-page";

export const Route = createFileRoute("/help/feedback")({
  head: () => ({
    meta: [{ title: "Feedback & Feature Requests — GreenGuard Help" }],
  }),
  component: FeedbackCenterPage,
});
