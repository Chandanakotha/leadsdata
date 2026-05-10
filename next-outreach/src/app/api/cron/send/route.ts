import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsTable, emailTemplatesTable, emailLogsTable } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, renderTemplate } from "@/lib/email";

export async function GET(request: Request) {
  // Verify CRON_SECRET if you want to keep it private
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [template] = await db.select().from(emailTemplatesTable).limit(1);
  if (!template) return NextResponse.json({ error: "No template" });

  const pendingLeads = await db.select().from(leadsTable).where(eq(leadsTable.status, "pending")).limit(10);

  let sent = 0;
  let failed = 0;

  for (const lead of pendingLeads) {
    const html = renderTemplate(template.body, {
      name: lead.name,
      company: lead.company,
    });

    const result = await sendEmail({
      to: lead.email,
      subject: template.subject,
      html,
    });

    if (result.success) {
      await db.update(leadsTable).set({ status: "sent", emailSentAt: new Date() }).where(eq(leadsTable.id, lead.id));
      await db.insert(emailLogsTable).values({
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
        company: lead.company,
        subject: template.subject,
        status: "sent",
      });
      sent++;
    } else {
      await db.update(leadsTable).set({ status: "failed", errorMessage: result.error }).where(eq(leadsTable.id, lead.id));
      await db.insert(emailLogsTable).values({
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
        company: lead.company,
        subject: template.subject,
        status: "failed",
        errorMessage: result.error,
      });
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
