"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Upload, Trash2, Send, RotateCw, Mail } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const fetchLeads = async () => {
    const res = await fetch(`/api/leads?search=${search}&status=${status}`);
    const data = await res.json();
    setLeads(data.leads);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [search, status]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsed = XLSX.utils.sheet_to_json(sheet) as any[];

        const mappedLeads = parsed.map(row => ({
          name: row.name || row.Name || "",
          email: row.email || row.Email || "",
          phone: String(row.phone || row.Phone || row["Phone No"] || ""),
          company: row.company || row.Company || "",
          source: "Excel Import"
        })).filter(l => l.name && l.email);

        const res = await fetch("/api/leads/import", {
          method: "POST",
          body: JSON.stringify({ leads: mappedLeads }),
        });

        if (res.ok) {
          const result = await res.json();
          toast.success(`Imported ${result.inserted} leads.`);
          fetchLeads();
        }
      } catch (err) {
        toast.error("Error parsing file.");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this lead?")) return;
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lead deleted");
      fetchLeads();
    }
  };

  const handleSendEmail = async (id: number) => {
    toast.promise(
      fetch(`/api/emails/send?leadId=${id}`, { method: "POST" }),
      {
        loading: "Sending email...",
        success: "Email sent successfully!",
        error: "Failed to send email",
      }
    );
    setTimeout(fetchLeads, 2000);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <div className="relative">
          <input
            type="file"
            accept=".csv,.xlsx"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
          />
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV/Excel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input 
            placeholder="Search leads..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                  </TableCell>
                  <TableCell>{lead.phone || "-"}</TableCell>
                  <TableCell>{lead.company || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={lead.status === "sent" ? "default" : lead.status === "failed" ? "destructive" : "secondary"}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleSendEmail(lead.id)}>
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(lead.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
