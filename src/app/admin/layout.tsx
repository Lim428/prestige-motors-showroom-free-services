import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f0ede7] text-ink">
      <a
        href="#admin-content"
        className="fixed left-4 top-4 z-[70] -translate-y-24 rounded-md bg-ink px-4 py-3 text-sm font-bold text-white shadow-panel transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-copper focus:ring-offset-2"
      >
        Skip to admin content
      </a>
      {children}
    </div>
  );
}
