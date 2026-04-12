import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const airport = await prisma.airport.update({
      where: { id: parseInt(id) },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.code && { code: body.code }),
        ...(body.latitude != null && { latitude: parseFloat(body.latitude) }),
        ...(body.longitude != null && { longitude: parseFloat(body.longitude) }),
      },
    });
    return NextResponse.json(airport);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "An airport with this code already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const airportId = parseInt(id);

    // Check for flights referencing this airport
    const flightCount = await prisma.flight.count({
      where: {
        OR: [
          { originAirportId: airportId },
          { destinationAirportId: airportId },
        ],
      },
    });
    if (flightCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete airport with ${flightCount} existing flight(s). Delete the flights first.` },
        { status: 409 }
      );
    }

    // Transaction: delete runways (and their assignments), then the airport
    await prisma.$transaction(async (tx) => {
      const runways = await tx.runway.findMany({ where: { airportId }, select: { id: true } });
      const runwayIds = runways.map((r) => r.id);
      if (runwayIds.length > 0) {
        await tx.runwayAssignment.deleteMany({ where: { runwayId: { in: runwayIds } } });
        await tx.runway.deleteMany({ where: { airportId } });
      }
      await tx.airport.delete({ where: { id: airportId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
