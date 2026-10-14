import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/guard";
import { findDuplicates } from "@/lib/cards";

const Body = z.object({
  fullName: z.string().optional(),
  company: z.string().optional(),
  phones: z.array(z.string()).optional(),
  emails: z.array(z.string()).optional(),
  excludeId: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  return NextResponse.json({ matches: await findDuplicates(parsed.data, parsed.data.excludeId) });
}
