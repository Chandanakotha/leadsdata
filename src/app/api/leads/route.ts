import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsTable } from "@/lib/db/schema";
import { eq, desc, or, ilike } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const status = searchParams.get("status");

  let query = db.select().from(leadsTable);

  const filters = [];
  if (search) {
    filters.push(or(ilike(leadsTable.name, `%${search}%`), ilike(leadsTable.email, `%${search}%`)));
  }
  if (status && status !== "all") {
    filters.push(eq(leadsTable.status, status));
  }

  // @ts-ignore
  const result = await query.where(filters.length > 0 ? filters[0] : undefined).orderBy(desc(leadsTable.createdAt));

  return NextResponse.json({ leads: result });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, company, source } = body;

  try {
    const [newLead] = await db.insert(leadsTable).values({
      name,
      email,
      phone,
      company,
      source: source || "manual",
    }).returning();

    return NextResponse.json(newLead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Email already exists or invalid data" }, { status: 400 });
  }
}
