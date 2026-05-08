import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";

import Layout from "@/components/layout";
import DashboardPage from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import TemplatePage from "@/pages/template";
import LogsPage from "@/pages/logs";
import LoginPage from "@/pages/login";

import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (me?.authRequired && !me?.authenticated) {
    return (
      <LoginPage
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }}
      />
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/leads" component={LeadsPage} />
        <Route path="/template" component={TemplatePage} />
        <Route path="/logs" component={LogsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGuard>
            <Router />
          </AuthGuard>
        </WouterRouter>
        <Toaster theme="dark" position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
