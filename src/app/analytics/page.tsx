"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Database } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function SqlBlock({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border border-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Database className="h-3 w-3" />
        View SQL Query
      </button>
      {open && (
        <pre className="px-3 py-2 bg-background/50 text-xs font-mono text-emerald-400 overflow-x-auto border-t border-border whitespace-pre-wrap">
          {query}
        </pre>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data: overview } = useSWR("/api/analytics/overview", fetcher);
  const { data: airlines } = useSWR("/api/analytics/airlines", fetcher);
  const { data: airports } = useSWR("/api/analytics/airports", fetcher);
  const { data: alerts } = useSWR("/api/analytics/alerts", fetcher);

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold">Analytics & Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aggregations, GROUP BY, JOINs, CASE expressions — each section shows the SQL query used
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="airlines">Airlines</TabsTrigger>
            <TabsTrigger value="airports">Airports</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard title="Flights" value={totals.total_flights ?? 0} />
              <StatCard title="Aircraft" value={totals.total_aircraft ?? 0} />
              <StatCard title="Airports" value={totals.total_airports ?? 0} />
              <StatCard title="Runways" value={totals.total_runways ?? 0} />
              <StatCard title="Positions" value={totals.total_positions ?? 0} />
              <StatCard title="Alerts" value={totals.total_alerts ?? 0} />
            </div>
            {overview?.queries?.totals && <SqlBlock query={overview.queries.totals} />}

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Flights by Status (GROUP BY)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {flightsByStatus.map((s: Record<string, unknown>) => (
                    <Badge key={String(s.status)} variant="secondary" className="text-sm px-3 py-1">
                      {String(s.status)}: {String(s.count)}
                    </Badge>
                  ))}
                </div>
                {overview?.queries?.flightsByStatus && <SqlBlock query={overview.queries.flightsByStatus} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Positions per Flight (AVG + Subquery)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{avgPos}</p>
                <p className="text-xs text-muted-foreground mt-1">Average number of position records per flight</p>
                {overview?.queries?.avgPositionsPerFlight && <SqlBlock query={overview.queries.avgPositionsPerFlight} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Airlines Tab */}
          <TabsContent value="airlines" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Airline Summary (JOIN + GROUP BY + COUNT DISTINCT)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Airline</TableHead>
                      <TableHead className="text-center">Aircraft</TableHead>
                      <TableHead className="text-center">Flights</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airlineData.map((a: Record<string, unknown>) => (
                      <TableRow key={String(a.airline)}>
                        <TableCell className="font-medium">{String(a.airline)}</TableCell>
                        <TableCell className="text-center">{String(a.aircraft_count)}</TableCell>
                        <TableCell className="text-center">{String(a.flight_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {airlines?.queries?.airlines && <SqlBlock query={airlines.queries.airlines} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Aircraft Detail (Multi-table JOIN + MAX)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Callsign</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Airline</TableHead>
                      <TableHead className="text-center">Flights</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aircraftDetail.map((a: Record<string, unknown>) => (
                      <TableRow key={String(a.callsign)}>
                        <TableCell className="font-mono">{String(a.callsign)}</TableCell>
                        <TableCell>{String(a.type)}</TableCell>
                        <TableCell>{String(a.airline)}</TableCell>
                        <TableCell className="text-center">{String(a.flight_count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {airlines?.queries?.aircraftDetail && <SqlBlock query={airlines.queries.aircraftDetail} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Airports Tab */}
          <TabsContent value="airports" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Airport Traffic (JOIN + CASE + SUM)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Runways</TableHead>
                      <TableHead className="text-center">Departures</TableHead>
                      <TableHead className="text-center">Arrivals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airportStats.map((a: Record<string, unknown>) => (
                      <TableRow key={String(a.code)}>
                        <TableCell className="font-mono font-medium">{String(a.code)}</TableCell>
                        <TableCell>{String(a.name)}</TableCell>
                        <TableCell className="text-center">{String(a.runway_count)}</TableCell>
                        <TableCell className="text-center">{String(a.departures)}</TableCell>
                        <TableCell className="text-center">{String(a.arrivals)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {airports?.queries?.airportStats && <SqlBlock query={airports.queries.airportStats} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Runway Utilization (JOIN + CASE + SUM)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Airport</TableHead>
                      <TableHead>Runway</TableHead>
                      <TableHead className="text-center">Total Assignments</TableHead>
                      <TableHead className="text-center">Active Now</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runwayUtil.map((r: Record<string, unknown>, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{String(r.airport_code)}</TableCell>
                        <TableCell className="font-mono">{String(r.runway_name)}</TableCell>
                        <TableCell className="text-center">{String(r.total_assignments)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={Number(r.active_now) > 0 ? "default" : "secondary"}>
                            {String(r.active_now)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {airports?.queries?.runwayUtilization && <SqlBlock query={airports.queries.runwayUtilization} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="mt-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard title="Total Alerts" value={resolution.total ?? 0} />
              <StatCard title="Resolved" value={resolution.resolved ?? 0} />
              <StatCard title="Unresolved" value={resolution.unresolved ?? 0} />
              <StatCard title="Resolution Rate" value={resolution.resolution_rate ? `${resolution.resolution_rate}%` : "—"} />
            </div>
            {alerts?.queries?.resolution && <SqlBlock query={alerts.queries.resolution} />}

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Alerts by Severity (GROUP BY + FIELD)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead className="text-center">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertBySeverity.map((a: Record<string, unknown>) => (
                        <TableRow key={String(a.severity)}>
                          <TableCell>
                            <Badge variant={
                              String(a.severity) === "critical" ? "destructive" :
                              String(a.severity) === "high" ? "default" : "secondary"
                            }>
                              {String(a.severity)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{String(a.count)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {alerts?.queries?.bySeverity && <SqlBlock query={alerts.queries.bySeverity} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Alerts by Type (GROUP BY)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertByType.map((a: Record<string, unknown>) => (
                        <TableRow key={String(a.type)}>
                          <TableCell className="font-medium">{String(a.type)}</TableCell>
                          <TableCell className="text-center">{String(a.count)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {alerts?.queries?.byType && <SqlBlock query={alerts.queries.byType} />}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
