import { useState, useEffect } from "react";
import { useGetTemplate, getGetTemplateQueryKey, useSaveTemplate } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function TemplatePage() {
  const queryClient = useQueryClient();
  const { data: template, isLoading } = useGetTemplate();
  const saveTemplate = useSaveTemplate();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  }, [template]);

  const handleSave = () => {
    saveTemplate.mutate({ data: { subject, body } }, {
      onSuccess: () => {
        toast.success("Template saved successfully.");
        queryClient.invalidateQueries({ queryKey: getGetTemplateQueryKey() });
      },
      onError: () => toast.error("Failed to save template.")
    });
  };

  const previewBody = body
    .replace(/{{name}}/g, "John Doe")
    .replace(/{{company}}/g, "Acme Corp");
    
  const previewSubject = subject
    .replace(/{{name}}/g, "John Doe")
    .replace(/{{company}}/g, "Acme Corp");

  if (isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Email Template</h1>
        <Button onClick={handleSave} disabled={saveTemplate.isPending}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Editor</CardTitle>
              <CardDescription>Variables: {'{{name}}, {{company}}'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Subject</label>
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  className="font-mono text-sm bg-background" 
                  placeholder="Hello {{name}}!"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Body</label>
                <Textarea 
                  value={body} 
                  onChange={(e) => setBody(e.target.value)} 
                  className="font-mono text-sm min-h-[400px] bg-background resize-none" 
                  placeholder="Hi {{name}}, I noticed {{company}} is..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-muted/30 border-dashed">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>How it looks to the recipient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-background border border-border rounded-md overflow-hidden">
                <div className="border-b border-border p-4 bg-muted/20">
                  <div className="text-sm text-muted-foreground mb-1">Subject:</div>
                  <div className="font-medium text-foreground">{previewSubject || "No subject"}</div>
                </div>
                <div className="p-6 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {previewBody || "No content"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}