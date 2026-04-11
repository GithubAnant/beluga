import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const { flightId } = body;

    if (!flightId || typeof flightId !== "number") {
      return NextResponse.json(
        { error: "flightId (number) is required" },
        { status: 400 }
      );
    }

    // Check runway exists
    const runway = await prisma.runway.findUnique({
      where: { id: runwayId },
    });

    if (!runway) {
      return NextResponse.json(
        { error: "Runway not found" },
        { status: 404 }
      );
    }

    // Check runway not already occupied
    const activeAssignment = await prisma.runwayAssignment.findFirst({
      where: { runwayId, clearedAt: null },
    });

    if (activeAssignment) {
      return NextResponse.json(
        { error: "Runway is already occupied" },
        { status: 409 }
      );
    }

    // Check flight exists and is enroute or landing
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      return NextResponse.json(
        { error: "Flight not found" },
        { status: 404 }
      );
    }

    if (flight.status !== "enroute" && flight.status !== "landing") {
      return NextResponse.json(
        {
          error: `Flight must be enroute or landing to assign a runway. Current status: ${flight.status}`,
        },
        { status: 400 }
      );
    }

    // Create assignment and update flight status in a transaction
    const [assignment] = await prisma.$transaction([
      prisma.runwayAssignment.create({
        data: {
          runwayId,
          flightId,
        },
      }),
      prisma.flight.update({
        where: { id: flightId },
        data: { status: "landing" },
      }),
    ]);

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("Error assigning runway:", error);
    return NextResponse.json(
      { error: "Failed to assign runway" },
      { status: 500 }
    );
  }
}
