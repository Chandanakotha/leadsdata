import { Router, type IRouter } from "express";
import { ilike, or, eq, count, sql } from "drizzle-orm";
import { db, leadsTable, activityLogTable } from "@workspace/db";
import {
  GetLeadsQueryParams,
  CreateLeadBody,
  ImportLeadsBody,
  UpdateLeadParams,
  UpdateLeadBody,
  DeleteLeadParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/leads", async (req, res): Promise<void> => {
  const parsed = GetLeadsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, status, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(leadsTable.name, `%${search}%`),
        ilike(leadsTable.email, `%${search}%`),
        ilike(leadsTable.company, `%${search}%`),
      ),
    );
  }

  if (status && status !== "all") {
    conditions.push(eq(leadsTable.status, status as "pending" | "sent" | "failed"));
  }

  const whereClause = conditions.length > 0
    ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
    : undefined;

  const [leads, totalResult] = await Promise.all([
    db.select().from(leadsTable)
      .where(whereClause)
      .orderBy(sql`${leadsTable.createdAt} DESC`)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(leadsTable).where(whereClause),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    leads: leads.map((l) => ({
      ...l,
      emailSentAt: l.emailSentAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [lead] = await db
    .insert(leadsTable)
    .values(parsed.data)
    .returning();

  // Log activity
  await db.insert(activityLogTable).values({
    type: "lead_added",
    message: `New lead added: ${lead.name}`,
    leadId: lead.id,
    leadName: lead.name,
    leadEmail: lead.email,
  });

  res.status(201).json({
    ...lead,
    emailSentAt: lead.emailSentAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  });
});

router.post("/leads/import", async (req, res): Promise<void> => {
  const parsed = ImportLeadsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { leads } = parsed.data;
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;

  for (const lead of leads) {
    try {
      await db
        .insert(leadsTable)
        .values({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source,
        })
        .onConflictDoNothing();
      inserted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${lead.email}: ${message}`);
      skipped++;
    }
  }

  // Log activity
  if (inserted > 0) {
    await db.insert(activityLogTable).values({
      type: "lead_imported",
      message: `Bulk import: ${inserted} leads added, ${skipped} skipped`,
      leadName: null,
      leadEmail: null,
    });
  }

  res.json({ inserted, skipped, errors });
});

router.patch("/leads/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateLeadParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateLeadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [lead] = await db
    .update(leadsTable)
    .set(body.data)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json({
    ...lead,
    emailSentAt: lead.emailSentAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  });
});

router.delete("/leads/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteLeadParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [lead] = await db
    .delete(leadsTable)
    .where(eq(leadsTable.id, params.data.id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
