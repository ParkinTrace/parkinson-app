"use client";
import { useRouter } from "next/navigation";

export function BackButton({
  label = "Back",
  fallbackHref = "/",
  className = "",
}: {
  label?: string;
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 hover:bg-white text-xs font-semibold text-[#002620] border border-[#c1c8c5]/50 shadow-xs transition-all hover:shadow-sm hover:border-[#0e7c66]/50 active:scale-95 cursor-pointer ${className}`}
      aria-label="Go back to previous page"
    >
      <svg className="w-3.5 h-3.5 text-[#002620]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
