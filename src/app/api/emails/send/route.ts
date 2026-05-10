import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsTable, emailTemplatesTable, emailLogsTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, renderTemplate } from "@/lib/email";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, parseInt(leadId)));
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const [template] = await db.select().from(emailTemplatesTable).limit(1);
  if (!template) {
    return NextResponse.json({ error: "No email template found" }, { status: 400 });
  }

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
    return NextResponse.json({ success: true, message: "Email sent" });
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
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
