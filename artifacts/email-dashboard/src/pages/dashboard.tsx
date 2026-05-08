import { useGetDashboardStats, useGetDashboardActivity, useCreateLead, getGetDashboardStatsQueryKey, getGetDashboardActivityQueryKey, getGetLeadsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Mail, MailWarning, MailCheck, BarChart3, Clock, Loader2, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();
  const createLead = useCreateLead();

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
      onError: () => toast.error("Failed to add lead")
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {activity && activity.length > 0 ? (
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