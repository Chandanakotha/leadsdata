import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, emailTemplatesTable } from "@workspace/db";
import { SaveTemplateBody } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_SUBJECT = "Exciting Opportunity at {{company}}";
const DEFAULT_BODY = `Hello {{name}},

I came across {{company}} and was really impressed by what you're building.

I'd love to connect and explore if there's a mutual fit. Would you be open to a quick 15-minute call this week?

Best regards,
[Your Name]`;

async function ensureTemplate() {
  const existing = await db.select().from(emailTemplatesTable).limit(1);
  if (existing.length === 0) {
    const [created] = await db
      .insert(emailTemplatesTable)
      .values({ subject: DEFAULT_SUBJECT, body: DEFAULT_BODY })
      .returning();
    return created;
  }
  return existing[0];
}

router.get("/templates", async (_req, res): Promise<void> => {
  const template = await ensureTemplate();
  res.json({
    ...template,
    updatedAt: template.updatedAt.toISOString(),
  });
});

router.put("/templates", async (req, res): Promise<void> => {
  const parsed = SaveTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await ensureTemplate();

  const [updated] = await db
    .update(emailTemplatesTable)
    .set({ subject: parsed.data.subject, body: parsed.data.body })
    .where(eq(emailTemplatesTable.id, existing.id))
    .returning();

  const template = updated ?? existing;

  res.json({
    ...template,
    updatedAt: template.updatedAt.toISOString(),
  });
});

export default router;
