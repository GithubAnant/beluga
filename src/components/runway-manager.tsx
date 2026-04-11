"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RunwayAssignment {
  id: number;
  flightId: number;
  flight: {
    id: number;
    aircraft: { callsign: string };
  };
}

interface Runway {
  id: number;
  name: string;
  lengthM: number;
  heading: number;
  activeAssignment: RunwayAssignment | null;
}

interface Flight {
  id: number;
  status: string;
  aircraft: { callsign: string };
}

interface RunwayManagerProps {
  runways: Runway[];
  flights: Flight[];
  onAssign: () => void;
}

export function RunwayManager({ runways, flights, onAssign }: RunwayManagerProps) {
  const [assigning, setAssigning] = useState<number | null>(null);
  const [clearing, setClearing] = useState<number | null>(null);

  const runwaysArr = Array.isArray(runways) ? runways : [];
  const flightsArr = Array.isArray(flights) ? flights : [];
  const assignableFlights = flightsArr.filter(
    (f) => f.status === "enroute" || f.status === "landing"
  );

  async function handleAssign(runwayId: number, flightId: number) {
    setAssigning(runwayId);
    await fetch(`/api/runways/${runwayId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flightId }),
    });
    setAssigning(null);
    onAssign();
  }

  async function handleClear(runwayId: number) {
    setClearing(runwayId);
    await fetch(`/api/runways/${runwayId}/clear`, { method: "POST" });
    setClearing(null);
    onAssign();
  }

  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Runways
      </h2>
      <div className="space-y-1.5">
        {runwaysArr.map((runway) => (
          <div
            key={runway.id}
            className={`rounded-md border px-3 py-2 ${
              runway.activeAssignment
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border/50 bg-card/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm">{runway.name}</span>
              <span className="text-xs text-muted-foreground">
                {runway.lengthM}m · {runway.heading}°
              </span>
            </div>

            {runway.activeAssignment ? (
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-amber-400">
                  Occupied: {runway.activeAssignment.flight.aircraft.callsign}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleClear(runway.id)}
                  disabled={clearing === runway.id}
                >
                  {clearing === runway.id ? "..." : "Clear"}
                </Button>
              </div>
            ) : (
              <div className="mt-1.5">
                <select
                  className="w-full text-xs bg-background/50 border-none rounded px-2 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(runway.id, parseInt(e.target.value));
                    }
                  }}
                  disabled={assigning === runway.id || assignableFlights.length === 0}
                >
                  <option value="">
                    {assignableFlights.length === 0 ? "No flights available" : "Assign flight..."}
                  </option>
                  {assignableFlights.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.aircraft.callsign} ({f.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
