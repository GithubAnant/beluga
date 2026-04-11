"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Flight {
  id: number;
  status: string;
  aircraft: { callsign: string; type: string; airline: string };
  originAirport: { code: string };
  destinationAirport: { code: string };
  latestPosition?: {
    altitude: number;
    speed: number;
  } | null;
}

interface FlightListProps {
  flights: Flight[];
  selectedFlightId: number | null;
  onSelectFlight: (id: number) => void;
}

function statusColor(status: string) {
  switch (status) {
    case "enroute": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "landing": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "landed": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "scheduled": return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    default: return "";
  }
}

export function FlightList({ flights, selectedFlightId, onSelectFlight }: FlightListProps) {
  const flightsArr = Array.isArray(flights) ? flights : [];

  if (flightsArr.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Flights (0)
          </h2>
        </div>
        <div className="p-4 text-xs text-muted-foreground">No flights</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Flights ({flightsArr.length})
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border">
          {flightsArr.map((flight) => (
            <button
              key={flight.id}
              onClick={() => onSelectFlight(flight.id)}
              className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                selectedFlightId === flight.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm">
                  {flight.aircraft.callsign}
                </span>
                <Badge variant="outline" className={statusColor(flight.status)}>
                  {flight.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                <span>{flight.originAirport.code}</span>
                <span className="mx-1.5">→</span>
                <span>{flight.destinationAirport.code}</span>
                <span className="mx-2">·</span>
                <span>{flight.aircraft.airline}</span>
              </div>
              {flight.latestPosition && (
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(flight.latestPosition.altitude).toLocaleString()} ft
                  <span className="mx-1">·</span>
                  {Math.round(flight.latestPosition.speed)} kts
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}