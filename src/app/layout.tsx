import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/Nav";
import { Disclaimer } from "@/components/ui";
import { StoreHydrator } from "@/store/useAppStore";
import { RequireAuth } from "@/components/RequireAuth";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

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
  title: "ParkinTrace — Sub-second Motor Biometrics & Longitudinal Typing Dynamics",
  description:
    "Passive clinical motor telemetry measuring sub-millisecond key hold and flight kinematics. Never records what you type.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable} ${archivo.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="relative flex min-h-full flex-col bg-[#F7F5EF] text-[#131e1b] antialiased selection:bg-[#caead7] selection:text-[#002620]">
        {/* Ambient Glowing Light Mesh Spots (Stitch Biological Glass Canvas) */}
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-[15%] left-[10%] w-[680px] h-[680px] rounded-full bg-[#D5E7DF] opacity-60 blur-[130px] mix-blend-multiply" />
          <div className="absolute top-[25%] -right-[10%] w-[740px] h-[740px] rounded-full bg-[#E2ECE5] opacity-70 blur-[140px] mix-blend-multiply" />
          <div className="absolute top-[60%] left-[20%] w-[820px] h-[820px] rounded-full bg-[#F5ECE0] opacity-65 blur-[150px] mix-blend-multiply" />
          <div className="absolute -bottom-[10%] right-[15%] w-[650px] h-[650px] rounded-full bg-[#DDEAE3] opacity-55 blur-[130px] mix-blend-multiply" />
        </div>

        <StoreHydrator />
        <TopBar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-10">
          <RequireAuth>{children}</RequireAuth>
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 sm:px-6 pb-10 pt-6">
          <div className="border-t border-[#d9e5e0] pt-4">
            <Disclaimer />
          </div>
        </footer>
      </body>
    </html>
  );
}
