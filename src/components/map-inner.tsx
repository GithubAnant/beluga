"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

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

interface MapInnerProps {
  positions: Position[];
  selectedFlightId: number | null;
  onSelectFlight: (id: number | null) => void;
}

function getPlaneIcon(heading: number, status: string, isSelected: boolean) {
  const size = isSelected ? 38 : 28;
  const rotation = heading;

  const statusColors: Record<string, string> = {
    enroute: "#3b82f6",
    landing: "#f59e0b",
    takeoff: "#22c55e",
   taxiing: "#6b7280",
    holding: "#a855f7",
  };
  const color = statusColors[status] || "#3b82f6";

  const body = isSelected
    ? `<path d="M12 22 L3 13 L3 8 L12 3 L21 8 L21 13 Z" fill="${color}" stroke="white" stroke-width="1.5"/>`
    : `<path d="M12 21 L4 13 L4 8 L12 3 L20 8 L20 13 Z" fill="${color}"/>`;

  const cockpit = isSelected
    ? `<path d="M12 7 L12 3" stroke="white" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M12 6 L12 3" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`;

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg); transform-origin: center;">
      ${body}
      ${cockpit}
    </svg>`,
    className: "plane-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FlyToSelected({ positions, selectedFlightId }: { positions: Position[]; selectedFlightId: number | null }) {
  const map = useMap();
  const positionsArr = Array.isArray(positions) ? positions : [];

  useEffect(() => {
    if (selectedFlightId) {
      const pos = positionsArr.find((p) => p.flight_id === selectedFlightId);
      if (pos) {
        map.flyTo([pos.latitude, pos.longitude], 10, { duration: 0.5 });
      }
    }
  }, [selectedFlightId, positionsArr, map]);

  return null;
}

export default function MapInner({ positions, selectedFlightId, onSelectFlight }: MapInnerProps) {
  const center: [number, number] = [28.5562, 77.1];
  const positionsArr = Array.isArray(positions) ? positions : [];

  return (
    <MapContainer
      center={center}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToSelected positions={positionsArr} selectedFlightId={selectedFlightId} />

      {positionsArr.map((pos) => (
        <Marker
          key={pos.flight_id}
          position={[pos.latitude, pos.longitude]}
          icon={getPlaneIcon(pos.heading, pos.status, pos.flight_id === selectedFlightId)}
          eventHandlers={{
            click: () => onSelectFlight(pos.flight_id),
          }}
        >
          <Popup>
            <div className="text-sm font-mono">
              <p className="font-bold text-base">{pos.callsign}</p>
              <p>Status: {pos.status}</p>
              <p>Altitude: {Math.round(pos.altitude).toLocaleString()} ft</p>
              <p>Speed: {Math.round(pos.speed)} kts</p>
              <p>Heading: {Math.round(pos.heading)}°</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
