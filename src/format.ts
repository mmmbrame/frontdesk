export function fmt(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function countLabel(value: number, singular: string, plural = `${singular}s`): string {
  return `${fmt(value)} ${value === 1 ? singular : plural}`;
}

export function pct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function num(value: number | null, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return digits === 0 ? fmt(value) : value.toFixed(digits);
}

export function ageBand(age: number): string {
  if (age < 0) return "Unknown";
  if (age < 5) return "Under 5";
  if (age <= 7) return "5–7";
  if (age <= 10) return "8–10";
  if (age <= 13) return "11–13";
  if (age <= 16) return "14–16";
  return "17+";
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
