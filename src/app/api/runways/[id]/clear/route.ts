import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runwayId = parseInt(id, 10);

    if (isNaN(runwayId)) {
      return NextResponse.json(
        { error: "Invalid runway ID" },
        { status: 400 }
      );
    }

    // Find active assignment
    const activeAssignment = await prisma.runwayAssignment.findFirst({
      where: { runwayId, clearedAt: null },
    });

    if (!activeAssignment) {
      return NextResponse.json(
        { error: "No active assignment on this runway" },
        { status: 404 }
      );
    }

    // Clear assignment and update flight status
    const [updatedAssignment] = await prisma.$transaction([
      prisma.runwayAssignment.update({
        where: { id: activeAssignment.id },
        data: { clearedAt: new Date() },
      }),
      prisma.flight.update({
        where: { id: activeAssignment.flightId },
        data: { status: "landed" },
      }),
    ]);

    return NextResponse.json(updatedAssignment);
  } catch (error) {
    console.error("Error clearing runway:", error);
    return NextResponse.json(
      { error: "Failed to clear runway" },
      { status: 500 }
    );
  }
}
