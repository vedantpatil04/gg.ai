import { createFileRoute } from "@tanstack/react-router";
import { HelpCenterHome } from "@/components/help-center/help-center-home";
import { useNavigate } from "@tanstack/react-router";

function HelpHome() {
  const navigate = useNavigate();
  return (
    <HelpCenterHome
      onSearchClick={() => navigate({ to: "/help/knowledge-base" })}
    />
  );
}

export const Route = createFileRoute("/help/")({
  head: () => ({
    meta: [{ title: "Help Center — GreenGuard AI" }],
  }),
  component: HelpHome,
});
