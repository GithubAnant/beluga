import { prisma } from "@/lib/db";

let simulationInterval: ReturnType<typeof setInterval> | null = null;
let running = false;

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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

function computeHeading(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  let heading = (Math.atan2(y, x) * 180) / Math.PI;
  return (heading + 360) % 360;
}

async function simulationTick() {
  try {
    // Fetch enroute and landing flights with latest position and destination
    const flights = await prisma.flight.findMany({
      where: { status: { in: ["enroute", "landing"] } },
      include: {
        destinationAirport: true,
        aircraft: true,
      },
    });

    for (const flight of flights) {
      const latestPosition = await prisma.flightPosition.findFirst({
        where: { flightId: flight.id },
        orderBy: { recordedAt: "desc" },
      });

      if (!latestPosition) continue;

      const destLat = flight.destinationAirport.latitude;
      const destLon = flight.destinationAirport.longitude;
      const currentLat = latestPosition.latitude;
      const currentLon = latestPosition.longitude;
      const distanceToDestKm = haversineDistanceKm(
        currentLat,
        currentLon,
        destLat,
        destLon
      );

      // Movement: move 0.5-1% of remaining distance per tick
      const moveFraction = 0.007 + Math.random() * 0.005; // ~0.7-1.2%
      const newLat = currentLat + (destLat - currentLat) * moveFraction;
      const newLon = currentLon + (destLon - currentLon) * moveFraction;
      const newHeading = computeHeading(newLat, newLon, destLat, destLon);

      let newAltitude = latestPosition.altitude;
      let newSpeed = latestPosition.speed;
      let newStatus = flight.status;

      if (flight.status === "enroute" && distanceToDestKm < 30) {
        // Transition to landing
        newStatus = "landing";
        newAltitude = Math.max(latestPosition.altitude - 2000, 3000);
        newSpeed = Math.max(latestPosition.speed - 30, 180);
        await prisma.flight.update({
          where: { id: flight.id },
          data: { status: "landing" },
        });
      } else if (flight.status === "landing") {
        // Reduce altitude progressively
        newAltitude = Math.max(latestPosition.altitude - 800, 0);
        newSpeed = Math.max(latestPosition.speed - 20, 140);

        if (latestPosition.altitude < 500) {
          // Landed
          await prisma.flight.update({
            where: { id: flight.id },
            data: { status: "landed" },
          });

          // Clear any runway assignment
          await prisma.runwayAssignment.updateMany({
            where: { flightId: flight.id, clearedAt: null },
            data: { clearedAt: new Date() },
          });

          newStatus = "landed";
        }
      } else {
        // Enroute - slight altitude/speed variation
        newAltitude =
          latestPosition.altitude + (Math.random() - 0.5) * 200;
        newSpeed = latestPosition.speed + (Math.random() - 0.5) * 10;
      }

      // Insert new position record (skip if landed this tick)
      if (newStatus !== "landed") {
        await prisma.flightPosition.create({
          data: {
            flightId: flight.id,
            latitude: newLat,
            longitude: newLon,
            altitude: newAltitude,
            heading: newHeading,
            speed: newSpeed,
          },
        });
      }
    }

    // Run conflict detection and create alerts
    await detectAndAlertConflicts();
  } catch (error) {
    console.error("Simulation tick error:", error);
  }
}

interface PositionRow {
  flight_id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  callsign: string;
}

async function detectAndAlertConflicts() {
  try {
    const positions: PositionRow[] = await prisma.$queryRawUnsafe(`
      SELECT fp.flight_id, fp.latitude, fp.longitude, fp.altitude, a.callsign
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

        if (horizontalDist <= 50 && verticalDist <= 1000) {
          // Check if there's already an unresolved conflict alert for this pair
          const existingAlert = await prisma.alert.findFirst({
            where: {
              type: "conflict",
              resolvedAt: null,
              flightId: Number(a.flight_id),
              message: { contains: b.callsign },
            },
          });

          if (!existingAlert) {
            const severity =
              horizontalDist < 10
                ? "critical"
                : horizontalDist < 25
                  ? "high"
                  : horizontalDist < 40
                    ? "medium"
                    : "low";

            // Create alert for both flights
            await prisma.alert.createMany({
              data: [
                {
                  flightId: Number(a.flight_id),
                  type: "conflict",
                  severity,
                  message: `Conflict with ${b.callsign}: ${horizontalDist.toFixed(1)}km horizontal, ${verticalDist.toFixed(0)}ft vertical separation`,
                },
                {
                  flightId: Number(b.flight_id),
                  type: "conflict",
                  severity,
                  message: `Conflict with ${a.callsign}: ${horizontalDist.toFixed(1)}km horizontal, ${verticalDist.toFixed(0)}ft vertical separation`,
                },
              ],
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Conflict detection error:", error);
  }
}

export function startSimulation() {
  if (running) return;
  running = true;
  simulationInterval = setInterval(simulationTick, 2000);
}

export function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  running = false;
}

export function isSimulationRunning(): boolean {
  return running;
}
