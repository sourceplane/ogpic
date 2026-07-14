"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "@/lib/session";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate: cached data paints instantly on navigation
        // and revalidates in the background. gcTime keeps it around between
        // visits. Conservative focus refetch to avoid surprise spinners.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Clear the query cache when the auth token changes (login/logout/token swap)
 * so a new identity never reads the previous one's cached data.
 */
function CacheResetOnAuthChange() {
  const { token } = useSession();
  const qc = React.useContext(QueryClientCtx);
  const prev = React.useRef(token);
  React.useEffect(() => {
    if (prev.current !== token) {
      prev.current = token;
      qc?.clear();
    }
  }, [token, qc]);
  return null;
}

const QueryClientCtx = React.createContext<QueryClient | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient for the app lifetime (survives re-renders, not re-created).
  const [queryClient] = React.useState(makeQueryClient);

  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <QueryClientCtx.Provider value={queryClient}>
          <SessionProvider>
            <CacheResetOnAuthChange />
            {children}
          </SessionProvider>
        </QueryClientCtx.Provider>
      </QueryClientProvider>
    </NextThemesProvider>
  );
}
