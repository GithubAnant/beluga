"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Terminal,
  Plane,
  PlaneTakeoff,
  Building2,
  BarChart3,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sql", label: "SQL Editor", icon: Terminal },
  { href: "/fleet", label: "Fleet", icon: Plane },
  { href: "/flights", label: "Flights", icon: PlaneTakeoff },
  { href: "/airports", label: "Airports", icon: Building2 },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 border-r border-border bg-card flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h1 className="text-lg font-bold tracking-tight">Beluga</h1>
        <p className="text-xs text-muted-foreground">Airport Control Tower</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
