import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadsTable } from "@/lib/db/schema";

export async function POST(request: Request) {
  const { leads } = await request.json();
  
  let inserted = 0;
  for (const lead of leads) {
    try {
      await db.insert(leadsTable).values({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: "Excel Import"
      });
      inserted++;
    } catch (err) {
      // Skip duplicates
    }
  }

  return NextResponse.json({ inserted });
}
