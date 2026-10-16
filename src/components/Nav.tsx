"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui";
import { BackButton } from "@/components/BackButton";
import { useAppStore } from "@/store/useAppStore";
import { useSession } from "@/lib/useSession";
import { E2E_BYPASS_GUARD } from "@/lib/config";

/* The signed-in nav is the app's own table of contents, named for what the
   visitor is looking for rather than for how it is built: the dashboard is
   where you start, sessions are the numbered record, the two layers are the
   two readings of the same recording, and the profile is the account. */
const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "History" },
  { href: "/layer1", label: "Layer 1" },
  { href: "/layer2", label: "Layer 2" },
  { href: "/profile", label: "Profile" },
];

export function TopBar() {
  const layer = useAppStore((s) => s.layer);
  const setLayer = useAppStore((s) => s.setLayer);
  const pathname = usePathname();
  const status = useSession();
  const signedIn = status === "signed-in" || E2E_BYPASS_GUARD;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth pages don't need app navigation chrome
  const AUTH_ROUTES = ["/login", "/signup", "/consent", "/demographics", "/layer"];
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  return (
    <header className="sticky top-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-6xl rounded-full glass-pill border border-white/90 shadow-[0_16px_36px_-6px_rgba(16,43,39,0.08)] px-4 sm:px-6 py-2.5 transition-all my-2">
      <div className="flex items-center justify-between gap-3">
        {/* Brand Anchor & Global Back Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {pathname !== "/" && (
            <BackButton className="shrink-0" />
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#002620] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Logo size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base font-bold tracking-tight text-[#002620]">
                ParkinTrace
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-[#486455] -mt-1 hidden sm:block">
                Motor Health Screening
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-3">
          {signedIn && !isAuthPage && (
            <nav
              className="flex items-center gap-1 rounded-full bg-[#e4f1ec]/60 p-1 border border-[#c1c8c5]/30"
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
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight transition-all ${
                      active
                        ? "bg-[#002620] text-white shadow-sm"
                        : "text-[#414846] hover:text-[#002620] hover:bg-white/60"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Privacy Indicator Capsule */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-[#c7e7d4] text-[#486455] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#0e7c66]"></span>
            <span>Private • Timing Only</span>
          </div>

          {!signedIn && (
            <nav className="flex items-center gap-2" aria-label="Account">
              <Link
                href="/login"
                className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight text-[#414846] transition-colors hover:text-[#002620] hover:bg-white/60"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#002620] px-4 py-1.5 text-xs font-semibold tracking-tight text-white transition-all hover:bg-[#183c35] shadow-sm active:scale-95"
              >
                Sign up
              </Link>
            </nav>
          )}
        </div>

        {/* Mobile menu button */}
        {signedIn && !isAuthPage && (
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full border border-[#c1c8c5]/40 bg-white/80 p-2 text-[#002620]"
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && signedIn && !isAuthPage && (
        <div className="mt-3 border-t border-[#d9e5e0] pt-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile Navigation">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => {
                  if (l.href === "/layer1") setLayer("layer1");
                  if (l.href === "/layer2") setLayer("layer2");
                  setMobileMenuOpen(false);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  pathname === l.href ? "bg-white text-[#002620] shadow-xs" : "text-[#5a6a72] hover:text-[#002620]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
