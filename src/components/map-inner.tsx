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

function getPlaneIcon(status: string, isSelected: boolean) {
  const color =
    status === "landing"
      ? "#f59e0b"
      : status === "enroute"
        ? "#22c55e"
        : "#ef4444";

  const size = isSelected ? 32 : 24;
  const stroke = isSelected ? "white" : "none";
  const strokeWidth = isSelected ? 2 : 0;

  return L.divIcon({
    html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L8 10H2L4 12L2 14H8L12 22L16 14H22L20 12L22 10H16L12 2Z"/>
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
          icon={getPlaneIcon(pos.status, pos.flight_id === selectedFlightId)}
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
