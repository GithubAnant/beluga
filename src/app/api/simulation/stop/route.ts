import { NextResponse } from "next/server";
import { stopSimulation, isSimulationRunning } from "@/lib/simulation";

export async function POST() {
  try {
    if (!isSimulationRunning()) {
      return NextResponse.json(
        { error: "Simulation is not running" },
        { status: 409 }
      );
    }

    stopSimulation();

    return NextResponse.json({
      message: "Simulation stopped",
      running: false,
    });
  } catch (error) {
    console.error("Error stopping simulation:", error);
    return NextResponse.json(
      { error: "Failed to stop simulation" },
      { status: 500 }
    );
  }
}
