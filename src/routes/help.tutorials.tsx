import { createFileRoute } from "@tanstack/react-router";
import { TutorialsPage } from "@/components/help-center/tutorials/tut-page";

export const Route = createFileRoute("/help/tutorials")({
  head: () => ({
    meta: [{ title: "Tutorials & Guides — GreenGuard Help" }],
  }),
  component: TutorialsPage,
});
