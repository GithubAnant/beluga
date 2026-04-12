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
    const flightStatus = (status as FlightStatus) || "scheduled";

    const flight = await prisma.$transaction(async (tx) => {
      const f = await tx.flight.create({
        data: {
          aircraftId: parseInt(aircraftId),
          originAirportId: parseInt(originAirportId),
          destinationAirportId: parseInt(destinationAirportId),
          status: flightStatus,
        },
        include: { aircraft: true, originAirport: true, destinationAirport: true },
      });

      // If the flight is active, create an initial position at the origin airport
      if (flightStatus === "enroute" || flightStatus === "landing") {
        const dest = await tx.airport.findUnique({ where: { id: parseInt(destinationAirportId) } });
        const dLon = ((dest!.longitude - f.originAirport.longitude) * Math.PI) / 180;
        const y = Math.sin(dLon) * Math.cos((dest!.latitude * Math.PI) / 180);
        const x =
          Math.cos((f.originAirport.latitude * Math.PI) / 180) * Math.sin((dest!.latitude * Math.PI) / 180) -
          Math.sin((f.originAirport.latitude * Math.PI) / 180) * Math.cos((dest!.latitude * Math.PI) / 180) * Math.cos(dLon);
        const heading = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

        await tx.flightPosition.create({
          data: {
            flightId: f.id,
            latitude: f.originAirport.latitude,
            longitude: f.originAirport.longitude,
            altitude: 35000,
            heading,
            speed: 450,
          },
        });
      }

      return f;
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
