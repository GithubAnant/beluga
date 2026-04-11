"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface Alert {
  id: number;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
  flight: {
    aircraft: { callsign: string };
  };
}

interface AlertsFeedProps {
  alerts: Alert[];
  onResolve: () => void;
}

function severityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "low": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default: return "";
  }
}

export function AlertsFeed({ alerts, onResolve }: AlertsFeedProps) {
  const [resolving, setResolving] = useState<number | null>(null);

  if (!Array.isArray(alerts) || alerts.length === 0) {
    return (
      <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        No active alerts
      </div>
    );
  }

  async function handleResolve(alertId: number) {
    setResolving(alertId);
    await fetch(`/api/alerts/${alertId}/resolve`, { method: "POST" });
    setResolving(null);
    onResolve();
  }

  return (
    <div className="border-t border-border bg-card">
      <div className="px-4 py-1.5 border-b border-border flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Alerts
        </h2>
        <Badge variant="destructive" className="text-xs">
          {alerts.length}
        </Badge>
      </div>
      <ScrollArea className="max-h-[140px]">
        <div className="divide-y divide-border">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center gap-3 px-4 py-2">
              <Badge variant="outline" className={severityColor(alert.severity)}>
                {alert.severity}
              </Badge>
              <span className="font-mono text-xs font-bold">
                {alert.flight.aircraft.callsign}
              </span>
              <span className="text-xs text-muted-foreground flex-1 truncate">
                {alert.message}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => handleResolve(alert.id)}
                disabled={resolving === alert.id}
              >
                Resolve
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 