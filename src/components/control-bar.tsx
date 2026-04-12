"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ControlBarProps {
  simRunning: boolean;
  onRefresh: () => void;
  onSimStatusChange: () => void;
}

export function ControlBar({ simRunning, onRefresh, onSimStatusChange }: ControlBarProps) {
  const [seeding, setSeeding] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    setSeeding(false);
    onRefresh();
  }

  async function handleToggleSim() {
    setToggling(true);
    const endpoint = simRunning ? "/api/simulation/stop" : "/api/simulation/start";
    await fetch(endpoint, { method: "POST" });
    setToggling(false);
    onSimStatusChange();
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <Badge variant={simRunning ? "default" : "secondary"}>
          {simRunning ? "LIVE" : "PAUSED"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
          {seeding ? "Seeding..." : "Seed Database"}
        </Button>
        <Button
          variant={simRunning ? "destructive" : "default"}
          size="sm"
          onClick={handleToggleSim}
          disabled={toggling}
        >
          {toggling ? "..." : simRunning ? "Stop Simulation" : "Start Simulation"}
        </Button>
      </div>
    </header>
  );
}
