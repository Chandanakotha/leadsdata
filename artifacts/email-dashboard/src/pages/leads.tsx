import { useState, useCallback } from "react";
import { 
  useGetLeads, 
  useGetDashboardStats,
  getGetLeadsQueryKey, 
  getGetDashboardStatsQueryKey,
  getGetDashboardActivityQueryKey,
  useDeleteLead, 
  useSendEmailToLead, 
  useRetryEmailForLead, 
  useImportLeads, 
  useSendPendingEmails 
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Upload, Trash2, Send, RotateCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const limit = 20;

  const { data, isLoading } = useGetLeads({ 
    search: search || undefined, 
    status: status as any, 
    page, 
    limit 
  }, { 
    query: { queryKey: getGetLeadsQueryKey({ search: search || undefined, status: status as any, page, limit }) } 
  });

  const { data: stats } = useGetDashboardStats();

  const deleteLead = useDeleteLead();
  const sendEmail = useSendEmailToLead();
  const retryEmail = useRetryEmailForLead();
  const importLeads = useImportLeads();
  const sendPending = useSendPendingEmails();

  const pendingCount = stats?.emailsPending ?? 0;
  const failedCount = stats?.emailsFailed ?? 0;
  const bulkCount = pendingCount + failedCount;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsed = XLSX.utils.sheet_to_json(sheet) as any[];

        const mappedLeads = parsed.map(row => ({
          name: row.name || row.Name || "",
          email: row.email || row.Email || "",
          phone: row.phone || row.Phone?.toString(),
          company: row.company || row.Company,
          source: row.source || row.Source || "import"
        })).filter(l => l.name && l.email);

        if (mappedLeads.length === 0) {
          toast.error("No valid leads found. Make sure columns are named 'name' and 'email'.");
          return;
        }

        importLeads.mutate({ data: { leads: mappedLeads } }, {
          onSuccess: (res) => {
            toast.success(`Imported ${res.inserted} leads. Skipped ${res.skipped}.`);
            queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
          },
          onError: () => toast.error("Failed to import leads.")
        });
      } catch (err) {
        toast.error("Error parsing file.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  }, [importLeads, queryClient]);

  const handleBulkSend = () => {
    sendPending.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(`Done: ${res.sent} sent, ${res.failed} failed`);
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardActivityQueryKey() });
      },
      onError: () => toast.error("Bulk send failed"),
    });
    setShowBulkConfirm(false);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <div className="flex items-center gap-2">

          {/* Bulk Send */}
          <Button
            variant="default"
            onClick={() => bulkCount > 0 ? setShowBulkConfirm(true) : toast.info("No pending or failed leads to send")}
            disabled={sendPending.isPending}
            className="relative"
          >
            {sendPending.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Bulk Send
            {bulkCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold">
                {bulkCount}
              </span>
            )}
          </Button>

          {/* Import */}
          <div className="relative">
            <input
              type="file"
              accept=".csv,.xlsx"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileUpload}
            />
            <Button variant="secondary" disabled={importLeads.isPending}>
              {importLeads.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import CSV/Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              data?.leads.map(lead => (
                <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.company || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lead.status === "sent" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}
                      className={
                        lead.status === "sent"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : lead.status === "pending"
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : ""
                      }
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {lead.status === "pending" && (
                      <Button size="icon" variant="ghost" title="Send email" onClick={() => {
                        sendEmail.mutate({ leadId: lead.id }, {
                          onSuccess: () => { toast.success("Email sent!"); queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }); },
                          onError: () => toast.error("Failed to send"),
                        });
                      }}>
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    {lead.status === "failed" && (
                      <Button size="icon" variant="ghost" title="Retry email" onClick={() => {
                        retryEmail.mutate({ leadId: lead.id }, {
                          onSuccess: () => { toast.success("Retried!"); queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }); },
                          onError: () => toast.error("Retry failed"),
                        });
                      }}>
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete lead"
                      onClick={() => {
                        if (confirm("Delete this lead?")) {
                          deleteLead.mutate({ id: lead.id }, {
                            onSuccess: () => { toast.success("Deleted"); queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }); },
                            onError: () => toast.error("Failed to delete"),
                          });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
            <div>Showing page {page} of {data.totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Send Confirmation Dialog */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Send emails to {bulkCount} leads?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">
                This will send your current email template to:
              </span>
              {pendingCount > 0 && (
                <span className="block text-amber-400 font-medium">
                  {pendingCount} pending {pendingCount === 1 ? "lead" : "leads"}
                </span>
              )}
              {failedCount > 0 && (
                <span className="block text-destructive font-medium">
                  {failedCount} previously failed {failedCount === 1 ? "lead" : "leads"} (retry)
                </span>
              )}
              <span className="block pt-1 text-muted-foreground">
                Make sure your template is correct before sending.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkSend} disabled={sendPending.isPending}>
              {sendPending.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send {bulkCount} emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
