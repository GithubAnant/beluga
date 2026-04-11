import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
