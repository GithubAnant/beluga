import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
