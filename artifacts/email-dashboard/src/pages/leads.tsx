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
  useSendPendingEmails,
  useUpdateLead,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Search, Upload, Trash2, Send, RotateCw, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Lead {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  status: string;
  createdAt: string;
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Edit state
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const limit = 20;

  const { data, isLoading } = useGetLeads(
    { search: search || undefined, status: status as any, page, limit },
    { query: { queryKey: getGetLeadsQueryKey({ search: search || undefined, status: status as any, page, limit }) } }
  );

  const { data: stats } = useGetDashboardStats();

  const deleteLead = useDeleteLead();
  const sendEmail = useSendEmailToLead();
  const retryEmail = useRetryEmailForLead();
  const importLeads = useImportLeads();
  const sendPending = useSendPendingEmails();
  const updateLead = useUpdateLead();

  const pendingCount = stats?.emailsPending ?? 0;
  const failedCount = stats?.emailsFailed ?? 0;
  const bulkCount = pendingCount + failedCount;

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setEditName(lead.name);
    setEditEmail(lead.email);
    setEditCompany(lead.company ?? "");
    setEditPhone(lead.phone ?? "");
  };

  const handleEditSave = () => {
    if (!editLead || !editName.trim() || !editEmail.trim()) return;
    updateLead.mutate(
      {
        id: editLead.id,
        data: {
          name: editName.trim(),
          email: editEmail.trim(),
          company: editCompany.trim() || undefined,
          phone: editPhone.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Lead updated");
          setEditLead(null);
          invalidateLeads();
        },
        onError: () => toast.error("Failed to update lead"),
      }
    );
  };

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = event.target?.result;
          const workbook = XLSX.read(raw, { type: "binary" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const parsed = XLSX.utils.sheet_to_json(sheet) as any[];
          const mappedLeads = parsed
            .map((row) => ({
              name: row.name || row.Name || "",
              email: row.email || row.Email || "",
              phone: row.phone || row.Phone?.toString(),
              company: row.company || row.Company,
              source: row.source || row.Source || "import",
            }))
            .filter((l) => l.name && l.email);

          if (mappedLeads.length === 0) {
            toast.error("No valid leads found. Columns must be named 'name' and 'email'.");
            return;
          }
          importLeads.mutate(
            { data: { leads: mappedLeads } },
            {
              onSuccess: (res) => {
                toast.success(`Imported ${res.inserted} leads. Skipped ${res.skipped}.`);
                queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
              },
              onError: () => toast.error("Failed to import leads."),
            }
          );
        } catch {
          toast.error("Error parsing file.");
        }
      };
      reader.readAsBinaryString(file);
      e.target.value = "";
    },
    [importLeads, queryClient]
  );

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() =>
              bulkCount > 0
                ? setShowBulkConfirm(true)
                : toast.info("No pending or failed leads to send")
            }
            disabled={sendPending.isPending}
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
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
              data?.leads.map((lead) => (
                <TableRow key={lead.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium text-foreground">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lead.company || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.status === "sent"
                          ? "default"
                          : lead.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
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
                    {/* Edit */}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Edit lead"
                      onClick={() => openEdit(lead as Lead)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    {/* Send */}
                    {lead.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Send email"
                        onClick={() => {
                          sendEmail.mutate(
                            { leadId: lead.id },
                            {
                              onSuccess: () => {
                                toast.success("Email sent!");
                                invalidateLeads();
                              },
                              onError: () => toast.error("Failed to send"),
                            }
                          );
                        }}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Retry */}
                    {lead.status === "failed" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Retry email"
                        onClick={() => {
                          retryEmail.mutate(
                            { leadId: lead.id },
                            {
                              onSuccess: () => {
                                toast.success("Retried!");
                                invalidateLeads();
                              },
                              onError: () => toast.error("Retry failed"),
                            }
                          );
                        }}
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    )}

                    {/* Delete */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      title="Delete lead"
                      onClick={() => {
                        if (confirm("Delete this lead?")) {
                          deleteLead.mutate(
                            { id: lead.id },
                            {
                              onSuccess: () => {
                                toast.success("Deleted");
                                invalidateLeads();
                              },
                              onError: () => toast.error("Failed to delete"),
                            }
                          );
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
            <div>
              Showing page {page} of {data.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Lead Dialog */}
      <Dialog open={!!editLead} onOpenChange={(open) => !open && setEditLead(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="jane@example.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-company">Company</Label>
              <Input
                id="edit-company"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="Acme Corp"
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLead(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateLead.isPending || !editName.trim() || !editEmail.trim()}
            >
              {updateLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Confirmation */}
      <AlertDialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Send emails to {bulkCount} leads?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">This will send your current email template to:</span>
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
              {sendPending.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Mail className="w-4 h-4 mr-2" />
              Send {bulkCount} emails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
