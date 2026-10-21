export type ReportAngle = {
  dimension: string;
  metric: string;
  text: string;
};

export type ReportTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type ReportBrief = {
  audience: "students" | "staff";
  total: number;
  universe: number;
  filters: string[];
  overview: { label: string; value: string }[];
  angles: ReportAngle[];
  tables: ReportTable[];
};

export type WrittenReport = {
  title: string;
  lede: string;
  sections: { heading: string; finding: string; why: string }[];
  caveats: string[];
};

function scrub(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\d{5}-\d{7}-\d/g, "[id]")
    .replace(/\b\d{11,}\b/g, "[id]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = scrub(value, max);
  return clean || null;
}

export function sanitizeQuestion(value: unknown): string {
  return text(value, 500) ?? "";
}

export function sanitizeBrief(value: unknown): ReportBrief | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.audience !== "students" && raw.audience !== "staff") return null;
  if (typeof raw.total !== "number" || !Number.isFinite(raw.total) || raw.total < 0 || raw.total > 200_000) return null;
  if (typeof raw.universe !== "number" || !Number.isFinite(raw.universe) || raw.universe < 0 || raw.universe > 200_000) return null;

  const filters = Array.isArray(raw.filters)
    ? raw.filters.slice(0, 24).map((item) => text(item, 80)).filter((item): item is string => Boolean(item))
    : [];
  const overview = Array.isArray(raw.overview)
    ? raw.overview.slice(0, 24).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const label = text(row.label, 60);
        const cell = text(row.value, 120);
        return label && cell ? [{ label, value: cell }] : [];
      })
    : [];
  const angles = Array.isArray(raw.angles)
    ? raw.angles.slice(0, 6).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const dimension = text(row.dimension, 40);
        const metric = text(row.metric, 60);
        const body = text(row.text, 500);
        return dimension && metric && body ? [{ dimension, metric, text: body }] : [];
      })
    : [];
  const tables = Array.isArray(raw.tables)
    ? raw.tables.slice(0, 4).flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const title = text(row.title, 80);
        const columns = Array.isArray(row.columns)
          ? row.columns.slice(0, 5).map((cell) => text(cell, 40)).filter((cell): cell is string => Boolean(cell))
          : [];
        const rows = Array.isArray(row.rows)
          ? row.rows.slice(0, 8).flatMap((line) => {
              if (!Array.isArray(line)) return [];
              const cells = line.slice(0, columns.length).map((cell) => text(cell, 80) ?? "");
              return cells.some(Boolean) ? [cells] : [];
            })
          : [];
        return title && columns.length && rows.length ? [{ title, columns, rows }] : [];
      })
    : [];

  if (!overview.length) return null;
  return { audience: raw.audience, total: Math.round(raw.total), universe: Math.round(raw.universe), filters, overview, angles, tables };
}
