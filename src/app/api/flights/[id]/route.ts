import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FlightStatus } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flightId = parseInt(id, 10);

    if (isNaN(flightId)) {
      return NextResponse.json(
        { error: "Invalid flight ID" },
        { status: 400 }
      );
    }

    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: {
        aircraft: true,
        originAirport: true,
        destinationAirport: true,
        positions: {
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    if (!flight) {
      return NextResponse.json(
        { error: "Flight not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(flight);
  } catch (error) {
    console.error("Error fetching flight:", error);
    return NextResponse.json(
      { error: "Failed to fetch flight" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flightId = parseInt(id, 10);
    if (isNaN(flightId)) {
      return NextResponse.json({ error: "Invalid flight ID" }, { status: 400 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.aircraftId) data.aircraftId = parseInt(body.aircraftId);
    if (body.originAirportId) data.originAirportId = parseInt(body.originAirportId);
    if (body.destinationAirportId) data.destinationAirportId = parseInt(body.destinationAirportId);
    if (body.status) data.status = body.status as FlightStatus;

    // Use a transaction when changing status to "landed" — also clear any active runway assignment
    if (body.status === "landed") {
      const result = await prisma.$transaction(async (tx) => {
        await tx.runwayAssignment.updateMany({
          where: { flightId, clearedAt: null },
          data: { clearedAt: new Date() },
        });
        return tx.flight.update({
          where: { id: flightId },
          data,
          include: { aircraft: true, originAirport: true, destinationAirport: true },
        });
      });
      return NextResponse.json(result);
    }

    const flight = await prisma.flight.update({
      where: { id: flightId },
      data,
      include: { aircraft: true, originAirport: true, destinationAirport: true },
    });
    return NextResponse.json(flight);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const flightId = parseInt(id, 10);
    if (isNaN(flightId)) {
      return NextResponse.json({ error: "Invalid flight ID" }, { status: 400 });
    }

    // Transaction: delete dependents first, then the flight
    await prisma.$transaction(async (tx) => {
      await tx.flightPosition.deleteMany({ where: { flightId } });
      await tx.runwayAssignment.deleteMany({ where: { flightId } });
      await tx.alert.deleteMany({ where: { flightId } });
      await tx.flight.delete({ where: { id: flightId } });
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
