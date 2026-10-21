import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Donut, HBars } from "../components/Charts";
import { DataTable } from "../components/ui/data-table";
import { Panel } from "../components/Visuals";
import { downloadCsv, fmt, pct } from "../format";
import { CROSS_CUTTING, PROGRAMMES, RUNNERS, SDGS, THEMES, colorFor, type PartnerEntry } from "./catalog";
import { groupPartners, type PartnerKey, type PartnerSummary } from "./query";

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="kpi">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function bars(rows: { key: string; entries: number }[]) {
  return rows.map((row, index) => ({ name: row.key, value: row.entries, fill: colorFor(index) }));
}

export function Strength({
  rows,
  summary,
  universe,
  onPick,
}: {
  rows: PartnerEntry[];
  summary: PartnerSummary;
  universe: number;
  onPick: (key: PartnerKey, value: string) => void;
}) {
  const themes = useMemo(() => groupPartners(rows, "theme"), [rows]);
  const statuses = useMemo(() => groupPartners(rows, "status"), [rows]);
  const provinces = useMemo(() => groupPartners(rows, "province"), [rows]);
  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Demonstration entries" value={fmt(summary.entries)} note={`${pct((summary.entries / Math.max(universe, 1)) * 100)} of the partner register`} />
        <Kpi label="Students reached" value={fmt(summary.students)} note={`${fmt(summary.girls)} girls in these sample rows`} />
        <Kpi label="Teachers" value={fmt(summary.teachers)} note={`${fmt(summary.schools)} schools in the sample`} />
        <Kpi label="In process" value={fmt(summary.inProcess)} note={`${fmt(summary.provinces)} provinces · ${fmt(summary.districts)} districts`} />
      </div>

      <div className="runners">
        {RUNNERS.map((runner) => (
          <article key={runner.code}>
            <p className="kicker">{runner.code}</p>
            <h3>{runner.title}</h3>
            <p>{runner.sdgs}</p>
          </article>
        ))}
      </div>

      <details className="strength" open>
        <summary>Organizational strength</summary>
        <div className="strength-body">
          <section>
            <h3>Institutional profile</h3>
            <p>
              The partner brief presents PEN through eight education themes, eight ongoing programmes, and a seven-item funding pipeline. The five runners above are the flagship lines for a donor homepage.
            </p>
          </section>
          <section>
            <h3>Legal registration</h3>
            <p>The brief asks for legal registration. No registration number or registering authority was included in the document.</p>
          </section>
          <section>
            <h3>Geographic coverage</h3>
            <p>
              The brief names provinces, Khyber Pakhtunkhwa, the merged districts, and Gilgit-Baltistan. Punjab is named through the PEIMA partnership model. The demonstration rows use districts in those places.
            </p>
          </section>
          <section>
            <h3>Mission and education mandate</h3>
            <p>
              The mandate in the brief is access to quality education, girls’ education, digital learning through PEN Academy, teacher and school leadership, community engagement, inclusive education, school environments, and monitoring and learning.
            </p>
          </section>
        </div>
      </details>

      <div className="grid-2">
        <Panel kicker="Thematic expertise" title="Entries by theme" hint="Click a bar to keep that theme.">
          <HBars data={bars(themes)} height={320} onPick={(value) => onPick("theme", value)} />
        </Panel>
        <Panel kicker="Programme status" title="Previous, in process, upcoming" hint="Click a slice to keep that status.">
          <Donut
            center="entries"
            total={summary.entries}
            data={statuses.map((row, index) => ({ name: row.key, value: row.entries, fill: colorFor(index) }))}
            onPick={(value) => onPick("status", value)}
          />
        </Panel>
      </div>

      <Panel kicker="Where the sample sits" title="Entries by province" hint="Click a bar to keep that province.">
        <HBars data={bars(provinces)} height={220} onPick={(value) => onPick("province", value)} />
      </Panel>
    </div>
  );
}

