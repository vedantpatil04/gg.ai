import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeBasePage } from "@/components/help-center/kb/kb-page";

export const Route = createFileRoute("/help/knowledge-base")({
  head: () => ({
    meta: [{ title: "Knowledge Base — GreenGuard Help" }],
  }),
  component: KnowledgeBasePage,
});
