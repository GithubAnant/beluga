"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Airport {
  id: number;
  name: string;
  code: string;
}

interface Aircraft {
  id: number;
  callsign: string;
  type: string;
  airline: string;
}

interface Flight {
  id: number;
  aircraftId: number;
  originAirportId: number;
  destinationAirportId: number;
  status: string;
  createdAt: string;
  aircraft: Aircraft;
  originAirport: Airport;
  destinationAirport: Airport;
}

const statusColors: Record<string, string> = {
  scheduled: "secondary",
  enroute: "default",
  landing: "outline",
  landed: "secondary",
};

export default function FlightsPage() {
  const { data: flights, mutate } = useSWR<Flight[]>("/api/flights", fetcher);
  const { data: aircraftList } = useSWR<Aircraft[]>("/api/aircraft", fetcher);
  const { data: airportList } = useSWR<Airport[]>("/api/airports", fetcher);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Flight | null>(null);
  const [deleting, setDeleting] = useState<Flight | null>(null);
  const [form, setForm] = useState({ aircraftId: "", originAirportId: "", destinationAirportId: "", status: "scheduled" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm({ aircraftId: "", originAirportId: "", destinationAirportId: "", status: "scheduled" });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(f: Flight) {
    setEditing(f);
    setForm({
      aircraftId: String(f.aircraftId),
      originAirportId: String(f.originAirportId),
      destinationAirportId: String(f.destinationAirportId),
      status: f.status,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/flights/${editing.id}` : "/api/flights";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDialogOpen(false);
        mutate();
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDeleteDialogOpen(false);
        mutate();
      }
    } catch {
      setError("Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  const list = Array.isArray(flights) ? flights : [];
  const aircraft = Array.isArray(aircraftList) ? aircraftList : [];
  const airports = Array.isArray(airportList) ? airportList : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Flight Operations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CRUD with foreign keys, ENUMs, and transactions
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Flight
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Callsign</TableHead>
              <TableHead>Airline</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-muted-foreground">{f.id}</TableCell>
                <TableCell className="font-mono font-medium">{f.aircraft.callsign}</TableCell>
                <TableCell>{f.aircraft.airline}</TableCell>
                <TableCell>
                  <Badge variant="outline">{f.originAirport.code}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{f.destinationAirport.code}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[f.status] as "default" | "secondary" | "outline" | "destructive"}>
                    {f.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(f.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(f)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                      onClick={() => { setDeleting(f); setError(null); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No flights found. Seed the database or create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[1100px] h-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Flight" : "Create Flight"}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-6 h-full py-2">
            <div className="w-[340px] shrink-0 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Aircraft (FK → aircraft)</Label>
                <select
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
                  value={form.aircraftId}
                  onChange={(e) => setForm({ ...form, aircraftId: e.target.value })}
                >
                  <option value="">Select aircraft...</option>
                  {aircraft.map((a) => (
                    <option key={a.id} value={a.id}>{a.callsign} — {a.airline}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Origin Airport (FK → airports)</Label>
                <select
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
                  value={form.originAirportId}
                  onChange={(e) => setForm({ ...form, originAirportId: e.target.value })}
                >
                  <option value="">Select origin...</option>
                  {airports.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Destination Airport (FK → airports)</Label>
                <select
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
                  value={form.destinationAirportId}
                  onChange={(e) => setForm({ ...form, destinationAirportId: e.target.value })}
                >
                  <option value="">Select destination...</option>
                  {airports.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status (ENUM: FlightStatus)</Label>
                <select
                  className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="scheduled">scheduled</option>
                  <option value="enroute">enroute</option>
                  <option value="landing">landing</option>
                  <option value="landed">landed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !form.aircraftId || !form.originAirportId || !form.destinationAirportId}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <Label>Generated SQL</Label>
              <div className="relative bg-card border border-border rounded-md overflow-hidden h-full">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted border-r border-border flex flex-col items-center py-2 text-[10px] font-mono text-muted-foreground/40">
                  {(() => {
                    const lines = (editing ? `UPDATE flights
SET aircraft_id = ${form.aircraftId || "?"},
    origin_airport_id = ${form.originAirportId || "?"},
    destination_airport_id = ${form.destinationAirportId || "?"},
    status = '${form.status}'
WHERE id = ${editing.id};` : form.aircraftId && form.originAirportId && form.destinationAirportId ? `INSERT INTO flights (aircraft_id, origin_airport_id, destination_airport_id, status, created_at)
VALUES (
  ${form.aircraftId},
  ${form.originAirportId},
  ${form.destinationAirportId},
  '${form.status}',
  NOW()
);` : `-- Select aircraft, origin, and destination
-- to generate INSERT query`).split("\n");
                    return Array.from({ length: lines.length }, (_, i) => (
                      <span key={i} className="leading-[20px]">{i + 1}</span>
                    ));
                  })()}
                </div>
                <pre
                  className="pl-10 py-2 text-[13px] leading-[20px] font-mono overflow-auto h-full"
                  dangerouslySetInnerHTML={{
                    __html: editing
                      ? `<span class="sql-keyword">UPDATE</span> <span class="sql-ident">flights</span>\n<span class="sql-keyword">SET</span> <span class="sql-ident">aircraft_id</span> = <span class="sql-number">${form.aircraftId || "?"}</span>,\n    <span class="sql-ident">origin_airport_id</span> = <span class="sql-number">${form.originAirportId || "?"}</span>,\n    <span class="sql-ident">destination_airport_id</span> = <span class="sql-number">${form.destinationAirportId || "?"}</span>,\n    <span class="sql-ident">status</span> = <span class="sql-string">'${form.status}'</span>\n<span class="sql-keyword">WHERE</span> <span class="sql-ident">id</span> = <span class="sql-number">${editing.id}</span>;`
                      : form.aircraftId && form.originAirportId && form.destinationAirportId
                        ? `<span class="sql-keyword">INSERT</span> <span class="sql-keyword">INTO</span> <span class="sql-ident">flights</span> (<span class="sql-ident">aircraft_id</span>, <span class="sql-ident">origin_airport_id</span>, <span class="sql-ident">destination_airport_id</span>, <span class="sql-ident">status</span>, <span class="sql-ident">created_at</span>)\n<span class="sql-keyword">VALUES</span> (\n  <span class="sql-number">${form.aircraftId}</span>,\n  <span class="sql-number">${form.originAirportId}</span>,\n  <span class="sql-number">${form.destinationAirportId}</span>,\n  <span class="sql-string">'${form.status}'</span>,\n  <span class="sql-keyword">NOW</span>()\n);`
                        : `<span class="sql-comment">-- Select aircraft, origin, and destination</span>\n<span class="sql-comment">-- to generate INSERT query</span>`
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
            <DialogTitle>Delete Flight</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Delete flight <span className="font-mono font-medium text-foreground">#{deleting?.id}</span> ({deleting?.aircraft.callsign})?
              This will also delete all related positions, runway assignments, and alerts using a <span className="font-medium text-foreground">transaction</span>.
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
