import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface PositionRow {
  id: number;
  flight_id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  recorded_at: Date;
  status: string;
  callsign: string;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET() {
  try {
    // Get latest positions for all active flights
    const positions: PositionRow[] = await prisma.$queryRawUnsafe(`
      SELECT fp.*, f.status, a.callsign
      FROM flight_positions fp
      INNER JOIN (
        SELECT flight_id, MAX(recorded_at) as max_time
        FROM flight_positions
        GROUP BY flight_id
      ) latest ON fp.flight_id = latest.flight_id AND fp.recorded_at = latest.max_time
      INNER JOIN flights f ON fp.flight_id = f.id
      INNER JOIN aircraft a ON f.aircraft_id = a.id
      WHERE f.status != 'landed' AND f.status != 'scheduled'
    `);

    const conflicts: Array<{
      flight1: { flightId: number; callsign: string; latitude: number; longitude: number; altitude: number };
      flight2: { flightId: number; callsign: string; latitude: number; longitude: number; altitude: number };
      horizontalDistanceKm: number;
      verticalDistanceFt: number;
    }> = [];

    // Pairwise comparison
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];

        const horizontalDist = haversineDistanceKm(
          a.latitude,
          a.longitude,
          b.latitude,
          b.longitude
        );

        const verticalDist = Math.abs(a.altitude - b.altitude);

        // 50km horizontal AND 1000ft vertical threshold
        if (horizontalDist <= 50 && verticalDist <= 1000) {
          conflicts.push({
            flight1: {
              flightId: Number(a.flight_id),
              callsign: a.callsign,
              latitude: a.latitude,
              longitude: a.longitude,
              altitude: a.altitude,
            },
            flight2: {
              flightId: Number(b.flight_id),
              callsign: b.callsign,
              latitude: b.latitude,
              longitude: b.longitude,
              altitude: b.altitude,
            },
            horizontalDistanceKm: Math.round(horizontalDist * 100) / 100,
            verticalDistanceFt: Math.round(verticalDist),
          });
        }
      }
    }

    return NextResponse.json(conflicts);
  } catch (error) {
    console.error("Error detecting conflicts:", error);
    return NextResponse.json(
      { error: "Failed to detect conflicts" },
      { status: 500 }
    );
  }
}
