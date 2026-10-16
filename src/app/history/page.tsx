"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, EmptyState, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { fetchHistory } from "@/lib/session";
import type { SessionRow } from "@/lib/types";

const PAGE_SIZE = 15;

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchHistory().then(setRows);
  }, []);

  /* fetchHistory returns oldest first, so the position in the record *is* the
     session number. Numbering is kept from that order, then the list is shown
     newest first — the numbers stay put either way. */
  const numbered = useMemo(() => {
    if (!rows) return [];
    return rows.map((row, i) => ({ row, n: i + 1 }));
  }, [rows]);

  const filtered = useMemo(() => {
    const list = [...numbered].reverse();
    if (typeFilter === "all") return list;
    if (typeFilter === "layer2") {
      return list.filter(
        (item) =>
          item.row.layer === "layer2" ||
          (item.row as any).device_metadata?.layer === "layer2" ||
          item.row.session_type === "motor_task",
      );
    }
    if (typeFilter === "layer1") {
      return list.filter(
        (item) =>
          item.row.layer === "layer1" ||
          (!item.row.layer && (item.row as any).device_metadata?.layer !== "layer2" && item.row.session_type !== "motor_task"),
      );
    }
    return list.filter((item) => item.row.session_type === typeFilter);
  }, [numbered, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!rows) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader eyebrow="Records" title="Sessions" />
        <p className="text-sm text-muted">Loading recorded sessions…</p>
      </div>
    );
  }

  const layer2Count = numbered.filter(
    (x) =>
      x.row.layer === "layer2" ||
      (x.row as any).device_metadata?.layer === "layer2" ||
      x.row.session_type === "motor_task",
  ).length;
  const layer1Count = numbered.length - layer2Count;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton fallbackHref="/dashboard" />
      </div>
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#486455]">Filter:</span>
              <button
                type="button"
                onClick={() => { setTypeFilter("all"); setPage(0); }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  typeFilter === "all"
                    ? "bg-[#002620] text-white shadow-sm"
                    : "border border-[#c1c8c5]/40 bg-white/80 text-[#002620] hover:bg-white"
                }`}
              >
                All ({numbered.length})
              </button>
              <button
                type="button"
                onClick={() => { setTypeFilter("layer2"); setPage(0); }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  typeFilter === "layer2"
                    ? "bg-[#002620] text-white shadow-sm"
                    : "border border-[#c1c8c5]/40 bg-white/80 text-[#002620] hover:bg-white"
                }`}
              >
                Layer 2 Baseline ({layer2Count})
              </button>
              <button
                type="button"
                onClick={() => { setTypeFilter("layer1"); setPage(0); }}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  typeFilter === "layer1"
                    ? "bg-[#002620] text-white shadow-sm"
                    : "border border-[#c1c8c5]/40 bg-white/80 text-[#002620] hover:bg-white"
                }`}
              >
                Layer 1 Sample Screenings ({layer1Count})
              </button>
            </div>
            <span className="font-mono text-xs text-[#486455]">
              Showing {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
          </div>

          <div className="glass-panel rounded-3xl p-3 sm:p-5">
            <ul className="space-y-2.5">
              {paginated.map(({ row: s, n }) => {
                const isLayer2 =
                  s.layer === "layer2" ||
                  (s as any).device_metadata?.layer === "layer2" ||
                  s.session_type === "motor_task";
                return (
                  <li key={s.id}>
                    <Link
                      href={`/session/${s.id}`}
                      className="glass-card-subtle flex flex-col gap-2 rounded-2xl p-4 transition-all hover:border-[#002620]/30 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#002620]/10 font-mono text-xs font-bold text-[#002620]">
                          {String(n).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#002620]">
                          {s.started_at.slice(0, 16).replace("T", " ")}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                            isLayer2
                              ? "bg-amber-100/70 text-amber-900 border border-amber-900/10"
                              : "bg-[#caead7]/60 text-[#002620] border border-[#0e7c66]/20"
                          }`}
                        >
                          {isLayer2 ? "Layer 2 Baseline" : "Layer 1 Sample"}
                        </span>
                        <span className="rounded-full bg-[#002620]/5 px-2 py-0.5 font-mono text-[10px] text-[#5a6a72]">
                          {s.session_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#486455]">
                        <span className="font-mono text-[11px]">
                          ID: {s.id.slice(0, 8)}…
                        </span>
                        <span className="font-mono text-[11px]">
                          Device: {s.device_id.slice(0, 8)}
                        </span>
                        <span className="text-[#002620] font-medium text-xs">
                          View Report &rarr;
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <SecondaryButton
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </SecondaryButton>
              <span className="font-mono text-xs text-[#486455]">
                Page {page + 1} of {totalPages}
              </span>
              <SecondaryButton
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </SecondaryButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
