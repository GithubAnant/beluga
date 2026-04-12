"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Clock, RotateCcw, ChevronDown } from "lucide-react";

// SQL syntax highlighting — returns HTML with color spans
const SQL_KEYWORDS = new Set([
  "SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","OUTER","CROSS","ON",
  "AND","OR","NOT","IN","EXISTS","BETWEEN","LIKE","IS","NULL","AS","CASE",
  "WHEN","THEN","ELSE","END","INSERT","INTO","VALUES","UPDATE","SET","DELETE",
  "CREATE","ALTER","DROP","TABLE","INDEX","VIEW","DATABASE","IF","REPLACE",
  "ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","UNION","ALL","DISTINCT",
  "COUNT","SUM","AVG","MIN","MAX","ROUND","COALESCE","NULLIF","CAST",
  "ASC","DESC","WITH","RECURSIVE","EXPLAIN","SHOW","DESCRIBE","DESC","USE",
  "TABLES","COLUMNS","PRIMARY","KEY","FOREIGN","REFERENCES","CONSTRAINT",
  "DEFAULT","AUTO_INCREMENT","UNIQUE","CHECK","GRANT","REVOKE","TRUNCATE",
  "BEGIN","COMMIT","ROLLBACK","TRANSACTION","FIELD","TIMESTAMPDIFF",
]);

