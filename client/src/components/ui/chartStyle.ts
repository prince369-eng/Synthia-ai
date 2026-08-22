export type ChartThemeName = "light" | "dark";

export type ChartStyleEntry = {
  color?: string;
  theme?: Partial<Record<ChartThemeName, string>>;
};

const THEMES: Record<ChartThemeName, string> = { light: "", dark: ".dark" };
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/;
const SAFE_STYLE_VALUE = /^[A-Za-z0-9#(),.%+\-*/\s_]+$/;
const FORBIDDEN_STYLE_TOKENS = /(?:url|expression|behavior)\s*\(|@import/i;

export function normalizeChartId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
  return normalized || "chart";
}

export function safeChartStyleValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 200) return null;
  if (!SAFE_STYLE_VALUE.test(normalized) || FORBIDDEN_STYLE_TOKENS.test(normalized)) return null;
  return normalized;
}

export function buildChartStyleText(id: string, config: Record<string, ChartStyleEntry>): string {
  const safeId = normalizeChartId(id);
  const entries = Object.entries(config).filter(([key, entry]) => SAFE_IDENTIFIER.test(key) && (entry.theme || entry.color));

  return (Object.entries(THEMES) as Array<[ChartThemeName, string]>).map(([theme, prefix]) => {
    const properties = entries.flatMap(([key, entry]) => {
      const color = safeChartStyleValue(entry.theme?.[theme] ?? entry.color);
      return color ? [`  --color-${key}: ${color};`] : [];
    });
    return properties.length ? `${prefix} [data-chart=${safeId}] {\n${properties.join("\n")}\n}` : "";
  }).filter(Boolean).join("\n");
}
