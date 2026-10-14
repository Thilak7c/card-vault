import { NextResponse } from "next/server";
import { listTags } from "@/lib/cards";

export async function GET() {
  return NextResponse.json({ tags: await listTags() });
}
