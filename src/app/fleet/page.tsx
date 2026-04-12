"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Aircraft {
  id: number;
  callsign: string;
  type: string;
  airline: string;
  _count: { flights: number };
}

export default function FleetPage() {
  const { data: aircraft, mutate } = useSWR<Aircraft[]>("/api/aircraft", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Aircraft | null>(null);
  const [deleting, setDeleting] = useState<Aircraft | null>(null);
  const [form, setForm] = useState({ callsign: "", type: "", airline: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (deleteDialogOpen) {
        setDeleteDialogOpen(false);
        return;
      }
      if (dialogOpen) setDialogOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen, deleteDialogOpen]);

  function openCreate() {
    setEditing(null);
    setForm({ callsign: "", type: "", airline: "" });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(a: Aircraft) {
    setEditing(a);
    setForm({ callsign: a.callsign, type: a.type, airline: a.airline });
    setError(null);
    setDialogOpen(true);
  }

  function openDelete(a: Aircraft) {
    setDeleting(a);
    setError(null);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/aircraft/${editing.id}` : "/api/aircraft";
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
      const res = await fetch(`/api/aircraft/${deleting.id}`, { method: "DELETE" });
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

  const list = Array.isArray(aircraft) ? aircraft : [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Fleet Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            CRUD operations on aircraft — demonstrates unique constraints and foreign key relationships
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Aircraft
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Callsign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Airline</TableHead>
              <TableHead className="text-center">Flights</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-muted-foreground">{a.id}</TableCell>
                <TableCell className="font-mono font-medium">{a.callsign}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.airline}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{a._count.flights}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => openDelete(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No aircraft found. Seed the database or add one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative z-10 w-[95vw] max-w-[1100px] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">{editing ? "Edit Aircraft" : "Add Aircraft"}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDialogOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid gap-6 py-2 min-h-0 lg:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-4 min-h-0 lg:w-[340px] lg:shrink-0">
                {error && (
                  <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="callsign">Callsign (unique)</Label>
                  <Input
                    id="callsign"
                    value={form.callsign}
                    onChange={(e) => setForm({ ...form, callsign: e.target.value })}
                    placeholder="e.g. AI-101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Aircraft Type</Label>
                  <Input
                    id="type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    placeholder="e.g. Boeing 777-300ER"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="airline">Airline</Label>
                  <Input
                    id="airline"
                    value={form.airline}
                    onChange={(e) => setForm({ ...form, airline: e.target.value })}
                    placeholder="e.g. Air India"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving || !form.callsign || !form.type || !form.airline}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
              <div className="min-w-0 space-y-2 min-h-0">
                <Label>Generated SQL</Label>
                <div className="relative bg-card border border-border rounded-md overflow-hidden h-[240px] lg:h-full min-h-[220px]">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted border-r border-border flex flex-col items-center py-2 text-[10px] font-mono text-muted-foreground/40">
                    {(() => {
                      const lines = (editing ? `UPDATE aircraft
SET callsign = '${form.callsign}',
    type = '${form.type}',
    airline = '${form.airline}'
WHERE id = ${editing.id};` : form.callsign && form.type && form.airline ? `INSERT INTO aircraft (callsign, type, airline)
VALUES (
  '${form.callsign}',
  '${form.type}',
  '${form.airline}'
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
                      __html: editing
                        ? `<span class="sql-keyword">UPDATE</span> <span class="sql-ident">aircraft</span>\n<span class="sql-keyword">SET</span> <span class="sql-ident">callsign</span> = <span class="sql-string">'${form.callsign}'</span>,\n    <span class="sql-ident">type</span> = <span class="sql-string">'${form.type}'</span>,\n    <span class="sql-ident">airline</span> = <span class="sql-string">'${form.airline}'</span>\n<span class="sql-keyword">WHERE</span> <span class="sql-ident">id</span> = <span class="sql-number">${editing.id}</span>;`
                        : form.callsign && form.type && form.airline
                          ? `<span class="sql-keyword">INSERT</span> <span class="sql-keyword">INTO</span> <span class="sql-ident">aircraft</span> (<span class="sql-ident">callsign</span>, <span class="sql-ident">type</span>, <span class="sql-ident">airline</span>)\n<span class="sql-keyword">VALUES</span> (\n  <span class="sql-string">'${form.callsign}'</span>,\n  <span class="sql-string">'${form.type}'</span>,\n  <span class="sql-string">'${form.airline}'</span>\n);`
                          : `<span class="sql-comment">-- Fill in all fields</span>\n<span class="sql-comment">-- to generate INSERT query</span>`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close delete dialog"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeleteDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Delete Aircraft</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialogOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="space-y-4 py-2">
              {error && (
                <div className="p-2 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-mono font-medium text-foreground">{deleting?.callsign}</span>?
                {deleting && deleting._count.flights > 0 && (
                  <span className="block mt-1 text-amber-400">
                    This aircraft has {deleting._count.flights} flight(s). Deletion will fail due to foreign key constraints.
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
          </div>
        </div>
      )}
    </div>
  );
}
