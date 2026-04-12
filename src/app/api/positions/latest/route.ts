import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const positions = await prisma.$queryRawUnsafe(`
      SELECT fp.*, f.status, a.callsign
      FROM flight_positions fp
      INNER JOIN (
        SELECT flight_id, MAX(recorded_at) as max_time
        FROM flight_positions
        GROUP BY flight_id
      ) latest ON fp.flight_id = latest.flight_id AND fp.recorded_at = latest.max_time
      INNER JOIN flights f ON fp.flight_id = f.id
      INNER JOIN aircraft a ON f.aircraft_id = a.id
      WHERE f.status NOT IN ('cancelled')
    `);

    // Serialize BigInt values for JSON response
    const serialized = JSON.parse(
      JSON.stringify(positions, (_key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching latest positions:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest positions" },
      { status: 500 }
    );
  }
}