export function Themes({ rows, onPick }: { rows: PartnerEntry[]; onPick: (key: PartnerKey, value: string) => void }) {
  const grouped = useMemo(() => groupPartners(rows, "theme"), [rows]);
  return (
    <div className="stack">
      <Panel kicker="Thematic expertise" title="Main themes and sub-themes" hint="Years of experience, school-project bands, beneficiaries, and geography are filters on the demonstration rows.">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Theme</th>
                <th>Entries</th>
                <th>Students</th>
                <th>Sub-themes in the brief</th>
              </tr>
            </thead>
            <tbody>
              {THEMES.map((theme) => {
                const group = grouped.find((row) => row.key === theme.name);
                return (
                  <tr key={theme.code} onClick={() => onPick("theme", theme.name)}>
                    <td>{theme.code}</td>
                    <td>{theme.name}</td>
                    <td>{fmt(group?.entries ?? 0)}</td>
                    <td>{fmt(group?.students ?? 0)}</td>
                    <td>{theme.subthemes.join("; ")}</td>
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

export function Programmes({ rows, onPick }: { rows: PartnerEntry[]; onPick: (key: PartnerKey, value: string) => void }) {
  const grouped = useMemo(() => groupPartners(rows, "programme"), [rows]);
  return (
    <div className="stack">
      <Panel kicker="Ongoing programmes" title="What the brief lists as current work" hint="Click a row to keep that programme.">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Programme</th>
                <th>Entries</th>
                <th>Students</th>
                <th>Organizational experience</th>
              </tr>
            </thead>
            <tbody>
              {PROGRAMMES.map((programme) => {
                const group = grouped.find((row) => row.key === programme.name);
                return (
                  <tr key={programme.code} onClick={() => onPick("programme", programme.name)}>
                    <td>{programme.code}</td>
                    <td>{programme.name}</td>
                    <td>{fmt(group?.entries ?? 0)}</td>
                    <td>{fmt(group?.students ?? 0)}</td>
                    <td>{programme.note}</td>
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

export function Pipeline({ rows, onPick }: { rows: PartnerEntry[]; onPick: (key: PartnerKey, value: string) => void }) {
  const grouped = useMemo(() => groupPartners(rows, "pipeline"), [rows]);
  return (
    <div className="stack">
      <Panel kicker="Funding pipeline" title="Upcoming project concepts" hint="Click a bar to keep that pipeline category. Outreach place comes from the demonstration row.">
        <HBars data={bars(grouped)} height={320} onPick={(value) => onPick("pipeline", value)} />
      </Panel>
    </div>
  );
}

export function Sdgs({ rows, onPick }: { rows: PartnerEntry[]; onPick: (key: PartnerKey, value: string) => void }) {
  const sdgGroups = useMemo(() => groupPartners(rows, "sdg"), [rows]);
  const crossGroups = useMemo(() => groupPartners(rows, "crossCutting"), [rows]);
  return (
    <div className="stack">
      <div className="grid-2">
        <Panel kicker="SDG alignment" title="Primary SDG on the demonstration rows" hint="Click a bar to keep that goal.">
          <HBars data={bars(sdgGroups)} height={360} onPick={(value) => onPick("sdg", value)} />
        </Panel>
        <Panel kicker="Cross-cutting" title="Safeguarding, gender, inclusion, climate" hint="Click a bar to keep that theme.">
          <HBars data={bars(crossGroups)} height={280} onPick={(value) => onPick("crossCutting", value)} />
        </Panel>
      </div>
      <Panel kicker="From the brief" title="SDGs the form can record">
        <p className="fine">Each demonstration row carries one primary SDG. The form also allows previous, in process, and upcoming as the status.</p>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Goal</th>
                <th>Entries</th>
              </tr>
            </thead>
            <tbody>
              {SDGS.map((sdg) => {
                const group = sdgGroups.find((row) => row.key === sdg.name);
                return (
                  <tr key={sdg.code} onClick={() => onPick("sdg", sdg.name)}>
                    <td>{sdg.code}</td>
                    <td>{sdg.name}</td>
                    <td>{fmt(group?.entries ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel kicker="Cross-cutting themes" title="Multi-select list in the brief">
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Theme</th>
                <th>Entries</th>
                <th>Students</th>
                <th>Teachers</th>
              </tr>
            </thead>
            <tbody>
              {CROSS_CUTTING.map((item) => {
                const group = crossGroups.find((row) => row.key === item.name);
                return (
                  <tr key={item.code} onClick={() => onPick("crossCutting", item.name)}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{fmt(group?.entries ?? 0)}</td>
                    <td>{fmt(group?.students ?? 0)}</td>
                    <td>{fmt(group?.teachers ?? 0)}</td>
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

const INDICATORS: { code: string; label: string; value: (summary: PartnerSummary) => number | null; note: string }[] = [
  { code: "KPI-01", label: "Schools supported or adopted", value: (summary) => summary.schools, note: "Sum of schools on the demonstration rows" },
  { code: "KPI-02", label: "Students enrolled or reached", value: (summary) => summary.students, note: "Sum of students on the demonstration rows" },
  { code: "KPI-03", label: "Girls reached", value: (summary) => summary.girls, note: "Girls counted inside those rows" },
  { code: "KPI-04", label: "Out-of-school children reached", value: (summary) => summary.outOfSchool, note: "Rows tagged to out-of-school or non-formal work" },
  { code: "KPI-05", label: "Teachers trained", value: (summary) => summary.teachers, note: "Sum of teachers on the demonstration rows" },
  { code: "KPI-06", label: "Schools receiving academic support", value: (summary) => summary.academicSchools, note: "Academic development rows" },
  { code: "KPI-07", label: "Students accessing digital learning", value: (summary) => summary.digitalStudents, note: "Digital learning and PEN Academy rows" },
  { code: "KPI-08", label: "Digital learning resources", value: (summary) => summary.digitalResources, note: "Resources counted on digital rows" },
  { code: "KPI-09", label: "Student attendance and retention rate", value: () => null, note: "The brief names the indicator. The demonstration rows do not carry a rate." },
  { code: "KPI-10", label: "Improvement in students", value: () => null, note: "The brief names the indicator. The demonstration rows do not carry a learning gain." },
  { code: "KPI-11", label: "Scholarships awarded", value: (summary) => summary.scholarships, note: "Scholarship programme rows" },
  { code: "KPI-12", label: "Schools with improved learning environments", value: (summary) => summary.improvedSchools, note: "Infrastructure theme rows" },
  { code: "KPI-13", label: "Parent and community engagement sessions", value: (summary) => summary.communitySessions, note: "Community participation rows" },
  { code: "KPI-14", label: "Programmes with safeguarding procedures", value: (summary) => summary.safeguarding, note: "Child safeguarding rows" },
  { code: "KPI-15", label: "Research, evaluation or learning products", value: (summary) => summary.researchProducts, note: "Research and monitoring rows" },
];

export function Results({ summary }: { summary: PartnerSummary }) {
  return (
    <div className="stack">
      <Panel kicker="Results and evidence" title="Indicators named in the partner brief" hint="Counts are totals of the demonstration rows in this view. They are not the student census.">
        <div className="table-scroll">
          <table className="data plain">
            <thead>
              <tr>
                <th>Code</th>
                <th>Indicator</th>
                <th>Demonstration total</th>
                <th>How it is counted</th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map((indicator) => {
                const value = indicator.value(summary);
                return (
                  <tr key={indicator.code}>
                    <td>{indicator.code}</td>
                    <td>{indicator.label}</td>
                    <td>{value == null ? "Not recorded" : fmt(value)}</td>
                    <td>{indicator.note}</td>
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

const COLUMNS: ColumnDef<PartnerEntry, unknown>[] = [
  { accessorKey: "id", header: "Entry" },
  { accessorKey: "theme", header: "Theme" },
  { accessorKey: "programme", header: "Programme" },
  { accessorKey: "province", header: "Province" },
  { accessorKey: "district", header: "District" },
  { accessorKey: "beneficiary", header: "Beneficiaries" },
  { accessorKey: "status", header: "Status" },
  { accessorKey: "students", header: "Students" },
  { accessorKey: "teachers", header: "Teachers" },
  { accessorKey: "schools", header: "Schools" },
];

export function Entries({ rows }: { rows: PartnerEntry[] }) {
  const [copied, setCopied] = useState(false);
  function exportRows() {
    downloadCsv("pen-potential-partner.csv", [
      ["Entry", "Theme", "Sub-theme", "Programme", "Pipeline", "Province", "District", "Beneficiaries", "Years", "School projects", "SDG", "Cross-cutting", "Status", "Students", "Girls", "Teachers", "Schools"],
      ...rows.map((row) => [
        row.id,
        row.theme,
        row.subtheme,
        row.programme,
        row.pipeline,
        row.province,
        row.district,
        row.beneficiary,
        row.years,
        row.schoolProjects,
        row.sdg,
        row.crossCutting,
        row.status,
        String(row.students),
        String(row.girls),
        String(row.teachers),
        String(row.schools),
      ]),
    ]);
    setCopied(true);
  }
  return (
    <div className="stack">
      <Panel
        kicker="Demonstration register"
        title={`${fmt(rows.length)} sample entries`}
        hint="One hundred and twenty rows fill the dropdowns in the partner brief. Export keeps the current filters."
        action={
          <button type="button" className="ghost" onClick={exportRows}>
            {copied ? "Exported" : "Export"}
          </button>
        }
      >
        <DataTable columns={COLUMNS} data={rows} numeric={["students", "teachers", "schools"]} />
      </Panel>
    </div>
  );
}
