import { useState } from "react";
import { useGetEmailLogs, getGetEmailLogsQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useGetEmailLogs({ page, limit }, {
    query: { queryKey: getGetEmailLogsQueryKey({ page, limit }) }
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
      </div>

      <Card className="bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Recipient</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No logs found.
                </TableCell>
              </TableRow>
            ) : (
              data?.logs.map(log => (
                <TableRow key={log.id} className="border-border hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium text-foreground">{log.leadName}</div>
                    <div className="text-xs text-muted-foreground">{log.leadEmail}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.company || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{log.subject}</TableCell>
                  <TableCell>
                    {log.status === 'sent' ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Sent</Badge>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="destructive">Failed</Badge>
                        {log.errorMessage && <span className="text-[10px] text-destructive truncate max-w-[150px]">{log.errorMessage}</span>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {format(new Date(log.sentAt), "MMM d, HH:mm")}
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
    </div>
  );
}