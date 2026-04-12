"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Runway {
  id: number;
  name: string;
  lengthM: number;
  heading: number;
}

interface Airport {
  id: number;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  runways: Runway[];
  _count: { originFlights: number; destinationFlights: number };
}

export default function AirportsPage() {
  const { data: airports, mutate } = useSWR<Airport[]>("/api/airports", fetcher);

  const [airportDialogOpen, setAirportDialogOpen] = useState(false);
  const [runwayDialogOpen, setRunwayDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [editingRunway, setEditingRunway] = useState<Runway | null>(null);
  const [targetAirportId, setTargetAirportId] = useState<number | null>(null);
  const [deletingType, setDeletingType] = useState<"airport" | "runway">("airport");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingLabel, setDeletingLabel] = useState("");

  const [airportForm, setAirportForm] = useState({ name: "", code: "", latitude: "", longitude: "" });
  const [runwayForm, setRunwayForm] = useState({ name: "", lengthM: "", heading: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreateAirport() {
    setEditingAirport(null);
    setAirportForm({ name: "", code: "", latitude: "", longitude: "" });
    setError(null);
    setAirportDialogOpen(true);
  }

  function openEditAirport(a: Airport) {
    setEditingAirport(a);
    setAirportForm({ name: a.name, code: a.code, latitude: String(a.latitude), longitude: String(a.longitude) });
    setError(null);
    setAirportDialogOpen(true);
  }

  function openCreateRunway(airportId: number) {
    setEditingRunway(null);
    setTargetAirportId(airportId);
    setRunwayForm({ name: "", lengthM: "", heading: "" });
    setError(null);
    setRunwayDialogOpen(true);
  }

  function openEditRunway(r: Runway) {
    setEditingRunway(r);
    setRunwayForm({ name: r.name, lengthM: String(r.lengthM), heading: String(r.heading) });
    setError(null);
    setRunwayDialogOpen(true);
  }

  function openDelete(type: "airport" | "runway", id: number, label: string) {
    setDeletingType(type);
    setDeletingId(id);
    setDeletingLabel(label);
    setError(null);
    setDeleteDialogOpen(true);
  }

  async function handleSaveAirport() {
    setSaving(true);
    setError(null);
    try {
      const url = editingAirport ? `/api/airports/${editingAirport.id}` : "/api/airports";
      const method = editingAirport ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(airportForm),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setAirportDialogOpen(false); mutate(); }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleSaveRunway() {
    setSaving(true);
    setError(null);
    try {
      const url = editingRunway ? `/api/runways/${editingRunway.id}` : "/api/runways";
      const method = editingRunway ? "PUT" : "POST";
      const body = editingRunway ? runwayForm : { ...runwayForm, airportId: targetAirportId };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setRunwayDialogOpen(false); mutate(); }
    } catch { setError("Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setSaving(true);
    setError(null);
    try {
      const url = deletingType === "airport" ? `/api/airports/${deletingId}` : `/api/runways/${deletingId}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.error) setError(data.error);
      else { setDeleteDialogOpen(false); mutate(); }
    } catch { setError("Failed to delete"); }
    finally { setSaving(false); }
  }

  const list = Array.isArray(airports) ? airports : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Airport Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            One-to-many relationships, nested CRUD, and cascading operations
          </p>
        </div>
        <Button size="sm" onClick={openCreateAirport}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Airport
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((airport) => (
            <Card key={airport.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {airport.name}
                      <Badge variant="outline" className="font-mono">{airport.code}</Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAirport(airport)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => openDelete("airport", airport.id, airport.code)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {airport._count.originFlights} departures
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {airport._count.destinationFlights} arrivals
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Runways ({airport.runways.length})
                  </span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => openCreateRunway(airport.id)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {airport.runways.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Length</TableHead>
                        <TableHead className="text-xs">Heading</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {airport.runways.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-sm py-1.5">{r.name}</TableCell>
                          <TableCell className="text-sm py-1.5">{r.lengthM}m</TableCell>
                          <TableCell className="text-sm py-1.5">{r.heading}°</TableCell>
                          <TableCell className="text-right py-1.5">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditRunway(r)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-300" onClick={() => openDelete("runway", r.id, r.name)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">No runways</p>
                )}
              </CardContent>
            </Card>
          ))}
          {list.length === 0 && (
            <p className="text-muted-foreground col-span-2 text-center py-8">
              No airports found. Seed the database or add one.
            </p>
          )}
        </div>
      </div>

      {/* Airport Dialog */}
      <Dialog open={airportDialogOpen} onOpenChange={setAirportDialogOpen}>
        <DialogContent className="max-w-[1100px] h-[480px]">
          <DialogHeader>
            <DialogTitle>{editingAirport ? "Edit Airport" : "Add Airport"}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6 h-full py-2">
            <div className="w-[340px] shrink-0 space-y-4 overflow-y-auto">
              {error && <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{error}</div>}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={airportForm.name} onChange={(e) => setAirportForm({ ...airportForm, name: e.target.value })} placeholder="Indira Gandhi International" />
              </div>
              <div className="space-y-2">
                <Label>IATA Code (unique)</Label>
                <Input value={airportForm.code} onChange={(e) => setAirportForm({ ...airportForm, code: e.target.value })} placeholder="DEL" maxLength={10} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={airportForm.latitude} onChange={(e) => setAirportForm({ ...airportForm, latitude: e.target.value })} placeholder="28.5562" />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={airportForm.longitude} onChange={(e) => setAirportForm({ ...airportForm, longitude: e.target.value })} placeholder="77.1000" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAirportDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveAirport} disabled={saving || !airportForm.name || !airportForm.code || !airportForm.latitude || !airportForm.longitude}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label>Generated SQL</Label>
              <div className="relative bg-card border border-border rounded-md overflow-hidden h-full">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted border-r border-border flex flex-col items-center py-2 text-[10px] font-mono text-muted-foreground/40">
                  {(() => {
                    const lines = (editingAirport ? `UPDATE airports
SET name = '${airportForm.name}',
    code = '${airportForm.code}',
    latitude = ${airportForm.latitude},
    longitude = ${airportForm.longitude}
WHERE id = ${editingAirport.id};` : airportForm.name && airportForm.code && airportForm.latitude && airportForm.longitude ? `INSERT INTO airports (name, code, latitude, longitude)
VALUES (
  '${airportForm.name}',
  '${airportForm.code}',
  ${airportForm.latitude},
  ${airportForm.longitude}
);` : `-- Fill in all fields
-- to generate INSERT query`).split("\n");
                    return Array.from({ length: lines.length }, (_, i) => (
                      <span key={i} className="leading-[20px]">{i + 1}</span>
                    ));
                  })()}
                </div>
                <pre
                  className="pl-10 py-2 text-[13px] leading-[20px] font-mono overflow-auto h-full"
                  dangerouslySetInnerHTML={{
                    __html: editingAirport
                      ? `<span class="sql-keyword">UPDATE</span> <span class="sql-ident">airports</span>\n<span class="sql-keyword">SET</span> <span class="sql-ident">name</span> = <span class="sql-string">'${airportForm.name}'</span>,\n    <span class="sql-ident">code</span> = <span class="sql-string">'${airportForm.code}'</span>,\n    <span class="sql-ident">latitude</span> = <span class="sql-number">${airportForm.latitude}</span>,\n    <span class="sql-ident">longitude</span> = <span class="sql-number">${airportForm.longitude}</span>\n<span class="sql-keyword">WHERE</span> <span class="sql-ident">id</span> = <span class="sql-number">${editingAirport.id}</span>;`
                      : airportForm.name && airportForm.code && airportForm.latitude && airportForm.longitude
                        ? `<span class="sql-keyword">INSERT</span> <span class="sql-keyword">INTO</span> <span class="sql-ident">airports</span> (<span class="sql-ident">name</span>, <span class="sql-ident">code</span>, <span class="sql-ident">latitude</span>, <span class="sql-ident">longitude</span>)\n<span class="sql-keyword">VALUES</span> (\n  <span class="sql-string">'${airportForm.name}'</span>,\n  <span class="sql-string">'${airportForm.code}'</span>,\n  <span class="sql-number">${airportForm.latitude}</span>,\n  <span class="sql-number">${airportForm.longitude}</span>\n);`
                        : `<span class="sql-comment">-- Fill in all fields</span>\n<span class="sql-comment">-- to generate INSERT query</span>`
                  }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Runway Dialog */}
      <Dialog open={runwayDialogOpen} onOpenChange={setRunwayDialogOpen}>
        <DialogContent className="max-w-[1100px] h-[480px]">
          <DialogHeader>
            <DialogTitle>{editingRunway ? "Edit Runway" : "Add Runway"}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6 h-full py-2">
            <div className="w-[340px] shrink-0 space-y-4 overflow-y-auto">
              {error && <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{error}</div>}
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={runwayForm.name} onChange={(e) => setRunwayForm({ ...runwayForm, name: e.target.value })} placeholder="09/27" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Length (meters)</Label>
                  <Input type="number" value={runwayForm.lengthM} onChange={(e) => setRunwayForm({ ...runwayForm, lengthM: e.target.value })} placeholder="3810" />
                </div>
                <div className="space-y-2">
                  <Label>Heading (degrees)</Label>
                  <Input type="number" value={runwayForm.heading} onChange={(e) => setRunwayForm({ ...runwayForm, heading: e.target.value })} placeholder="90" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRunwayDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveRunway} disabled={saving || !runwayForm.name || !runwayForm.lengthM || !runwayForm.heading}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label>Generated SQL</Label>
              <div className="relative bg-card border border-border rounded-md overflow-hidden h-full">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted border-r border-border flex flex-col items-center py-2 text-[10px] font-mono text-muted-foreground/40">
                  {(() => {
                    const lines = (editingRunway ? `UPDATE runways
SET name = '${runwayForm.name}',
    length_m = ${runwayForm.lengthM},
    heading = ${runwayForm.heading}
WHERE id = ${editingRunway.id};` : targetAirportId && runwayForm.name && runwayForm.lengthM && runwayForm.heading ? `INSERT INTO runways (airport_id, name, length_m, heading)
VALUES (
  ${targetAirportId},
  '${runwayForm.name}',
  ${runwayForm.lengthM},
  ${runwayForm.heading}
);` : `-- Select airport first,
-- then fill in runway details
-- to generate INSERT query`).split("\n");
                    return Array.from({ length: lines.length }, (_, i) => (
                      <span key={i} className="leading-[20px]">{i + 1}</span>
                    ));
                  })()}
                </div>
                <pre
                  className="pl-10 py-2 text-[13px] leading-[20px] font-mono overflow-auto h-full"
                  dangerouslySetInnerHTML={{
                    __html: editingRunway
                      ? `<span class="sql-keyword">UPDATE</span> <span class="sql-ident">runways</span>\n<span class="sql-keyword">SET</span> <span class="sql-ident">name</span> = <span class="sql-string">'${runwayForm.name}'</span>,\n    <span class="sql-ident">length_m</span> = <span class="sql-number">${runwayForm.lengthM}</span>,\n    <span class="sql-ident">heading</span> = <span class="sql-number">${runwayForm.heading}</span>\n<span class="sql-keyword">WHERE</span> <span class="sql-ident">id</span> = <span class="sql-number">${editingRunway.id}</span>;`
                      : targetAirportId && runwayForm.name && runwayForm.lengthM && runwayForm.heading
                        ? `<span class="sql-keyword">INSERT</span> <span class="sql-keyword">INTO</span> <span class="sql-ident">runways</span> (<span class="sql-ident">airport_id</span>, <span class="sql-ident">name</span>, <span class="sql-ident">length_m</span>, <span class="sql-ident">heading</span>)\n<span class="sql-keyword">VALUES</span> (\n  <span class="sql-number">${targetAirportId}</span>,\n  <span class="sql-string">'${runwayForm.name}'</span>,\n  <span class="sql-number">${runwayForm.lengthM}</span>,\n  <span class="sql-number">${runwayForm.heading}</span>\n);`
                        : `<span class="sql-comment">-- Select airport first,</span>\n<span class="sql-comment">-- then fill in runway details</span>\n<span class="sql-comment">-- to generate INSERT query</span>`
                  }}
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deletingType === "airport" ? "Airport" : "Runway"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">{error}</div>}
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-mono font-medium text-foreground">{deletingLabel}</span>?
              {deletingType === "airport" && (
                <span className="block mt-1 text-amber-400">
                  This will cascade-delete all runways and their assignments via a transaction.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
