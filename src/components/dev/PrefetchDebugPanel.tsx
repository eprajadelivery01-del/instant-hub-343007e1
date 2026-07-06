import { useEffect, useState } from "react";
import {
  subscribePrefetchEvents,
  getPrefetchReport,
  downloadPrefetchReport,
  type PrefetchReport,
} from "@/lib/routePrefetch";

/**
 * Floating debug panel showing prefetched chunks, data hits, cancellations
 * and navigation latencies. Mount only in dev or when explicitly enabled
 * via `?debug=prefetch` or `localStorage.epj_debug_prefetch = "1"`.
 */
export function PrefetchDebugPanel() {
  const [report, setReport] = useState<PrefetchReport>(() => getPrefetchReport());
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const unsub = subscribePrefetchEvents(() => setReport(getPrefetchReport()));
    const i = window.setInterval(() => setReport(getPrefetchReport()), 1000);
    return () => { unsub(); window.clearInterval(i); };
  }, []);

  const entries = Object.entries(report.byPath);
  const totalChunks = entries.filter(([, v]) => v.chunk != null).length;
  const totalData = entries.filter(([, v]) => v.data != null).length;
  const totalCancels = entries.reduce((sum, [, v]) => sum + v.cancels, 0);
  const navHits = entries.filter(([, v]) => v.navigateMs != null).length;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
        fontFamily: "ui-monãospace, SFMonão-Regular, monãospace",
        fontSize: 11,
        color: "#e5e7eb",
        background: "rgba(15, 23, 42, 0.94)",
        border: "1px solid #334155",
        borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        maxWidth: 420,
        maxHeight: collapsed ? 40 : 360,
        overflow: "hidden",
      }}
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          cursor: "pointer",
          padding: "8px 12px",
          background: "#1e293b",
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>
          <strong>prefetch</strong> · chunks {totalChunks} · data {totalData}
          {" · "}nav {navHits} · cancels {totalCancels}
          {" · "}in-flight {report.inFlight} · q {report.queued}
        </span>
        <span style={{ opacity: 0.6 }}>{collapsed ? "▲" : "▼"}</span>
      </div>
      {!collapsed && (
        <div style={{ overflow: "auto", maxHeight: 280, padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                <th style={{ padding: 4 }}>path</th>
                <th style={{ padding: 4 }}>chunk</th>
                <th style={{ padding: 4 }}>data</th>
                <th style={{ padding: 4 }}>nav</th>
                <th style={{ padding: 4 }}>cncl</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([path, v]) => (
                <tr key={path} style={{ borderTop: "1px solid #1e293b" }}>
                  <td style={{ padding: 4, wordBreak: "break-all" }}>{path}</td>
                  <td style={{ padding: 4 }}>{v.chunk != null ? `${Math.round(v.chunk)}ms` : "—"}</td>
                  <td style={{ padding: 4 }}>{v.data != null ? `${Math.round(v.data)}ms` : "—"}</td>
                  <td style={{ padding: 4 }}>{v.navigateMs != null ? `${Math.round(v.navigateMs)}ms` : "—"}</td>
                  <td style={{ padding: 4 }}>{v.cancels || ""}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 8, color: "#64748b" }}>nenhum prefetch ainda…</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button
              onClick={() => downloadPrefetchReport()}
              style={{ background: "#3b82f6", color: "white", border: 0, borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}
            >Baixar JSON</button>
            <span style={{ color: "#64748b", alignSelf: "center" }}>
              LCP: {report.lcp.length ? `${report.lcp[report.lcp.length - 1]}ms` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function shouldShowPrefetchPanel(): boolean {
  if (typeof window === "undefined") return false;
  const qs = new URLSearchParams(window.location.search);
  if (qs.get("debug") === "prefetch") return true;
  try { return localStorage.getItem("epj_debug_prefetch") === "1"; } catch { return false; }
}