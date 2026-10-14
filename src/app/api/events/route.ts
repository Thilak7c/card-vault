import { NextResponse } from "next/server";
import { listEvents } from "@/lib/cards";

export async function GET() {
  return NextResponse.json({ events: await listEvents() });
}
