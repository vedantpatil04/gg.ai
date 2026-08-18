import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes fresh data window
        gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
        refetchOnWindowFocus: false, // Prevent bursts on tab switching
        refetchOnMount: false,       // Avoid immediate duplicate fetches upon SSR hydration
        retry: (failureCount, error: any) => {
          // Do not retry on 429 (rate limit) or 404 (not found)
          if (error?.response?.status === 429 || error?.response?.status === 404) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

