"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export default function TemplatePage() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then(res => res.json())
      .then(data => {
        setSubject(data.subject || "");
        setBody(data.body || "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/templates", {
      method: "PUT",
      body: JSON.stringify({ subject, body }),
    });
    if (res.ok) {
      toast.success("Template saved successfully");
    } else {
      toast.error("Failed to save template");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-muted-foreground w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email Template</h1>
        <p className="text-muted-foreground mt-1">Configure the message sent to your leads.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Editor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject Line</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hello {{name}}, I have an idea for {{company}}" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Body (HTML supported)</label>
                <textarea 
                  className="w-full min-h-[300px] bg-background border border-input rounded-md p-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{name}}, ..."
                />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center gap-2 text-primary">
                <Info className="w-4 h-4" />
                <CardTitle className="text-sm font-semibold">Variables</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground text-xs">Use these tags in your subject or body:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                  <code className="text-primary">{"{{name}}"}</code>
                  <span className="text-xs text-muted-foreground">Lead Name</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
                  <code className="text-primary">{"{{company}}"}</code>
                  <span className="text-xs text-muted-foreground">Company</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
