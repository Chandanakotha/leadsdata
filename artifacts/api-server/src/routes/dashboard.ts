import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, leadsTable, activityLogTable } from "@workspace/db";
import { GetDashboardActivityQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [totals, recentlySent] = await Promise.all([
    db
      .select({
        status: leadsTable.status,
        count: count(),
      })
      .from(leadsTable)
      .groupBy(leadsTable.status),
    db
      .select({ count: count() })
      .from(leadsTable)
      .where(
        sql`${leadsTable.emailSentAt} > NOW() - INTERVAL '24 hours'`,
      ),
  ]);

  let totalLeads = 0;
  let emailsSent = 0;
  let emailsPending = 0;
  let emailsFailed = 0;

  for (const row of totals) {
    const n = Number(row.count);
    totalLeads += n;
    if (row.status === "sent") emailsSent += n;
    if (row.status === "pending") emailsPending += n;
    if (row.status === "failed") emailsFailed += n;
  }

  const denominator = emailsSent + emailsFailed;
  const successRate = denominator > 0 ? Math.round((emailsSent / denominator) * 100) : 0;

  res.json({
    totalLeads,
    emailsSent,
    emailsPending,
    emailsFailed,
    successRate,
    recentlySent: Number(recentlySent[0]?.count ?? 0),
  });
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const parsed = GetDashboardActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { limit } = parsed.data;

  const activities = await db
    .select()
    .from(activityLogTable)
    .orderBy(sql`${activityLogTable.createdAt} DESC`)
    .limit(limit);

  res.json(
    activities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      leadName: a.leadName,
      leadEmail: a.leadEmail,
      timestamp: a.createdAt.toISOString(),
    })),
  );
});

export default router;
