import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailTemplatesTable } from "@/lib/db/schema";

export async function GET() {
  const [template] = await db.select().from(emailTemplatesTable).limit(1);
  return NextResponse.json(template || { subject: "", body: "" });
}

export async function PUT(request: Request) {
  const { subject, body } = await request.json();

  const [existing] = await db.select().from(emailTemplatesTable).limit(1);

  if (existing) {
    const [updated] = await db.update(emailTemplatesTable)
      .set({ subject, body, updatedAt: new Date() })
      .where(eq(emailTemplatesTable.id, existing.id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [inserted] = await db.insert(emailTemplatesTable)
      .values({ subject, body })
      .returning();
    return NextResponse.json(inserted);
  }
}
