"use client";
import { useEffect, useState } from "react";
import { Card, EmptyState, PageHeader, PrimaryButton } from "@/components/ui";
import { fetchHistory } from "@/lib/session";
import type { SessionRow } from "@/lib/types";

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);

  useEffect(() => {
    fetchHistory().then(setRows);
  }, []);

  if (!rows) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Records" title="Sessions" />
        <p className="text-sm text-muted">Loading recorded sessions…</p>
      </div>
    );
  }

  /* fetchHistory returns oldest first, so the position in the record *is* the
     session number. Numbering is kept from that order, then the list is shown
     newest first — the numbers stay put either way. */
  const numbered = rows.map((row, i) => ({ row, n: i + 1 }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Records"
        title="Sessions"
        description="Every session on this account, numbered in the order you recorded them, newest first. Open one to see its exact metrics and within-session rhythm."
        actions={<PrimaryButton href="/test">New typing session</PrimaryButton>}
      />

      {!rows.length ? (
        <EmptyState
          title="No sessions recorded yet"
          body="Your sessions appear here, numbered. The first one you record is a real measurement — there is no practice run."
        />
      ) : (
        <Card className="p-0">
          <ul>
            {[...numbered].reverse().map(({ row: s, n }) => (
              <li key={s.id} className="border-b border-hair last:border-b-0">
                <a
                  href={`/session/${s.id}`}
                  className="flex flex-col gap-1 px-5 py-3.5 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="w-6 shrink-0 font-mono text-[11px] font-medium text-trace">
                      {String(n).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[13px] tabular-nums text-ink">
                      {s.started_at.slice(0, 16).replace("T", " ")}
                    </span>
                    <span className="label">{s.session_type}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-muted">
                      {s.id.slice(0, 8)}…
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      device {s.device_id.slice(0, 8)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
