import { useMemo, useState } from "react";
import { fmt, pct } from "../format";
import { aggregate, colorFor, metricOf, type AggRow } from "../query";
import { DIMENSIONS, METRICS, type Dim, type Metric, type Student } from "../types";
import { HBars } from "./Charts";
import { Panel } from "./Visuals";

export function Compare({ rows, onPick }: { rows: Student[]; onPick: (dim: Dim, value: string) => void }) {
  const [dim, setDim] = useState<Dim>("program");
  const groups = useMemo(
    () => aggregate(rows, dim).sort((a, b) => b.students - a.students).slice(0, 8),
    [rows, dim],
  );
  const bars = groups.map((row, index) => ({
    name: row.key,
    value: row.students,
    fill: colorFor(dim, row.key, index),
  }));

  return (
    <div className="stack">
      <Panel
        kicker="Compare"
        title="Put slices next to each other"
        hint="The highlighted cell is the highest value in that row. Click a column title to filter to it."
        action={
          <select value={dim} onChange={(event) => setDim(event.target.value as Dim)}>
            {DIMENSIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        }
      >
        <HBars data={bars} height={Math.max(220, bars.length * 36)} onPick={(name) => onPick(dim, name)} />
        <div className="table-scroll">
          <table className="data compare">
            <thead>
              <tr>
                <th>Metric</th>
                {groups.map((group) => (
                  <th key={group.key}>
                    <button type="button" onClick={() => onPick(dim, group.key)}>
                      {group.key}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const values = groups.map((group) => metricOf(group, metric.id));
                const best = Math.max(...values.filter((value) => Number.isFinite(value)));
                return (
                  <tr key={metric.id}>
                    <td>{metric.label}</td>
                    {groups.map((group) => {
                      const value = metricOf(group, metric.id);
                      const hot = value === best && groups.length > 1;
                      return (
                        <td key={group.key} className={hot ? "hot" : ""}>
                          {cell(group, metric.id, metric.digits)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function cell(row: AggRow, metric: Metric, digits: number): string {
  if (metric === "medianAge" && row.medianAge == null) return "—";
  const value = metricOf(row, metric);
  if (metric === "students" || metric === "schools") return fmt(value);
  if (metric.endsWith("Pct") || metric === "share") return pct(value, digits);
  return value.toFixed(digits);
}
