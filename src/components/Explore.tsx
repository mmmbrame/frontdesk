import { useMemo, useState } from "react";
import { fmt, pct } from "../format";
import { aggregate, colorFor, metricOf, orderedAggregates, splitAggregate, type AggRow } from "../query";
import { DIMENSIONS, METRICS, type Dim, type Metric } from "../types";
import type { Student } from "../types";
import { HBars, StackedBars } from "./Charts";
import { Panel } from "./Visuals";

export function Explore({
  rows,
  onPick,
}: {
  rows: Student[];
  onPick: (dim: Dim, value: string) => void;
}) {
  const [dim, setDim] = useState<Dim>("district");
  const [split, setSplit] = useState<Dim | "none">("gender");
  const [metric, setMetric] = useState<Metric>("students");
  const [top, setTop] = useState(12);
  const [bySize, setBySize] = useState(true);
  const [sortMetric, setSortMetric] = useState<Metric>("students");

  const metricMeta = METRICS.find((item) => item.id === metric) ?? METRICS[0];
  const grouped = useMemo(() => aggregate(rows, dim), [rows, dim]);
  const ordered = useMemo(
    () => orderedAggregates(grouped, dim, sortMetric, bySize),
    [grouped, dim, sortMetric, bySize],
  );
  const chartRows = ordered.slice(0, top);
  const splitView = useMemo(
    () => (split === "none" ? null : splitAggregate(rows, dim, split, top)),
    [rows, dim, split, top],
  );

  const bars = chartRows.map((row, index) => ({
    name: row.key,
    value: metricOf(row, metric),
    fill: colorFor(dim, row.key, index),
  }));

  return (
    <div className="stack">
      <Panel
        kicker="Explorer"
        title="Any metric, any cut"
        hint="Choose what to group by, optionally split the bars, then sort the table by another metric. Click a name to filter the whole atlas."
      >
        <div className="controls">
          <label>
            Group by
            <select value={dim} onChange={(event) => setDim(event.target.value as Dim)}>
              {DIMENSIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Split by
            <select
              value={split}
              onChange={(event) => setSplit(event.target.value as Dim | "none")}
            >
              <option value="none">No split</option>
              {DIMENSIONS.filter((item) => item.id !== dim).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chart metric
            <select value={metric} onChange={(event) => {
              const next = event.target.value as Metric;
              setMetric(next);
              setSortMetric(next);
            }}>
              {METRICS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chart rows
            <select value={top} onChange={(event) => setTop(Number(event.target.value))}>
              {[8, 12, 20, 40].map((count) => (
                <option key={count} value={count}>
                  Top {count}
                </option>
              ))}
            </select>
          </label>
          <label className="checkline">
            <input type="checkbox" checked={bySize} onChange={(event) => setBySize(event.target.checked)} />
            Sort chart by size
          </label>
        </div>
        {splitView && metric === "students" ? (
          <>
            <StackedBars
              data={splitView.rows}
              series={splitView.series}
              height={Math.max(280, splitView.rows.length * 36)}
              onPick={(name) => onPick(dim, name)}
            />
            <p className="fine">Split bars show student counts. Change the chart metric to compare rates without a split.</p>
          </>
        ) : (
          <HBars
            data={bars}
            height={Math.max(280, bars.length * 34)}
            digits={metricMeta.digits}
            suffix={metric.endsWith("Pct") || metric === "share" ? "%" : ""}
            onPick={(name) => onPick(dim, name)}
          />
        )}
      </Panel>

      <Panel kicker="Table" title={`All ${ordered.length} groups`} hint="Click a column to sort. Click a row to filter.">
        <div className="table-scroll short">
          <table className="data">
            <thead>
              <tr>
                <th>{DIMENSIONS.find((item) => item.id === dim)?.label}</th>
                {METRICS.map((item) => (
                  <th key={item.id}>
                    <button type="button" className={sortMetric === item.id ? "on" : ""} onClick={() => setSortMetric(item.id)}>
                      {item.label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => (
                <tr key={row.key} onClick={() => onPick(dim, row.key)}>
                  <td>{row.key}</td>
                  {METRICS.map((item) => (
                    <td key={item.id} className={sortMetric === item.id ? "hot" : ""}>
                      {formatCell(row, item.id, item.digits)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function formatCell(row: AggRow, metric: Metric, digits: number): string {
  const value = metricOf(row, metric);
  if (metric === "medianAge" && row.medianAge == null) return "—";
  if (metric === "students" || metric === "schools") return fmt(value);
  if (metric.endsWith("Pct") || metric === "share") return pct(value, digits);
  return value.toFixed(digits);
}
