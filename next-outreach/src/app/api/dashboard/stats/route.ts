import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsTable, emailLogsTable } from "@/lib/db/schema";
import { eq, sql, gte } from "drizzle-orm";

export async function GET() {
  const [totalLeadsResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable);
  const [sentResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.status, "sent"));
  const [pendingResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.status, "pending"));
  const [failedResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.status, "failed"));

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentlySentResult] = await db.select({ count: sql<number>`count(*)` }).from(emailLogsTable).where(gte(emailLogsTable.sentAt, last24h));

  const total = Number(totalLeadsResult.count);
  const sent = Number(sentResult.count);
  const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

  return NextResponse.json({
    totalLeads: total,
    emailsSent: sent,
    emailsPending: Number(pendingResult.count),
    emailsFailed: Number(failedResult.count),
    successRate,
    recentlySent: Number(recentlySentResult.count),
  });
}
