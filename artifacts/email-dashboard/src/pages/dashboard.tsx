import {
  useGetDashboardStats,
  useGetDashboardActivity,
  useCreateLead,
  useGetCronStatus,
  useTriggerCron,
  getGetDashboardStatsQueryKey,
  getGetDashboardActivityQueryKey,
  getGetLeadsQueryKey,
  getGetCronStatusQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Mail, MailWarning, MailCheck, BarChart3, Clock, Loader2, Plus, Timer, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();
  const { data: cronStatus, isLoading: cronLoading } = useGetCronStatus({
    query: { refetchInterval: 30_000 },
  });
  const createLead = useCreateLead();
  const triggerCron = useTriggerCron();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    createLead.mutate({ data: { name, email, company, source: "manual" } }, {
      onSuccess: () => {
        toast.success("Lead added successfully");
        setName("");
        setEmail("");
        setCompany("");
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardActivityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
      },
      onError: () => toast.error("Failed to add lead"),
    });
  };

  const handleTrigger = () => {
    triggerCron.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(result.message ?? "Auto-send complete");
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardActivityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCronStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
      },
      onError: () => toast.error("Trigger failed"),
    });
  };

  if (statsLoading || activityLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  const statCards = [
    { title: "Total Leads", value: stats?.totalLeads ?? 0, icon: Users },
    { title: "Emails Sent", value: stats?.emailsSent ?? 0, icon: MailCheck },
    { title: "Pending", value: stats?.emailsPending ?? 0, icon: Clock },
    { title: "Failed", value: stats?.emailsFailed ?? 0, icon: MailWarning },
    { title: "Success Rate", value: `${stats?.successRate ?? 0}%`, icon: BarChart3 },
    { title: "Recently Sent", value: stats?.recentlySent ?? 0, icon: Mail },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduler Status */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">Auto-Send Scheduler</CardTitle>
            {cronLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : cronStatus?.isRunning ? (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 bg-emerald-400/10 text-xs px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5">Inactive</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTrigger}
            disabled={triggerCron.isPending}
            className="h-7 px-3 text-xs"
          >
            {triggerCron.isPending ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-1.5" />
            )}
            Run Now
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Interval</p>
              <p className="font-medium">Every {cronStatus?.intervalHours ?? 1} hour</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Last Run</p>
              <p className="font-medium">
                {cronStatus?.lastRun
                  ? formatDistanceToNow(new Date(cronStatus.lastRun), { addSuffix: true })
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Next Run</p>
              <p className="font-medium">
                {cronStatus?.nextRun
                  ? format(new Date(cronStatus.nextRun), "h:mm a")
                  : "—"}
              </p>
            </div>
          </div>
          {cronStatus?.lastResult && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {cronStatus.lastResult.startsWith("Error") ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-destructive" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
              )}
              <span>{cronStatus.lastResult}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity + Quick Add */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {Array.isArray(activity) && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4 text-sm">
                    <div className="mt-0.5 shrink-0 w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium text-foreground">{item.message}</p>
                      <p className="text-muted-foreground text-xs">{format(new Date(item.timestamp), "PPpp")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground h-full flex items-center justify-center py-8">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Quick Add Lead</CardTitle>
            <CardDescription>Manually add a single lead for outreach.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" className="bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" className="bg-background" />
              </div>
              <Button type="submit" className="w-full" disabled={createLead.isPending}>
                {createLead.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Lead
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
