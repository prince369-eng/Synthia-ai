import { describe, expect, it } from "vitest";
import { buildChartStyleText, normalizeChartId, safeChartStyleValue } from "../client/src/components/ui/chartStyle";

describe("chart style hardening", () => {
  it("normalizes chart identifiers before they become attribute selectors", () => {
    expect(normalizeChartId('chart-1] { color: red; } <style>')).toBe("chart-1colorredstyle");
  });

  it("accepts bounded color syntax while rejecting CSS-breaking or fetch-capable values", () => {
    expect(safeChartStyleValue("hsl(var(--chart-1) / 0.8)")).toBe("hsl(var(--chart-1) / 0.8)");
    expect(safeChartStyleValue("url(https://untrusted.example/pixel)")).toBeNull();
    expect(safeChartStyleValue("red; } body { display:none")).toBeNull();
    expect(safeChartStyleValue("@import url(https://untrusted.example/style.css)")).toBeNull();
  });

  it("drops unsafe keys and values from generated style text", () => {
    const css = buildChartStyleText("chart-1", {
      safe: { color: "#14b8a6" },
      "unsafe;body": { color: "red" },
      unsafeValue: { color: "red; } body { display:none" },
    });
    expect(css).toContain("--color-safe: #14b8a6;");
    expect(css).not.toContain("unsafe;body");
    expect(css).not.toContain("display:none");
  });
});
