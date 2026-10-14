import type { ReactNode } from "react";
import { fmt } from "../format";
import { GRADE_ORDER } from "../types";

export function Panel({
  kicker,
  title,
  hint,
  action,
  children,
}: {
  kicker?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h2>{title}</h2>
          {hint ? <p className="hint">{hint}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function GradePyramid({
  rows,
  active,
  onPick,
}: {
  rows: { grade: string; female: number; male: number }[];
  active: string[];
  onPick: (grade: string) => void;
}) {
  const ordered = GRADE_ORDER.map((grade) => rows.find((row) => row.grade === grade)).filter(
    (row): row is { grade: string; female: number; male: number } => Boolean(row),
  );
  const max = Math.max(1, ...ordered.map((row) => Math.max(row.female, row.male)));
  return (
    <div className="pyramid" role="list">
      <div className="pyramid-key">
        <span className="female">Female</span>
        <span>Grade</span>
        <span className="male">Male</span>
      </div>
      {ordered.map((row) => {
        const on = active.includes(row.grade);
        return (
          <button
            key={row.grade}
            type="button"
            className={on ? "pyramid-row on" : "pyramid-row"}
            onClick={() => onPick(row.grade)}
          >
            <span className="count female">{fmt(row.female)}</span>
            <span className="track left">
              <i style={{ width: `${(row.female / max) * 100}%` }} />
            </span>
            <span className="grade">{row.grade}</span>
            <span className="track right">
              <i style={{ width: `${(row.male / max) * 100}%` }} />
            </span>
            <span className="count male">{fmt(row.male)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Heatmap({
  years,
  grades,
  cells,
  max,
  onPick,
}: {
  years: string[];
  grades: string[];
  cells: number[][];
  max: number;
  onPick: (year: string, grade: string) => void;
}) {
  if (!years.length) return <p className="empty">No admission dates in this view.</p>;
  return (
    <div className="heat-scroll">
      <div
        className="heat"
        style={{ gridTemplateColumns: `72px repeat(${grades.length}, minmax(34px, 1fr))` }}
      >
        <div />
        {grades.map((grade) => (
          <div key={grade} className="heat-h">
            {grade}
          </div>
        ))}
        {years.map((year, rowIndex) => (
          <div key={year} className="heat-line">
            <div className="heat-y">{year}</div>
            {grades.map((grade, columnIndex) => {
              const value = cells[rowIndex]?.[columnIndex] ?? 0;
              const tone = max ? value / max : 0;
              return (
                <button
                  key={grade}
                  type="button"
                  className="heat-cell"
                  style={{
                    background: value ? `rgba(14, 107, 87, ${0.12 + tone * 0.88})` : "transparent",
                    color: tone > 0.62 ? "#f7f3ec" : "var(--heat-ink)",
                  }}
                  onClick={() => onPick(year, grade)}
                  title={`${year} · ${grade}: ${fmt(value)}`}
                >
                  {value || ""}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Ribbon({
  items,
  active,
  onPick,
}: {
  items: { name: string; value: number; fill: string }[];
  active: string[];
  onPick: (name: string) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div className="ribbon" role="list">
      {items.map((item) => {
        const share = (item.value / total) * 100;
        const on = active.includes(item.name);
        return (
          <button
            key={item.name}
            type="button"
            className={on ? "on" : ""}
            style={{ width: `${share}%`, background: item.fill }}
            onClick={() => onPick(item.name)}
            title={`${item.name}: ${fmt(item.value)} (${share.toFixed(1)}%)`}
          >
            {share > 9 ? item.name : ""}
          </button>
        );
      })}
    </div>
  );
}
