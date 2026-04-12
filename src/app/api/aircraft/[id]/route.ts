import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const aircraft = await prisma.aircraft.findUnique({
      where: { id: parseInt(id) },
      include: { flights: true },
    });
    if (!aircraft) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(aircraft);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const aircraft = await prisma.aircraft.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.callsign && { callsign: body.callsign }),
        ...(body.type && { type: body.type }),
        ...(body.airline && { airline: body.airline }),
      },
    });
    return NextResponse.json(aircraft);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An aircraft with this callsign already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.aircraft.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // Prisma P2003 = foreign key constraint violation
    if (message.includes("Foreign key constraint") || message.includes("P2003")) {
      return NextResponse.json(
        { error: "Cannot delete aircraft with existing flights. Delete the flights first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
