import cron from "node-cron";
import { eq, or } from "drizzle-orm";
import { db, leadsTable, emailTemplatesTable, activityLogTable, emailLogsTable } from "@workspace/db";
import { renderTemplate, sendEmail } from "./email";
import { logger } from "./logger";

const INTERVAL_HOURS = 1;
const CRON_EXPRESSION = `0 */${INTERVAL_HOURS} * * *`; // every hour

interface SchedulerState {
  isRunning: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  lastResult: string | null;
  task: cron.ScheduledTask | null;
}

const state: SchedulerState = {
  isRunning: false,
  lastRun: null,
  nextRun: null,
  lastResult: null,
  task: null,
};

function computeNextRun(): Date {
  const now = new Date();
  const next = new Date(now);
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  // Round up to the next hour boundary
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export async function runEmailJob(): Promise<{ sent: number; failed: number; message: string }> {
  logger.info("Cron: starting auto-send job");
  state.lastRun = new Date();
  state.nextRun = computeNextRun();

  const [template] = await db.select().from(emailTemplatesTable).limit(1);
  if (!template) {
    const msg = "No email template configured — skipping auto-send";
    logger.warn(msg);
    state.lastResult = msg;
    return { sent: 0, failed: 0, message: msg };
  }

  const pendingLeads = await db
    .select()
    .from(leadsTable)
    .where(or(eq(leadsTable.status, "pending"), eq(leadsTable.status, "failed")));

  if (pendingLeads.length === 0) {
    const msg = "No pending or failed leads — nothing to send";
    logger.info(msg);
    state.lastResult = msg;
    return { sent: 0, failed: 0, message: msg };
  }

  let sent = 0;
  let failed = 0;

  for (const lead of pendingLeads) {
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
        .where(eq(leadsTable.id, lead.id)),

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
          ? `[Auto] Email sent to ${lead.name} (${lead.email})`
          : `[Auto] Email failed for ${lead.name}: ${result.error}`,
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
      }),
    ]);

    if (result.success) sent++;
    else failed++;
  }

  const msg = `Auto-sent: ${sent} succeeded, ${failed} failed`;
  logger.info({ sent, failed }, "Cron: auto-send job complete");
  state.lastResult = msg;
  return { sent, failed, message: msg };
}

export function startScheduler(): void {
  if (state.task) return; // already running

  state.isRunning = true;
  state.nextRun = computeNextRun();

  state.task = cron.schedule(CRON_EXPRESSION, async () => {
    try {
      await runEmailJob();
    } catch (err) {
      logger.error({ err }, "Cron: unhandled error in email job");
      state.lastResult = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  });

  logger.info({ expression: CRON_EXPRESSION, nextRun: state.nextRun }, "Email scheduler started");
}

export function getSchedulerStatus() {
  return {
    isRunning: state.isRunning,
    intervalHours: INTERVAL_HOURS,
    lastRun: state.lastRun?.toISOString() ?? null,
    nextRun: state.nextRun?.toISOString() ?? null,
    lastResult: state.lastResult,
  };
}
