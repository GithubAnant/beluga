import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const aircraft = await prisma.aircraft.findMany({
      include: { _count: { select: { flights: true } } },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(aircraft);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { callsign, type, airline } = await request.json();
    if (!callsign || !type || !airline) {
      return NextResponse.json({ error: "callsign, type, and airline are required" }, { status: 400 });
    }
    const aircraft = await prisma.aircraft.create({
      data: { callsign, type, airline },
    });
    return NextResponse.json(aircraft, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An aircraft with this callsign already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
