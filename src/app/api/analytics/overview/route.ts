import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

export async function GET() {
  try {
    const totals = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*) FROM flights) AS total_flights,
        (SELECT COUNT(*) FROM aircraft) AS total_aircraft,
        (SELECT COUNT(*) FROM airports) AS total_airports,
        (SELECT COUNT(*) FROM runways) AS total_runways,
        (SELECT COUNT(*) FROM flight_positions) AS total_positions,
        (SELECT COUNT(*) FROM alerts) AS total_alerts
    `;

    const flightsByStatus = await prisma.$queryRaw`
      SELECT status, COUNT(*) AS count
      FROM flights
      GROUP BY status
      ORDER BY count DESC
    `;

    const avgPositionsPerFlight = await prisma.$queryRaw`
      SELECT ROUND(AVG(pos_count), 1) AS avg_positions
      FROM (
        SELECT flight_id, COUNT(*) AS pos_count
        FROM flight_positions
        GROUP BY flight_id
      ) AS sub
    `;

    return NextResponse.json({
      totals: serializeBigInt(totals),
      flightsByStatus: serializeBigInt(flightsByStatus),
      avgPositionsPerFlight: serializeBigInt(avgPositionsPerFlight),
      queries: {
        totals: "SELECT (SELECT COUNT(*) FROM flights) AS total_flights, (SELECT COUNT(*) FROM aircraft) AS total_aircraft, (SELECT COUNT(*) FROM airports) AS total_airports, (SELECT COUNT(*) FROM runways) AS total_runways, (SELECT COUNT(*) FROM flight_positions) AS total_positions, (SELECT COUNT(*) FROM alerts) AS total_alerts",
        flightsByStatus: "SELECT status, COUNT(*) AS count FROM flights GROUP BY status ORDER BY count DESC",
        avgPositionsPerFlight: "SELECT ROUND(AVG(pos_count), 1) AS avg_positions FROM (SELECT flight_id, COUNT(*) AS pos_count FROM flight_positions GROUP BY flight_id) AS sub",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
