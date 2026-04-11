import { NextResponse } from "next/server";
import { startSimulation, isSimulationRunning } from "@/lib/simulation";

export async function POST() {
  try {
    if (isSimulationRunning()) {
      return NextResponse.json(
        { error: "Simulation is already running" },
        { status: 409 }
      );
    }

    startSimulation();

    return NextResponse.json({ message: "Simulation started", running: true });
  } catch (error) {
    console.error("Error starting simulation:", error);
    return NextResponse.json(
      { error: "Failed to start simulation" },
      { status: 500 }
    );
  }
}
