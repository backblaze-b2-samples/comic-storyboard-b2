import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen, Sparkles, Clock, Settings } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comic Storyboard — Backblaze B2",
  description:
    "Describe a story in a sentence and get a character-consistent comic storyboard, persisted to Backblaze B2 via Genblaze.",
};

const NAV = [
  { icon: Sparkles, label: "Generate", active: true },
  { icon: Clock,    label: "History",  active: false },
  { icon: Settings, label: "Settings", active: false },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body style={{ margin: 0, display: "flex", height: "100vh", background: "#010409", color: "#f0f6fc", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside style={{
          width: 160,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "#010409",
          borderRight: "1px solid #21262d",
          overflowY: "auto",
        }}>

          {/* App identity */}
          <div style={{ padding: "14px 12px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #21262d" }}>
            <div style={{ width: 30, height: 30, borderRadius: 6, background: "#1f6feb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BookOpen size={16} color="#fff" />
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f6fc" }}>Comic Storyboard</div>
              <div style={{ fontSize: 11, color: "#6e7681" }}>Generator</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6e7681", padding: "4px 6px 8px" }}>
              Navigation
            </div>
            {NAV.map(({ icon: Icon, label, active }) => (
              <a key={label} href="#" style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                color: active ? "#f0f6fc" : "#8b949e",
                background: active ? "#161b22" : "transparent",
                textDecoration: "none",
                transition: "background 120ms",
              }}>
                <Icon size={15} color={active ? "#4493f8" : "#8b949e"} />
                {label}
              </a>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid #21262d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6e7681" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f78166", flexShrink: 0, display: "inline-block" }} />
              Built on Backblaze B2
            </div>
          </div>
        </aside>

        {/* ── Right panel ─────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* Top bar */}
          <header style={{
            height: 40,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 6,
            background: "#010409",
            borderBottom: "1px solid #21262d",
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#f0f6fc" }}>Comic Storyboard Generator</span>
            <span style={{ fontSize: 13, color: "#6e7681" }}>/</span>
            <span style={{ fontSize: 13, color: "#9198a1" }}>Generate</span>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: "auto", background: "#0d1117" }}>
            {children}
          </main>
        </div>

        <Toaster />
      </body>
    </html>
  );
}
