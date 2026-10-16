"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";
import { useSession } from "@/lib/useSession";
import { E2E_BYPASS_GUARD } from "@/lib/config";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/layer1", label: "Layer 1" },
  { href: "/layer2", label: "Layer 2" },
  { href: "/history", label: "History" },
];

export function TopBar() {
  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);
  const pathname = usePathname();
  const status = useSession();
  const signedIn = status === "signed-in" || E2E_BYPASS_GUARD;

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={24} />
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            ParkinTrace
          </span>
          <span className="label hidden pl-2.5 text-[10px] sm:inline">typing-dynamics aid</span>
        </Link>

        <div className="ml-auto">
          {signedIn && (
            <nav
              className="flex items-center gap-0.5 rounded-md border border-hair bg-canvas p-0.5"
              aria-label="Primary"
            >
              {LINKS.map((l) => {
                const isLayerLink = l.href === "/layer1" || l.href === "/layer2";
                const active =
                  pathname === l.href ||
                  (isLayerLink &&
                    (l.href === "/layer1") === (layer === "layer1") &&
                    pathname.startsWith("/" + l.href.slice(1, 7)));
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => {
                      if (l.href === "/layer1") setLayer("layer1");
                      if (l.href === "/layer2") setLayer("layer2");
                    }}
                    className={`rounded-[5px] px-3 py-1.5 text-[13px] font-semibold tracking-tight transition-colors ${
                      active
                        ? "bg-paper text-ink shadow-[0_1px_2px_rgba(13,27,34,0.08)]"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {!signedIn && status === "signed-out" && (
            <nav className="flex items-center gap-1" aria-label="Account">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-[13px] font-semibold tracking-tight text-muted transition-colors hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-ink px-3.5 py-1.5 text-[13px] font-semibold tracking-tight text-white transition-colors hover:bg-ink-soft"
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
