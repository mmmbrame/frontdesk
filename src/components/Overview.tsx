import { useMemo } from "react";
import { fmt, pct } from "../format";
import { admissionSeries, aggregate, cohort, colorFor, gradeGender, insights, type Summary } from "../query";
import { PROGRAM_ORDER, STAGE_ORDER, type Dim, type Filters, type Student } from "../types";
import { AdmissionArea, Donut, HBars, Legend } from "./Charts";
import { GradePyramid, Heatmap, Panel, Ribbon } from "./Visuals";

export function Overview({
  rows,
  summary,
  universe,
  filters,
  onPick,
  onYear,
  onCohort,
}: {
  rows: Student[];
  summary: Summary;
  universe: number;
  filters: Filters;
  onPick: (dim: Dim, value: string) => void;
  onYear: (value: string) => void;
  onCohort: (year: string, grade: string) => void;
}) {
  const cards = insights(rows, universe);
  const programs = useMemo(
    () =>
      aggregate(rows, "program").sort(
        (a, b) => PROGRAM_ORDER.indexOf(a.key) - PROGRAM_ORDER.indexOf(b.key),
      ),
    [rows],
  );
  const programChart = programs.map((row, index) => ({
    name: row.key,
    value: row.students,
    fill: colorFor("program", row.key, index),
  }));
  const districts = useMemo(
    () =>
      aggregate(rows, "district")
        .sort((a, b) => b.students - a.students)
        .slice(0, 12)
        .map((row, index) => ({ name: row.key, value: row.students, fill: colorFor("district", row.key, index) })),
    [rows],
  );
  const pyramid = useMemo(() => gradeGender(rows), [rows]);
  const years = useMemo(() => admissionSeries(rows), [rows]);
  const heat = useMemo(() => cohort(rows), [rows]);
  const stages = useMemo(() => {
    const grouped = aggregate(rows, "stage");
    return STAGE_ORDER.flatMap((key, index) => {
      const row = grouped.find((item) => item.key === key);
      return row ? [{ name: row.key, value: row.students, fill: colorFor("stage", row.key, index) }] : [];
    });
  }, [rows]);
  const religions = useMemo(
    () =>
      aggregate(rows, "religion")
        .sort((a, b) => b.students - a.students)
        .map((row, index) => ({ name: row.key, value: row.students, fill: colorFor("religion", row.key, index) })),
    [rows],
  );
  const inclusion = [
    { name: "Disability recorded", value: summary.disability, fill: "#c24d2c", dim: "disability" as Dim, pick: "Yes" },
    { name: "Disaster affected", value: summary.disaster, fill: "#2a527a", dim: "disaster" as Dim, pick: "Yes" },
    { name: "Afghan", value: summary.afghani, fill: "#6b4c9a", dim: "afghani" as Dim, pick: "Yes" },
    { name: "Missing B-Form", value: summary.missingBform, fill: "#c9922a", dim: "bform" as Dim, pick: "Missing" },
  ];

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Students" value={fmt(summary.students)} note={`${pct((summary.students / Math.max(universe, 1)) * 100)} of the atlas`} />
        <Kpi label="Schools" value={fmt(summary.schools)} note={`${fmt(summary.districts)} districts · ${fmt(summary.tehsils)} tehsils`} />
        <Kpi label="Female" value={pct(summary.femalePct)} note={`${fmt(summary.female)} girls · ${fmt(summary.male)} boys`} />
        <Kpi label="Median age" value={summary.medianAge == null ? "—" : summary.medianAge.toFixed(1)} note="As of 14 Oct 2026" />
        <Kpi label="B-Form on file" value={pct(summary.students ? ((summary.students - summary.missingBform) / summary.students) * 100 : 0)} note={`${fmt(summary.missingBform)} missing`} />
        <Kpi label="Disability" value={fmt(summary.disability)} note={pct(summary.students ? (summary.disability / summary.students) * 100 : 0)} />
        <Kpi label="Disaster affected" value={fmt(summary.disaster)} note={pct(summary.students ? (summary.disaster / summary.students) * 100 : 0)} />
        <Kpi label="Programs" value={fmt(summary.programs)} note={`${fmt(summary.early)} early years · ${fmt(summary.secondary)} secondary`} />
      </div>

      <div className="insights">
        {cards.map((card) => (
          <article key={card.kicker}>
            <p className="kicker">{card.kicker}</p>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      <Panel kicker="01" title="Program mix" hint="Click a segment to keep only that program. Click again to release it.">
        <Ribbon items={programChart} active={filters.program} onPick={(name) => onPick("program", name)} />
        <div className="split-2">
          <Donut data={programChart} total={summary.students} onPick={(name) => onPick("program", name)} />
          <Legend
            items={programChart.map((item) => ({
              name: item.name,
              fill: item.fill,
              note: fmt(item.value),
            }))}
          />
        </div>
      </Panel>

      <div className="grid-2">
        <Panel kicker="02" title="Grade pyramid" hint="Girls on the left, boys on the right. Click a grade.">
          <GradePyramid rows={pyramid} active={filters.grade} onPick={(grade) => onPick("grade", grade)} />
        </Panel>
        <Panel kicker="03" title="Where they are" hint="Top districts in the current view.">
          <HBars data={districts} height={Math.max(280, districts.length * 32)} onPick={(name) => onPick("district", name)} />
        </Panel>
      </div>

      <div className="grid-2">
        <Panel kicker="04" title="Admissions by year" hint="Stacked by gender. Click a year.">
          <AdmissionArea data={years} onPick={onYear} />
          <Legend
            items={[
              { name: "Female", fill: "#c24d2c" },
              { name: "Male", fill: "#2a527a" },
              { name: "Unknown", fill: "#a3988c" },
            ]}
          />
        </Panel>
        <Panel kicker="05" title="Stage" hint="Early years through secondary.">
          <HBars data={stages} height={240} onPick={(value) => onPick("stage", value)} />
        </Panel>
      </div>

      <div className="grid-2">
        <Panel kicker="07" title="Religion" hint="Spellings such as lslam and HINDUSIM are already folded in.">
          <HBars data={religions} height={220} onPick={(name) => onPick("religion", name)} />
        </Panel>
        <Panel kicker="08" title="Inclusion and records" hint="Click a bar to keep only that flag.">
          <HBars
            data={inclusion.map((item) => ({ name: item.name, value: item.value, fill: item.fill }))}
            height={220}
            onPick={(name) => {
              const item = inclusion.find((entry) => entry.name === name);
              if (item) onPick(item.dim, item.pick);
            }}
          />
        </Panel>
      </div>

      <Panel
        kicker="06"
        title="Admission year × current grade"
        hint="Each cell is a cohort still enrolled in that grade. Click a cell to isolate it."
      >
        <Heatmap years={heat.years} grades={heat.grades} cells={heat.cells} max={heat.max} onPick={onCohort} />
      </Panel>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="kpi">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}
