import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { airportId, name, lengthM, heading } = await request.json();
    if (!airportId || !name || !lengthM || heading == null) {
      return NextResponse.json(
        { error: "airportId, name, lengthM, and heading are required" },
        { status: 400 }
      );
    }
    const runway = await prisma.runway.create({
      data: {
        airportId: parseInt(airportId),
        name,
        lengthM: parseInt(lengthM),
        heading: parseInt(heading),
      },
    });
    return NextResponse.json(runway, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const runways = await prisma.runway.findMany({
      include: {
        airport: true,
        assignments: {
          where: { clearedAt: null },
          include: {
            flight: {
              include: {
                aircraft: true,
              },
            },
          },
        },
      },
    });

    // Flatten: each runway gets a single `activeAssignment` instead of an array
    const result = runways.map((runway) => ({
      ...runway,
      activeAssignment: runway.assignments[0] ?? null,
      assignments: undefined,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching runways:", error);
    return NextResponse.json(
      { error: "Failed to fetch runways" },
      { status: 500 }
    );
  }
}
