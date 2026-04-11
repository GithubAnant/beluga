import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
