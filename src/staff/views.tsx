import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { countLabel, downloadCsv, escapeRegExp, fmt, pct } from "../format";
import { Donut, HBars, Legend } from "../components/Charts";
import { AddStaff } from "./AddStaff";
import { DataTable } from "../components/ui/data-table";
import { Panel, Ribbon } from "../components/Visuals";
import {
  aggregate,
  colorFor,
  duplicateCnics,
  formatMetric,
  metricOf,
  orderedAggregates,
  qualityScore,
  schoolRows,
  type AggRow,
  type SchoolRow,
  type Summary,
} from "./query";
import {
  DIMENSIONS,
  FAMILY_ORDER,
  METRICS,
  PROGRAM_ORDER,
  QUAL_ORDER,
  type Dim,
  type Filters,
  type ListKey,
  type Metric,
  type Staff,
  type StaffMeta,
} from "./types";

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="kpi">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function barsFor(rows: AggRow[], dim: string, metric: Metric = "people") {
  return rows.map((row, index) => ({
    name: row.key,
    value: metricOf(row, metric),
    fill: colorFor(dim, row.key, index),
  }));
}

export function Overview({
  rows,
  summary,
  universe,
  filters,
  onPick,
}: {
  rows: Staff[];
  summary: Summary;
  universe: number;
  filters: Filters;
  onPick: (dim: Dim, value: string) => void;
}) {
  const programs = useMemo(() => {
    const grouped = aggregate(rows, "program");
    return PROGRAM_ORDER.flatMap((key) => grouped.filter((row) => row.key === key));
  }, [rows]);
  const families = useMemo(() => {
    const grouped = aggregate(rows, "family");
    return FAMILY_ORDER.flatMap((key) => grouped.filter((row) => row.key === key));
  }, [rows]);
  const roles = useMemo(
    () =>
      aggregate(rows, "role")
        .sort((a, b) => b.people - a.people)
        .slice(0, 10),
    [rows],
  );
  const qualifications = useMemo(() => {
    const grouped = aggregate(rows, "qualification");
    return QUAL_ORDER.flatMap((key) => grouped.filter((row) => row.key === key));
  }, [rows]);
  const districts = useMemo(
    () =>
      aggregate(rows, "district")
        .sort((a, b) => b.people - a.people)
        .slice(0, 12),
    [rows],
  );
  const genders = useMemo(
    () => aggregate(rows, "gender").sort((a, b) => b.people - a.people),
    [rows],
  );
  const cnicOnFile = summary.people ? ((summary.people - summary.missingCnic) / summary.people) * 100 : 0;
  const contactOnFile = summary.people ? ((summary.people - summary.missingContact) / summary.people) * 100 : 0;
  const qualificationOnFile = summary.people ? ((summary.people - summary.missingQualification) / summary.people) * 100 : 0;

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Staff" value={fmt(summary.people)} note={`${pct((summary.people / Math.max(universe, 1)) * 100)} of the atlas`} />
        <Kpi label="Schools" value={fmt(summary.schools)} note={`${fmt(summary.districts)} districts · ${fmt(summary.tehsils)} tehsils`} />
        <Kpi label="Female" value={pct(summary.femalePct)} note={`${fmt(summary.female)} women · ${fmt(summary.male)} men`} />
        <Kpi label="Teaching" value={fmt(summary.teaching)} note={`${fmt(summary.leadership)} leadership · ${fmt(summary.support)} support`} />
        <Kpi label="CNIC on file" value={pct(cnicOnFile)} note={`${fmt(summary.missingCnic)} missing`} />
        <Kpi label="Contact on file" value={pct(contactOnFile)} note={`${fmt(summary.missingContact)} missing`} />
        <Kpi label="Qualification" value={pct(qualificationOnFile)} note={`${fmt(summary.masters)} at masters or above`} />
        <Kpi label="Programs" value={fmt(summary.programs)} note={`${fmt(summary.administration)} administration`} />
      </div>

      <Panel kicker="Programs" title="Where people are employed" hint="Click a band to keep that program.">
        <Ribbon
          items={programs.map((row, index) => ({ name: row.key, value: row.people, fill: colorFor("program", row.key, index) }))}
          active={filters.program}
          onPick={(value) => onPick("program", value)}
        />
        <Legend
          items={programs.map((row, index) => ({
            name: row.key,
            fill: colorFor("program", row.key, index),
            note: fmt(row.people),
          }))}
        />
      </Panel>

      <div className="grid-2">
        <Panel kicker="Role" title="Teaching, leadership, support" hint="Click a slice to filter.">
          <Donut
            data={barsFor(families, "family")}
            total={summary.people}
            center="staff"
            onPick={(name) => onPick("family", name)}
          />
          <Legend
            items={families.map((row, index) => ({
              name: row.key,
              fill: colorFor("family", row.key, index),
              note: pct(row.share),
            }))}
          />
        </Panel>
        <Panel kicker="Gender" title="Women and men" hint="Click a slice to filter.">
          <Donut
            data={barsFor(genders, "gender")}
            total={summary.people}
            center="staff"
            onPick={(name) => onPick("gender", name)}
          />
          <Legend
            items={genders.map((row, index) => ({
              name: row.key,
              fill: colorFor("gender", row.key, index),
              note: fmt(row.people),
            }))}
          />
        </Panel>
      </div>

      <div className="grid-2">
        <Panel kicker="Titles" title="Most common roles" hint="Click a bar to filter.">
          <HBars data={barsFor(roles, "role")} height={Math.max(220, roles.length * 36)} onPick={(name) => onPick("role", name)} />
        </Panel>
        <Panel kicker="Study" title="Highest qualification on file" hint="Illiterate is recorded as None. Blank and N/A stay Not recorded.">
          <HBars
            data={barsFor(qualifications, "qualification")}
            height={Math.max(220, qualifications.length * 36)}
            onPick={(name) => onPick("qualification", name)}
          />
        </Panel>
      </div>

      <Panel kicker="Place" title="Largest districts" hint="Click a district to filter the atlas.">
        <HBars
          data={barsFor(districts, "district")}
          height={Math.max(240, districts.length * 36)}
          onPick={(name) => onPick("district", name)}
        />
      </Panel>
    </div>
  );
}

