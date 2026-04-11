import { NextResponse } from "next/server";
import { isSimulationRunning } from "@/lib/simulation";

export async function GET() {
  try {
    return NextResponse.json({ running: isSimulationRunning() });
  } catch (error) {
    console.error("Error checking simulation status:", error);
    return NextResponse.json(
      { error: "Failed to check simulation status" },
      { status: 500 }
    );
  }
}
