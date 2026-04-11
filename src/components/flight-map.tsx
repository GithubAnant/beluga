"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./map-inner"), { ssr: false });

interface Position {
  id: number;
  flight_id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  speed: number;
  status: string;
  callsign: string;
}

interface FlightMapProps {
  positions: Position[];
  selectedFlightId: number | null;
  onSelectFlight: (id: number | null) => void;
}

export function FlightMap({ positions, selectedFlightId, onSelectFlight }: FlightMapProps) {
  return (
    <MapInner
      positions={positions}
      selectedFlightId={selectedFlightId}
      onSelectFlight={onSelectFlight}
    />
  );
}
