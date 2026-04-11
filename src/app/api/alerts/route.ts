import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        flight: {
          include: {
            aircraft: true,
          },
        },
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
