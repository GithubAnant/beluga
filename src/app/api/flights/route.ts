import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FlightStatus } from "@/generated/prisma";

export async function POST(request: Request) {
  try {
    const { aircraftId, originAirportId, destinationAirportId, status } = await request.json();
    if (!aircraftId || !originAirportId || !destinationAirportId) {
      return NextResponse.json(
        { error: "aircraftId, originAirportId, and destinationAirportId are required" },
        { status: 400 }
      );
    }
    const flight = await prisma.flight.create({
      data: {
        aircraftId: parseInt(aircraftId),
        originAirportId: parseInt(originAirportId),
        destinationAirportId: parseInt(destinationAirportId),
        status: (status as FlightStatus) || "scheduled",
      },
      include: { aircraft: true, originAirport: true, destinationAirport: true },
    });
    return NextResponse.json(flight, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const flights = await prisma.flight.findMany({
      include: {
        aircraft: true,
        originAirport: true,
        destinationAirport: true,
      },
    });

    // Get latest position per flight using a subquery approach
    const flightsWithPositions = await Promise.all(
      flights.map(async (flight) => {
        const latestPosition = await prisma.flightPosition.findFirst({
          where: { flightId: flight.id },
          orderBy: { recordedAt: "desc" },
        });
        return { ...flight, latestPosition };
      })
    );

    return NextResponse.json(flightsWithPositions);
  } catch (error) {
    console.error("Error fetching flights:", error);
    return NextResponse.json(
      { error: "Failed to fetch flights" },
      { status: 500 }
    );
  }
}
