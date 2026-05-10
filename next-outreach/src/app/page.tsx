"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Mail, MailWarning, MailCheck, BarChart3, Clock, Loader2, Plus, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  const fetchStats = async () => {
    const res = await fetch("/api/dashboard/stats");
    const data = await res.json();
    setStats(data);
  };

  const fetchActivity = async () => {
    const res = await fetch("/api/dashboard/activity");
    const data = await res.json();
    setActivity(data);
  };

  useEffect(() => {
    Promise.all([fetchStats(), fetchActivity()]).finally(() => setLoading(false));
  }, []);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const res = await fetch("/api/leads", {
      method: "POST",
      body: JSON.stringify({ name, email, phone, company }),
    });

    if (res.ok) {
      toast.success("Lead added successfully");
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      fetchStats();
      fetchActivity();
    } else {
      toast.error("Failed to add lead");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
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
    <div className="space-y-8 max-w-6xl mx-auto p-8">
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
            {activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((item: any) => (
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company</label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
