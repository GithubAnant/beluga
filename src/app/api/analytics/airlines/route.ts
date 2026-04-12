import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

export async function GET() {
  try {
    const airlines = await prisma.$queryRaw`
      SELECT
        a.airline,
        COUNT(DISTINCT a.id) AS aircraft_count,
        COUNT(f.id) AS flight_count
      FROM aircraft a
      LEFT JOIN flights f ON a.id = f.aircraft_id
      GROUP BY a.airline
      ORDER BY flight_count DESC
    `;

    const aircraftDetail = await prisma.$queryRaw`
      SELECT
        a.callsign,
        a.type,
        a.airline,
        COUNT(f.id) AS flight_count,
        MAX(f.created_at) AS last_flight
      FROM aircraft a
      LEFT JOIN flights f ON a.id = f.aircraft_id
      GROUP BY a.id, a.callsign, a.type, a.airline
      ORDER BY flight_count DESC
    `;

    return NextResponse.json({
      airlines: serializeBigInt(airlines),
      aircraftDetail: serializeBigInt(aircraftDetail),
      queries: {
        airlines: "SELECT a.airline, COUNT(DISTINCT a.id) AS aircraft_count, COUNT(f.id) AS flight_count FROM aircraft a LEFT JOIN flights f ON a.id = f.aircraft_id GROUP BY a.airline ORDER BY flight_count DESC",
        aircraftDetail: "SELECT a.callsign, a.type, a.airline, COUNT(f.id) AS flight_count, MAX(f.created_at) AS last_flight FROM aircraft a LEFT JOIN flights f ON a.id = f.aircraft_id GROUP BY a.id, a.callsign, a.type, a.airline ORDER BY flight_count DESC",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
