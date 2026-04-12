import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const runway = await prisma.runway.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.lengthM != null && { lengthM: parseInt(body.lengthM) }),
        ...(body.heading != null && { heading: parseInt(body.heading) }),
      },
    });
    return NextResponse.json(runway);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const runwayId = parseInt(id);

    // Check for active assignments
    const active = await prisma.runwayAssignment.findFirst({
      where: { runwayId, clearedAt: null },
    });
    if (active) {
      return NextResponse.json(
        { error: "Cannot delete runway with an active assignment. Clear the runway first." },
        { status: 409 }
      );
    }

    // Delete all assignments then the runway in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.runwayAssignment.deleteMany({ where: { runwayId } });
      await tx.runway.delete({ where: { id: runwayId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
