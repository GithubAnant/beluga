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
  const size = isSelected ? 42 : 32;
  const rotation = heading;

  const statusColors: Record<string, string> = {
    enroute: "#3b82f6",
    landing: "#f59e0b",
    takeoff: "#22c55e",
   taxiing: "#6b7280",
    holding: "#a855f7",
  };
  const color = statusColors[status] || "#3b82f6";
  const bg = isSelected ? "white" : "transparent";
  const stroke = isSelected ? "2" : "0";

  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(${rotation}deg);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4));">
      <svg viewBox="0 0 512 512" width="${size}" height="${size}" style="fill:${color};">
        <path d="M511.06,286.261c-0.387-10.849-7.42-20.615-18.226-25.356l-193.947-74.094C298.658,78.15,285.367,3.228,256.001,3.228c-29.366,0-42.657,74.922-42.885,183.583L19.167,260.904C8.345,265.646,1.33,275.412,0.941,286.261L0.008,311.97c-0.142,3.886,1.657,7.623,4.917,10.188c3.261,2.564,7.597,3.684,11.845,3.049c0,0,151.678-22.359,198.037-29.559c1.85,82.016,4.019,127.626,4.019,127.626l-51.312,24.166c-6.046,2.38-10.012,8.206-10.012,14.701v9.465c0,4.346,1.781,8.505,4.954,11.493c3.155,2.987,7.403,4.539,11.74,4.292l64.83-3.667c2.08,14.436,8.884,25.048,16.975,25.048c8.091,0,14.877-10.612,16.975-25.048l64.832,3.667c4.336,0.246,8.584-1.305,11.738-4.292c3.174-2.988,4.954-7.148,4.954-11.493v-9.465c0-6.495-3.966-12.321-10.012-14.701l-51.329-24.166c0,0,2.186-45.61,4.037-127.626c46.358,7.2,198.036,29.559,198.036,29.559c4.248,0.635,8.602-0.485,11.845-3.049c3.261-2.565,5.041-6.302,4.918-10.188L511.06,286.261z"/>
      </svg>
    </div>`,
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
