import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/serialize";

export async function GET() {
  try {
    const bySeverity = await prisma.$queryRaw`
      SELECT severity, COUNT(*) AS count
      FROM alerts
      GROUP BY severity
      ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low')
    `;

    const byType = await prisma.$queryRaw`
      SELECT type, COUNT(*) AS count
      FROM alerts
      GROUP BY type
      ORDER BY count DESC
    `;

    const resolution = await prisma.$queryRaw`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) AS resolved,
        SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS unresolved,
        ROUND(
          SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0),
          1
        ) AS resolution_rate
      FROM alerts
    `;

    return NextResponse.json({
      bySeverity: serializeBigInt(bySeverity),
      byType: serializeBigInt(byType),
      resolution: serializeBigInt(resolution),
      queries: {
        bySeverity: "SELECT severity, COUNT(*) AS count FROM alerts GROUP BY severity ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low')",
        byType: "SELECT type, COUNT(*) AS count FROM alerts GROUP BY type ORDER BY count DESC",
        resolution: "SELECT COUNT(*) AS total, SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) AS resolved, SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS unresolved, ROUND(SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS resolution_rate FROM alerts",
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
