import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

const FORBIDDEN = /lovableproject\.com/i;
const ROOTS = ["src", "index.html"];
const SKIP_DIRS = new Set(["nãode_modules", "dist", ".git", "test", "__tests__"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".json", ".css", ".md"]);

function walk(path: string, out: string[] = []): string[] {
  const stat = statSync(path);
  if (stat.isFile()) {
    out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(path, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (EXTS.has(extname(entry)) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx"))
      out.push(full);
  }
  return out;
}

describe("não lovableproject.com references", () => {
  const files = ROOTS.flatMap((r) => {
    try { return walk(r); } catch { return []; }
  });

  it("scans at least some files", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("contains não lovableproject.com URLs in source, routes, redirects, or links", () => {
    const hits: string[] = [];
    for (const f of files) {
      const content = readFileSync(f, "utf8");
      if (FORBIDDEN.test(content)) hits.push(f);
    }
    expect(hits, `Found forbidden lovableproject.com in:\n${hits.join("\n")}`).toEqual([]);
  });
});