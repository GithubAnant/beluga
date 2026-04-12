import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

export async function GET() {
  try {
    const airportStats = await prisma.$queryRaw`
      SELECT
        ap.code,
        ap.name,
        COUNT(DISTINCT r.id) AS runway_count,
        SUM(CASE WHEN f.origin_airport_id = ap.id THEN 1 ELSE 0 END) AS departures,
        SUM(CASE WHEN f.destination_airport_id = ap.id THEN 1 ELSE 0 END) AS arrivals
      FROM airports ap
      LEFT JOIN runways r ON ap.id = r.airport_id
      LEFT JOIN flights f ON ap.id = f.origin_airport_id OR ap.id = f.destination_airport_id
      GROUP BY ap.id, ap.code, ap.name
      ORDER BY (departures + arrivals) DESC
    `;

    const runwayUtilization = await prisma.$queryRaw`
      SELECT
        r.name AS runway_name,
        ap.code AS airport_code,
        COUNT(ra.id) AS total_assignments,
        SUM(CASE WHEN ra.cleared_at IS NULL THEN 1 ELSE 0 END) AS active_now
      FROM runways r
      JOIN airports ap ON r.airport_id = ap.id
      LEFT JOIN runway_assignments ra ON r.id = ra.runway_id
      GROUP BY r.id, r.name, ap.code
      ORDER BY total_assignments DESC
    `;

    return NextResponse.json({
      airportStats: serializeBigInt(airportStats),
      runwayUtilization: serializeBigInt(runwayUtilization),
      queries: {
        airportStats: "SELECT ap.code, ap.name, COUNT(DISTINCT r.id) AS runway_count, SUM(CASE WHEN f.origin_airport_id = ap.id THEN 1 ELSE 0 END) AS departures, SUM(CASE WHEN f.destination_airport_id = ap.id THEN 1 ELSE 0 END) AS arrivals FROM airports ap LEFT JOIN runways r ON ap.id = r.airport_id LEFT JOIN flights f ON ap.id = f.origin_airport_id OR ap.id = f.destination_airport_id GROUP BY ap.id, ap.code, ap.name ORDER BY (departures + arrivals) DESC",
        runwayUtilization: "SELECT r.name AS runway_name, ap.code AS airport_code, COUNT(ra.id) AS total_assignments, SUM(CASE WHEN ra.cleared_at IS NULL THEN 1 ELSE 0 END) AS active_now FROM runways r JOIN airports ap ON r.airport_id = ap.id LEFT JOIN runway_assignments ra ON r.id = ra.runway_id GROUP BY r.id, r.name, ap.code ORDER BY total_assignments DESC",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