export function Explore({ rows, onPick }: { rows: Staff[]; onPick: (dim: Dim, value: string) => void }) {
  const [dim, setDim] = useState<ListKey>("district");
  const [metric, setMetric] = useState<Metric>("people");
  const [top, setTop] = useState(12);
  const grouped = useMemo(() => orderedAggregates(aggregate(rows, dim), dim, metric), [rows, dim, metric]);
  const chartRows = grouped.slice(0, top);
  const bars = barsFor(chartRows, dim, metric);

  return (
    <div className="stack">
      <Panel
        kicker="Explorer"
        title="Any cut of the staff list"
        hint="Group the people, pick a metric, then click a name to filter the whole atlas."
      >
        <div className="controls">
          <label>
            Group by
            <select value={dim} onChange={(event) => setDim(event.target.value as ListKey)}>
              {DIMENSIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chart metric
            <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
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
        </div>
        <HBars
          data={bars}
          height={Math.max(240, bars.length * 36)}
          digits={metric === "people" || metric === "schools" ? 0 : 1}
          suffix={metric === "people" || metric === "schools" ? "" : "%"}
          onPick={(name) => onPick(dim, name)}
        />
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>{DIMENSIONS.find((item) => item.id === dim)?.label}</th>
                <th>Staff</th>
                <th>Share</th>
                <th>Schools</th>
                <th>Female</th>
                <th>Teaching</th>
                <th>Masters</th>
                <th>Missing CNIC</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((row) => (
                <tr key={row.key}>
                  <td>
                    <button type="button" className="texty" onClick={() => onPick(dim, row.key)}>
                      {row.key}
                    </button>
                  </td>
                  <td>{fmt(row.people)}</td>
                  <td>{pct(row.share)}</td>
                  <td>{fmt(row.schools)}</td>
                  <td>{pct(row.femalePct)}</td>
                  <td>{pct(row.teachingPct)}</td>
                  <td>{pct(row.mastersPct)}</td>
                  <td>{pct(row.missingCnicPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function Geography({ rows, onPick }: { rows: Staff[]; onPick: (dim: Dim, value: string) => void }) {
  const provinces = useMemo(() => aggregate(rows, "province").sort((a, b) => b.people - a.people), [rows]);
  const districts = useMemo(() => aggregate(rows, "district").sort((a, b) => b.people - a.people), [rows]);
  const tehsils = useMemo(
    () =>
      aggregate(rows, "tehsil")
        .sort((a, b) => b.people - a.people)
        .slice(0, 15),
    [rows],
  );

  return (
    <div className="stack">
      <div className="grid-2">
        <Panel kicker="Province" title="Punjab and Sindh" hint="Click a slice to filter.">
          <Donut data={barsFor(provinces, "province")} total={rows.length} center="staff" onPick={(name) => onPick("province", name)} />
        </Panel>
        <Panel kicker="Tehsil" title="Largest tehsils" hint="Click a bar to filter.">
          <HBars data={barsFor(tehsils, "tehsil")} height={Math.max(280, tehsils.length * 32)} onPick={(name) => onPick("tehsil", name)} />
        </Panel>
      </div>
      <Panel kicker="District" title="Staff by district" hint="Click a district to keep it.">
        <HBars data={barsFor(districts, "district")} height={Math.max(280, districts.length * 32)} onPick={(name) => onPick("district", name)} />
      </Panel>
    </div>
  );
}

export function Schools({
  rows,
  onOpen,
}: {
  rows: Staff[];
  onOpen: (school: string, district: string) => void;
}) {
  const schools = useMemo(() => schoolRows(rows), [rows]);
  const columns = useMemo<ColumnDef<SchoolRow, unknown>[]>(
    () => [
      { accessorKey: "school", header: "School" },
      { accessorKey: "district", header: "District" },
      { accessorKey: "tehsil", header: "Tehsil" },
      { accessorKey: "programs", header: "Program" },
      { accessorKey: "staff", header: "Staff" },
      { accessorKey: "teachers", header: "Teachers" },
      { accessorKey: "leaders", header: "Heads" },
      { accessorKey: "female", header: "Female" },
    ],
    [],
  );

  return (
    <Panel
      kicker="Directory"
      title={countLabel(schools.length, "school")}
      hint="A school is one name in one district. Click a row to open the people who work there."
    >
      <DataTable
        columns={columns}
        data={schools}
        pageSize={25}
        numeric={["staff", "teachers", "leaders", "female"]}
        onRowClick={(row) => onOpen(row.school, row.district)}
        emptyText="No schools match. Clear a filter."
      />
    </Panel>
  );
}

export function People({
  rows,
  query,
  catalog,
  onCreated,
}: {
  rows: Staff[];
  query: string;
  catalog: Staff[];
  onCreated: (person: Staff) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const tokens = useMemo(() => query.toLowerCase().split(/\s+/).filter((token) => token.length > 1), [query]);
  const columns = useMemo<ColumnDef<Staff, unknown>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <strong>{highlight(row.original.name, tokens)}</strong>
            <div className="text-xs text-muted-foreground">{row.original.role}</div>
          </div>
        ),
      },
      { id: "father", accessorKey: "father", header: "Father / husband", cell: ({ row }) => highlight(row.original.father || "—", tokens) },
      { id: "gender", accessorKey: "gender", header: "Gender" },
      { id: "qualification", accessorKey: "qualification", header: "Qualification", cell: ({ row }) => row.original.qualificationRaw || row.original.qualification },
      { id: "school", accessorKey: "school", header: "School", cell: ({ row }) => highlight(row.original.school, tokens) },
      { id: "district", accessorKey: "district", header: "District" },
      { id: "program", accessorKey: "program", header: "Program" },
      {
        id: "cnic",
        accessorKey: "cnic",
        header: "CNIC",
        cell: ({ row }) => <span className="font-mono text-xs">{highlight(row.original.cnic || "—", tokens)}</span>,
      },
      {
        id: "contact",
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => <span className="font-mono text-xs">{highlight(row.original.contact || "—", tokens)}</span>,
      },
    ],
    [tokens],
  );

  function exportCsv() {
    const header = [
      "Name",
      "Father / husband",
      "Gender",
      "Role",
      "Role family",
      "Qualification",
      "Qualification as recorded",
      "School",
      "EMIS",
      "District",
      "Tehsil",
      "Province",
      "Program",
      "System",
      "Donor",
      "CNIC",
      "Kin CNIC",
      "Contact",
      "Religion",
      "Year",
      "Sheet",
    ];
    const body = rows.map((person) => [
      person.name,
      person.father,
      person.gender,
      person.role,
      person.family,
      person.qualification,
      person.qualificationRaw,
      person.school,
      person.emis,
      person.district,
      person.tehsil,
      person.province,
      person.program,
      person.system,
      person.donor,
      person.cnic,
      person.kinCnic,
      person.contact,
      person.religion,
      person.year,
      person.source,
    ]);
    downloadCsv("pen-staff.csv", [header, ...body]);
  }

  return (
    <Panel
      kicker="Register"
      title={countLabel(rows.length, "person", "people")}
      hint="Search from the top bar matches name, father, CNIC, contact, EMIS, school, and place together."
      action={
        <div className="row-actions">
          <button type="button" className="solid" onClick={() => setOpen(true)}>
            Add staff
          </button>
          <button type="button" className="ghost" onClick={exportCsv}>
            Export this view
          </button>
        </div>
      }
    >
      {notice ? <p className="notice">{notice}</p> : null}
      <DataTable columns={columns} data={rows} pageSize={25} emptyText="No staff match. Clear a filter or try fewer words." />
      {open ? (
        <AddStaff
          catalog={catalog}
          onClose={() => setOpen(false)}
          onCreated={(person) => {
            onCreated(person);
            setNotice(`${person.name} was added to the atlas. Clear a filter if this view is hiding them.`);
          }}
        />
      ) : null}
    </Panel>
  );
}

export function Compare({ rows, onPick }: { rows: Staff[]; onPick: (dim: Dim, value: string) => void }) {
  const [dim, setDim] = useState<ListKey>("program");
  const groups = useMemo(() => orderedAggregates(aggregate(rows, dim), dim, "people").slice(0, 8), [rows, dim]);
  const bars = barsFor(groups, dim);

  return (
    <div className="stack">
      <Panel
        kicker="Compare"
        title="Put slices next to each other"
        hint="The highlighted cell is the highest value in that row. Click a column title to filter to it."
        action={
          <select value={dim} onChange={(event) => setDim(event.target.value as ListKey)}>
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
                          {formatMetric(metric.id, value)}
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

export function Quality({ meta, rows }: { meta: StaffMeta; rows: Staff[] }) {
  const quality = qualityScore(rows);
  const repeats = useMemo(() => duplicateCnics(rows).slice(0, 8), [rows]);

  return (
    <div className="stack">
      <div className="quality-hero">
        <div>
          <p className="kicker">Record quality</p>
          <h2>How complete is this view?</h2>
          <p>
            The score weights CNIC, contact, father or husband, qualification, gender, kin CNIC, and CNICs that appear
            more than once. It moves with the filters. Religion is left out because the Sindh sheet has no religion column.
          </p>
        </div>
        <div className="score">
          <strong>{quality.score}</strong>
          <span>out of 100</span>
        </div>
      </div>

      <div className="quality-bars">
        {quality.parts.map((part) => (
          <article key={part.label}>
            <div>
              <strong>{part.label}</strong>
              <span>
                {pct(part.rate * 100)} · {part.weight} points
              </span>
            </div>
            <i>
              <b style={{ width: `${Math.round(part.rate * 100)}%` }} />
            </i>
          </article>
        ))}
      </div>

      <Panel kicker="Workbook" title="What was counted" hint={meta.generatedFrom}>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Sheet</th>
                <th>Rows read</th>
                <th>Blank rows skipped</th>
                <th>In the atlas</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {meta.sheets.map((sheet) => (
                <tr key={sheet.sheet}>
                  <td>{sheet.sheet}</td>
                  <td>{fmt(sheet.rows)}</td>
                  <td>{fmt(sheet.blankRows)}</td>
                  <td>{fmt(sheet.included)}</td>
                  <td>{sheet.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-2">
        <Panel kicker="Cleanup" title="How the sheets were read">
          <ul className="notes">
            {meta.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {meta.placeAliases.length ? (
            <>
              <h3>Place names</h3>
              <ul className="notes">
                {meta.placeAliases.map((item) => (
                  <li key={item.change}>
                    {item.change} <em>{fmt(item.count)}</em>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Panel>
        <Panel
          kicker="Identity"
          title="CNICs that repeat"
          hint={
            quality.extra
              ? `${fmt(quality.extra)} extra rows share a CNIC with someone else in this view. They are kept, because the same person can appear at more than one school.`
              : "Every CNIC in this view is unique."
          }
        >
          {repeats.length ? (
            <ul className="notes">
              {repeats.map((item) => (
                <li key={item.cnic}>
                  <span className="font-mono">{item.cnic}</span> · {item.count} rows · {item.names.slice(0, 3).join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="fine">No repeated CNIC in this view.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function highlight(text: string, tokens: string[]) {
  if (!text || !tokens.length) return text;
  const pattern = new RegExp(tokens.map(escapeRegExp).join("|"), "ig");
  const parts: (string | { match: string; at: number })[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push({ match: match[0], at: index });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, index) =>
    typeof part === "string" ? (
      <span key={index}>{part}</span>
    ) : (
      <mark key={part.at}>{part.match}</mark>
    ),
  );
}
