import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const alertId = parseInt(id, 10);

    if (isNaN(alertId)) {
      return NextResponse.json(
        { error: "Invalid alert ID" },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    if (alert.resolvedAt) {
      return NextResponse.json(
        { error: "Alert is already resolved" },
        { status: 400 }
      );
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date() },
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error("Error resolving alert:", error);
    return NextResponse.json(
      { error: "Failed to resolve alert" },
      { status: 500 }
    );
  }
}