function highlightSql(code: string): string {
  // We tokenize character-by-character to handle strings/comments properly
  const tokens: { type: string; value: string }[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-line comment
    if (code[i] === "-" && code[i + 1] === "-") {
      let end = i;
      while (end < code.length && code[end] !== "\n") end++;
      tokens.push({ type: "comment", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Multi-line comment
    if (code[i] === "/" && code[i + 1] === "*") {
      let end = i + 2;
      while (end < code.length && !(code[end] === "*" && code[end + 1] === "/")) end++;
      end += 2;
      tokens.push({ type: "comment", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings (single-quoted)
    if (code[i] === "'") {
      let end = i + 1;
      while (end < code.length && code[end] !== "'") {
        if (code[end] === "\\") end++;
        end++;
      }
      end++;
      tokens.push({ type: "string", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Backtick identifiers
    if (code[i] === "`") {
      let end = i + 1;
      while (end < code.length && code[end] !== "`") end++;
      end++;
      tokens.push({ type: "ident", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Numbers
    if (/\d/.test(code[i]) && (i === 0 || /[\s,=(]/.test(code[i - 1]))) {
      let end = i;
      while (end < code.length && /[\d.]/.test(code[end])) end++;
      tokens.push({ type: "number", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Words (keywords, identifiers)
    if (/[a-zA-Z_]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[a-zA-Z0-9_]/.test(code[end])) end++;
      const word = code.slice(i, end);
      const isKw = SQL_KEYWORDS.has(word.toUpperCase());
      tokens.push({ type: isKw ? "keyword" : "text", value: word });
      i = end;
      continue;
    }

    // Operators / punctuation
    if (/[*,;.()=<>!+\-/]/.test(code[i])) {
      tokens.push({ type: "operator", value: code[i] });
      i++;
      continue;
    }

    // Everything else (whitespace, etc)
    tokens.push({ type: "text", value: code[i] });
    i++;
  }

  // Convert tokens to HTML
  return tokens
    .map(({ type, value }) => {
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      switch (type) {
        case "keyword":
          return `<span class="sql-keyword">${escaped}</span>`;
        case "string":
          return `<span class="sql-string">${escaped}</span>`;
        case "number":
          return `<span class="sql-number">${escaped}</span>`;
        case "comment":
          return `<span class="sql-comment">${escaped}</span>`;
        case "operator":
          return `<span class="sql-operator">${escaped}</span>`;
        case "ident":
          return `<span class="sql-ident">${escaped}</span>`;
        default:
          return escaped;
      }
    })
    .join("");
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
}

interface HistoryEntry {
  query: string;
  timestamp: Date;
  success: boolean;
}

const presetQueries = [
  {
    label: "All Flights with Aircraft (JOIN)",
    query: `SELECT f.id, a.callsign, a.airline, ap1.code AS origin, ap2.code AS destination, f.status
FROM flights f
JOIN aircraft a ON f.aircraft_id = a.id
JOIN airports ap1 ON f.origin_airport_id = ap1.id
JOIN airports ap2 ON f.destination_airport_id = ap2.id`,
  },
  {
    label: "Flights per Status (GROUP BY)",
    query: `SELECT status, COUNT(*) AS flight_count
FROM flights
GROUP BY status
ORDER BY flight_count DESC`,
  },
  {
    label: "Airport Runway Count (JOIN + COUNT)",
    query: `SELECT ap.code, ap.name, COUNT(r.id) AS runway_count
FROM airports ap
LEFT JOIN runways r ON ap.id = r.airport_id
GROUP BY ap.id, ap.code, ap.name`,
  },
  {
    label: "Flights by Airline (Multi-JOIN + GROUP BY)",
    query: `SELECT a.airline, COUNT(f.id) AS flight_count, COUNT(DISTINCT a.id) AS aircraft_used
FROM aircraft a
LEFT JOIN flights f ON a.id = f.aircraft_id
GROUP BY a.airline
ORDER BY flight_count DESC`,
  },
  {
    label: "Recent Positions (ORDER BY + LIMIT)",
    query: `SELECT fp.flight_id, a.callsign, fp.latitude, fp.longitude, fp.altitude, fp.speed, fp.recorded_at
FROM flight_positions fp
JOIN flights f ON fp.flight_id = f.id
JOIN aircraft a ON f.aircraft_id = a.id
ORDER BY fp.recorded_at DESC
LIMIT 20`,
  },
  {
    label: "Busiest Airports (Subquery)",
    query: `SELECT ap.code, ap.name,
  (SELECT COUNT(*) FROM flights WHERE origin_airport_id = ap.id) AS departures,
  (SELECT COUNT(*) FROM flights WHERE destination_airport_id = ap.id) AS arrivals
FROM airports ap
ORDER BY (departures + arrivals) DESC`,
  },
  {
    label: "EXPLAIN Query Plan",
    query: `EXPLAIN SELECT f.id, a.callsign
FROM flights f
JOIN aircraft a ON f.aircraft_id = a.id
WHERE f.status = 'enroute'`,
  },
  {
    label: "Show Tables",
    query: `SHOW TABLES`,
  },
];

export default function SqlEditorPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const lines = query.split("\n");
  const lineCount = Math.max(lines.length, 1);

  const highlightedHtml = useMemo(() => highlightSql(query), [query]);

  // Sync scroll between gutter, highlight overlay, and textarea
  const syncScroll = useCallback(() => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
      if (highlightRef.current) {
        highlightRef.current.scrollTop = scrollTop;
        highlightRef.current.scrollLeft = scrollLeft;
      }
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("scroll", syncScroll);
    return () => ta.removeEventListener("scroll", syncScroll);
  }, [syncScroll]);

  // Handle tab key for indentation
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      executeQuery();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = query.substring(0, start) + "  " + query.substring(end);
      setQuery(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }

  async function executeQuery() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setHistory((h) => [{ query: query.trim(), timestamp: new Date(), success: false }, ...h]);
      } else {
        setResult(data);
        setHistory((h) => [{ query: query.trim(), timestamp: new Date(), success: true }, ...h]);
      }
    } catch {
      setError("Failed to execute query");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* Main editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 border-b border-border bg-card flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              onClick={executeQuery}
              disabled={loading || !query.trim()}
              size="sm"
              className="h-7 text-xs gap-1.5"
            >
              <Play className="h-3 w-3" />
              {loading ? "Running..." : "Run"}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => setPresetsOpen(!presetsOpen)}
              >
                Templates
                <ChevronDown className="h-3 w-3" />
              </Button>
              {presetsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPresetsOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-card border border-border shadow-lg py-1">
                    {presetQueries.map((p) => (
                      <button
                        key={p.label}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setQuery(p.query);
                          setPresetsOpen(false);
                          textareaRef.current?.focus();
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground/60 font-mono">
            {lineCount} line{lineCount !== 1 ? "s" : ""} · ⌘↵ to run
          </span>
        </div>

        {/* Code editor area */}
        <div className="relative flex overflow-hidden" style={{ height: "40%" }}>
          {/* Line numbers gutter */}
          <div
            ref={gutterRef}
            className="w-12 shrink-0 bg-card border-r border-border overflow-hidden select-none"
          >
            <div className="py-[10px]">
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className="px-3 text-right text-[13px] leading-[20px] font-mono text-muted-foreground/40"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Editor with syntax highlighting overlay */}
          <div className="flex-1 relative overflow-hidden">
            {/* Highlighted code layer (behind) */}
            <pre
              ref={highlightRef}
              aria-hidden="true"
              className="absolute inset-0 p-[10px] font-mono text-[13px] leading-[20px] overflow-hidden whitespace-pre-wrap break-words pointer-events-none m-0"
              style={{ tabSize: 2 }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
            />
            {/* Transparent textarea layer (on top, captures input) */}
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="-- Write your SQL query here"
              className="absolute inset-0 w-full h-full p-[10px] font-mono text-[13px] leading-[20px] text-transparent caret-foreground resize-none outline-none border-none bg-transparent overflow-auto placeholder:text-muted-foreground/30"
              style={{ tabSize: 2, caretColor: "var(--foreground)" }}
            />
          </div>
        </div>

        {/* Resize handle / status bar between editor and results */}
        <div className="h-8 border-y border-border bg-card flex items-center px-3 shrink-0">
          {result && (
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {result.executionTime}ms
              </span>
              <span>
                {result.rowCount} row{result.rowCount !== 1 ? "s" : ""}
              </span>
              <span>
                {result.columns.length} col{result.columns.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {error && (
            <span className="text-[11px] text-red-400 font-mono truncate">
              Error — see below
            </span>
          )}
          {!result && !error && (
            <span className="text-[11px] text-muted-foreground/40 font-mono">
              Results
            </span>
          )}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {error && (
            <div className="p-4 text-sm font-mono text-red-400 overflow-auto">
              <pre className="whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {result.columns.map((col) => (
                      <TableHead
                        key={col}
                        className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground h-8 bg-card sticky top-0"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i} className="border-b border-border/50">
                      {result.columns.map((col) => (
                        <TableCell
                          key={col}
                          className="font-mono text-xs py-1.5 px-4"
                        >
                          {row[col] == null ? (
                            <span className="text-muted-foreground/40 italic">NULL</span>
                          ) : (
                            String(row[col])
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {!result && !error && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground/30 font-mono">
                Run a query to see results
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History panel */}
      <div className="w-56 border-l border-border flex flex-col bg-card">
        <div className="h-10 border-b border-border flex items-center px-3 shrink-0">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            History
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {history.length === 0 && (
              <p className="text-[11px] text-muted-foreground/40 p-3 font-mono">
                No queries yet
              </p>
            )}
            {history.map((entry, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2 hover:bg-accent/30 transition-colors border-b border-border/30"
                onClick={() => {
                  setQuery(entry.query);
                  textareaRef.current?.focus();
                }}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <RotateCcw className="h-2.5 w-2.5 text-muted-foreground/40" />
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      entry.success ? "text-emerald-500" : "text-red-400"
                    }`}
                  >
                    {entry.success ? "OK" : "ERR"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground/60 truncate">
                  {entry.query}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
