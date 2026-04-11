"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { FlightMap } from "@/components/flight-map";
import { FlightList } from "@/components/flight-list";
import { RunwayManager } from "@/components/runway-manager";
import { AlertsFeed } from "@/components/alerts-feed";
import { ControlBar } from "@/components/control-bar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Dashboard() {
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);

  const { data: positions, mutate: mutatePositions } = useSWR(
    "/api/positions/latest",
    fetcher,
    { refreshInterval: 2000 }
  );

  const { data: flights, mutate: mutateFlights } = useSWR(
    "/api/flights",
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: runways, mutate: mutateRunways } = useSWR(
    "/api/runways",
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: alerts, mutate: mutateAlerts } = useSWR(
    "/api/alerts",
    fetcher,
    { refreshInterval: 3000 }
  );

  const { data: simStatus, mutate: mutateSimStatus } = useSWR(
    "/api/simulation/status",
    fetcher,
    { refreshInterval: 5000 }
  );

  const refreshAll = useCallback(() => {
    mutatePositions();
    mutateFlights();
    mutateRunways();
    mutateAlerts();
    mutateSimStatus();
  }, [mutatePositions, mutateFlights, mutateRunways, mutateAlerts, mutateSimStatus]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ControlBar
        simRunning={simStatus?.running ?? false}
        onRefresh={refreshAll}
        onSimStatusChange={() => mutateSimStatus()}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Map — main area */}
        <div className="flex-1 relative">
          <FlightMap
            positions={positions ?? []}
            selectedFlightId={selectedFlightId}
            onSelectFlight={setSelectedFlightId}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-[380px] flex flex-col border-l border-border bg-card overflow-hidden">
          <div className="flex-1 overflow-auto">
            <FlightList
              flights={flights ?? []}
              selectedFlightId={selectedFlightId}
              onSelectFlight={setSelectedFlightId}
            />
          </div>
          <div className="border-t border-border">
            <RunwayManager
              runways={runways ?? []}
              flights={flights ?? []}
              onAssign={() => {
                mutateRunways();
                mutateFlights();
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom alerts bar */}
      <AlertsFeed alerts={alerts ?? []} onResolve={() => mutateAlerts()} />
    </div>
  );
}
