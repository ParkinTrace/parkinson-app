import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/Nav";
import { Disclaimer } from "@/components/ui";
import { StoreHydrator } from "@/store/useAppStore";
import { RequireAuth } from "@/components/RequireAuth";

/* Three type roles, deliberately chosen:
   display  — an engineering grotesque for headings and the wordmark
   sans     — plain and readable for prose (older eyes, clinical setting)
   mono     — every measurement, unit and label; the numbers carry the
              character because the numbers are the product. */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ParkinTrace — Typing-Based Motor Pattern Screening & Monitoring",
  description:
    "Research aid analyzing how you type (never what you type). Not a medical device; not a diagnosis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <StoreHydrator />
        <TopBar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-12">
          <RequireAuth>{children}</RequireAuth>
        </main>
        <footer className="mx-auto w-full max-w-5xl px-5 pb-10 pt-6">
          <div className="rule border-t pt-4">
            <Disclaimer />
          </div>
        </footer>
      </body>
    </html>
  );
}
