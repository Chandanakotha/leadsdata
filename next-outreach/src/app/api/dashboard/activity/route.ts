import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailLogsTable } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const logs = await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.sentAt)).limit(10);
  
  const activity = logs.map(log => ({
    id: log.id,
    message: `Email ${log.status} to ${log.leadName}`,
    timestamp: log.sentAt,
  }));

  return NextResponse.json(activity);
}
