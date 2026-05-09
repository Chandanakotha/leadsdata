import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, leadsTable, emailTemplatesTable, activityLogTable, emailLogsTable } from "@workspace/db";
import { SendEmailToLeadParams, RetryEmailForLeadParams, GetEmailLogsQueryParams } from "@workspace/api-zod";
import { renderTemplate, sendEmail } from "../lib/email";
import { runEmailJob } from "../lib/scheduler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULT_SUBJECT = "Exciting Opportunity at {{company}}";
const DEFAULT_BODY = `Hello {{name}},

I came across {{company}} and was really impressed by what you're building.

Would you be open to a quick chat?

Best regards`;

async function getTemplate() {
  const [template] = await db.select().from(emailTemplatesTable).limit(1);
  return template ?? { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY };
}

async function sendToLead(leadId: number): Promise<{ success: boolean; error?: string }> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) return { success: false, error: "Lead not found" };

  const template = await getTemplate();

  const variables: Record<string, string | null | undefined> = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    source: lead.source,
  };

  const subject = renderTemplate(template.subject, variables);
  const body = renderTemplate(template.body, variables);
  const htmlBody = body.replace(/\n/g, "<br/>");

  const result = await sendEmail({ to: lead.email, subject, html: htmlBody });

  const status = result.success ? "sent" : "failed";
  const now = new Date();

  await Promise.all([
    db.update(leadsTable)
      .set({
        status,
        emailSentAt: result.success ? now : lead.emailSentAt,
        errorMessage: result.success ? null : result.error,
      })
      .where(eq(leadsTable.id, leadId)),

    db.insert(emailLogsTable).values({
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
      company: lead.company,
      subject,
      status,
      errorMessage: result.success ? null : result.error,
    }),

    db.insert(activityLogTable).values({
      type: result.success ? "email_sent" : "email_failed",
      message: result.success
        ? `Email sent to ${lead.name} (${lead.email})`
        : `Email failed for ${lead.name}: ${result.error}`,
      leadId: lead.id,
      leadName: lead.name,
      leadEmail: lead.email,
    }),
  ]);

  return result;
}

router.post("/emails/send", async (_req, res): Promise<void> => {
  const result = await runEmailJob();
  logger.info({ sent: result.sent, failed: result.failed }, "Bulk email send completed");
  res.json(result);
});

router.post("/emails/send/:leadId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  const params = SendEmailToLeadParams.safeParse({ leadId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.leadId));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const result = await sendToLead(params.data.leadId);

  res.json({
    sent: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    message: result.success ? "Email sent successfully" : `Failed: ${result.error}`,
  });
});

router.post("/emails/retry", async (_req, res): Promise<void> => {
  const failedLeads = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.status, "failed"));

  if (failedLeads.length === 0) {
    res.json({ sent: 0, failed: 0, message: "No failed leads to retry" });
    return;
  }

  let sent = 0;
  let failed = 0;

  // Reset to pending first
  await db
    .update(leadsTable)
    .set({ status: "pending" })
    .where(eq(leadsTable.status, "failed"));

  for (const lead of failedLeads) {
    const result = await sendToLead(lead.id);
    if (result.success) sent++;
    else failed++;
  }

  logger.info({ sent, failed }, "Retry failed emails completed");
  res.json({ sent, failed, message: `Retried: ${sent} succeeded, ${failed} still failed` });
});

router.post("/emails/retry/:leadId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.leadId) ? req.params.leadId[0] : req.params.leadId;
  const params = RetryEmailForLeadParams.safeParse({ leadId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.data.leadId));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  // Reset to pending then send
  await db.update(leadsTable).set({ status: "pending" }).where(eq(leadsTable.id, params.data.leadId));

  const result = await sendToLead(params.data.leadId);

  res.json({
    sent: result.success ? 1 : 0,
    failed: result.success ? 0 : 1,
    message: result.success ? "Retry successful" : `Retry failed: ${result.error}`,
  });
});

router.get("/emails/logs", async (req, res): Promise<void> => {
  const parsed = GetEmailLogsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page, limit, leadId } = parsed.data;
  const offset = (page - 1) * limit;

  const where = leadId ? eq(emailLogsTable.leadId, leadId) : undefined;

  const [logs, totalResult] = await Promise.all([
    db.select().from(emailLogsTable)
      .where(where)
      .orderBy(sql`${emailLogsTable.sentAt} DESC`)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(emailLogsTable).where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    logs: logs.map((l) => ({
      ...l,
      sentAt: l.sentAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default router;
