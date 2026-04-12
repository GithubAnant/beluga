"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Users, Clock, AlertTriangle, ArrowUpDown, Wind, Activity } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function MetricCard({ title, value, subtitle, icon, trend, trendValue }: MetricCardProps) {
  const trendColors = {
    up: "text-emerald-500",
    down: "text-red-500",
    neutral: "text-muted-foreground",
  };

  return (
    <Card className="bg-card/50">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trendValue && (
              <p className={`text-xs font-medium mt-1 ${trendColors[trend || "neutral"]}`}>
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
              </p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, max, color = "bg-blue-500" }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/{max}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    enroute: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    landing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    takeoff: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    taxiing: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    holding: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    arrived: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  const color = colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${color}`}>
      {status}
    </span>
  );
}

export default function AnalyticsPage() {
  const { data: overview } = useSWR("/api/analytics/overview", fetcher, { refreshInterval: 5000 });
  const { data: airlines } = useSWR("/api/analytics/airlines", fetcher);
  const { data: airports } = useSWR("/api/analytics/airports", fetcher);
  const { data: alerts } = useSWR("/api/analytics/alerts", fetcher, { refreshInterval: 3000 });

  const totals = overview?.totals?.[0] ?? {};
  const flightsByStatus = overview?.flightsByStatus ?? [];
  const avgPos = overview?.avgPositionsPerFlight?.[0]?.avg_positions ?? "—";

  const airlineData = airlines?.airlines ?? [];
  const aircraftDetail = airlines?.aircraftDetail ?? [];

  const airportStats = airports?.airportStats ?? [];
  const runwayUtil = airports?.runwayUtilization ?? [];

  const alertBySeverity = alerts?.bySeverity ?? [];
  const alertByType = alerts?.byType ?? [];
  const resolution = alerts?.resolution?.[0] ?? {};

  const inAir = flightsByStatus.find((s: Record<string, unknown>) => s.status === "enroute")?.count ?? 0;
  const landing = flightsByStatus.find((s: Record<string, unknown>) => s.status === "landing")?.count ?? 0;
  const takingOff = flightsByStatus.find((s: Record<string, unknown>) => s.status === "takeoff")?.count ?? 0;
  const taxiing = flightsByStatus.find((s: Record<string, unknown>) => s.status === "taxiing")?.count ?? 0;
  const arrived = flightsByStatus.find((s: Record<string, unknown>) => s.status === "arrived" || s.status === "landed")?.count ?? 0;

  const activeFlights = inAir + landing + takingOff;
  const totalFlights = Number(totals.total_flights) || 1;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-card to-card/50">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Operations Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time airport operations overview with throughput and capacity metrics
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Active Flights"
            value={activeFlights}
            subtitle={`${inAir} enroute, ${landing} landing, ${takingOff} taking off`}
            icon={<Plane className="h-4 w-4" />}
          />
          <MetricCard
            title="On Ground"
            value={taxiing + arrived}
            subtitle={`${taxiing} taxiing, ${arrived} at gates`}
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            title="Runways Active"
            value={`${runwayUtil.filter((r: Record<string, unknown>) => Number(r.active_now) > 0).length}/${runwayUtil.length || 0}`}
            subtitle="Currently in use"
            icon={<ArrowUpDown className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Positions/Flight"
            value={avgPos}
            subtitle="Position records"
            icon={<Wind className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Alerts"
            value={resolution.unresolved ?? 0}
            subtitle={`${resolution.resolved ?? 0} resolved today`}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <MetricCard
            title="Flight Completion"
            value={`${Math.round(((Number(totals.total_flights) - activeFlights) / totalFlights) * 100)}%`}
            subtitle={`${Number(totals.total_flights) - activeFlights} of ${totals.total_flights} completed`}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        {/* Flight Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Flight Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-400">{inAir}</p>
                <p className="text-xs text-muted-foreground">En Route</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-2xl font-bold text-amber-400">{landing}</p>
                <p className="text-xs text-muted-foreground">Landing</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-2xl font-bold text-emerald-400">{takingOff}</p>
                <p className="text-xs text-muted-foreground">Taking Off</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <p className="text-2xl font-bold text-gray-400">{taxiing}</p>
                <p className="text-xs text-muted-foreground">Taxiing</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
                <p className="text-2xl font-bold text-slate-400">{arrived}</p>
                <p className="text-xs text-muted-foreground">At Gate</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-500" style={{ width: `${(inAir / totalFlights) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(landing / totalFlights) * 100}%` }} />
                <div className="bg-emerald-500" style={{ width: `${(takingOff / totalFlights) * 100}%` }} />
                <div className="bg-gray-500" style={{ width: `${(taxiing / totalFlights) * 100}%` }} />
                <div className="bg-slate-500" style={{ width: `${(arrived / totalFlights) * 100}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Airlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top Airlines by Flight Volume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {airlineData.slice(0, 8).map((a: Record<string, unknown>, i: number) => {
                const maxCount = Math.max(...airlineData.map((x: Record<string, unknown>) => Number(x.flight_count)));
                const width = (Number(a.flight_count) / maxCount) * 100;
                return (
                  <div key={String(a.airline)} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{String(a.airline)}</span>
                      <span className="text-muted-foreground">{String(a.flight_count)} flights</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {airlineData.length === 0 && <p className="text-muted-foreground text-sm">No airline data</p>}
            </CardContent>
          </Card>

          {/* Airport Traffic */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Airport Traffic Volume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {airportStats.slice(0, 8).map((a: Record<string, unknown>) => {
                const total = Number(a.departures) + Number(a.arrivals);
                const maxTotal = Math.max(...airportStats.map((x: Record<string, unknown>) => Number(x.departures) + Number(x.arrivals)));
                const width = (total / maxTotal) * 100;
                return (
                  <div key={String(a.code)} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono font-medium">{String(a.code)}</span>
                      <span className="text-muted-foreground">{total} ops</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {airportStats.length === 0 && <p className="text-muted-foreground text-sm">No airport data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Runway Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Runway Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runwayUtil.map((r: Record<string, unknown>, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-medium">{String(r.airport_code)} - {String(r.runway_name)}</span>
                    {Number(r.active_now) > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">Idle</span>
                    )}
                  </div>
                  <ProgressBar label="Assignments" value={Number(r.total_assignments)} max={Math.max(Number(r.total_assignments) * 2, 10)} color={Number(r.active_now) > 0 ? "bg-amber-500" : "bg-slate-500"} />
                </div>
              ))}
              {runwayUtil.length === 0 && <p className="text-muted-foreground col-span-full">No runway data</p>}
            </div>
          </CardContent>
        </Card>

        {/* Alerts Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Alerts by Severity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertBySeverity.map((a: Record<string, unknown>) => {
                const maxCount = Math.max(...alertBySeverity.map((x: Record<string, unknown>) => Number(x.count)), 1);
                const width = (Number(a.count) / maxCount) * 100;
                const severity = String(a.severity);
                const color = severity === "critical" ? "bg-red-500" : severity === "high" ? "bg-amber-500" : "bg-blue-500";
                return (
                  <div key={severity} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <StatusBadge status={severity} />
                      <span className="font-medium">{String(a.count)}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
              {alertBySeverity.length === 0 && <p className="text-muted-foreground text-sm">No alerts</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Alerts by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertByType.slice(0, 6).map((a: Record<string, unknown>) => (
                <div key={String(a.type)} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                  <span className="text-sm">{String(a.type)}</span>
                  <span className="font-medium text-muted-foreground">{String(a.count)}</span>
                </div>
              ))}
              {alertByType.length === 0 && <p className="text-muted-foreground text-sm">No alert types</p>}
            </CardContent>
          </Card>
        </div>

        {/* Resolution Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alert Resolution Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-4xl font-bold">{resolution.resolution_rate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Resolution Rate</p>
              </div>
              <div className="flex-1">
                <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                  <div className="bg-emerald-500" style={{ width: `${resolution.resolution_rate ?? 0}%` }} />
                  <div className="bg-red-500" style={{ width: `${100 - (resolution.resolution_rate ?? 0)}%` }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{resolution.resolved ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{resolution.unresolved ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}