import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { countLabel, fmt, pct } from "../format";
import { schoolGroups, type SchoolGroup } from "../query";
import type { Student, TabId } from "../types";
import { DataTable } from "./ui/data-table";
import { Panel } from "./Visuals";

export function Schools({
  rows,
  onOpenStudents,
}: {
  rows: Student[];
  onOpenStudents: (school: string, tab: TabId) => void;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const groups = useMemo(() => schoolGroups(rows), [rows]);
  const visible = groups.filter((group) =>
    `${group.school} ${group.district} ${group.tehsil} ${group.program} ${group.emis}`.toLowerCase().includes(q.toLowerCase()),
  );
  const current = groups.find((group) => group.key === selected) ?? null;

  const columns = useMemo<ColumnDef<SchoolGroup, unknown>[]>(
    () => [
      {
        id: "school",
        accessorKey: "school",
        header: "School",
        cell: ({ row }) => (
          <div>
            <strong>{row.original.school}</strong>
            <div className="text-xs text-muted-foreground">EMIS {row.original.emis || "—"}</div>
          </div>
        ),
      },
      { id: "program", accessorKey: "program", header: "Program" },
      { id: "district", accessorKey: "district", header: "District" },
      { id: "tehsil", accessorKey: "tehsil", header: "Tehsil" },
      { id: "students", accessorKey: "students", header: "Students", cell: ({ getValue }) => fmt(getValue<number>()) },
      {
        id: "female",
        accessorFn: (group) => (group.students ? (group.female / group.students) * 100 : 0),
        header: "Female",
        cell: ({ getValue }) => pct(getValue<number>()),
      },
      { id: "disability", accessorKey: "disability", header: "Disability", cell: ({ getValue }) => fmt(getValue<number>()) },
      {
        id: "missingBform",
        accessorFn: (group) => (group.students ? (group.missingBform / group.students) * 100 : 0),
        header: "Missing B-Form",
        cell: ({ getValue }) => pct(getValue<number>()),
      },
    ],
    [],
  );

  return (
    <div className="stack school-layout">
      <Panel
        kicker="Directory"
        title={`${countLabel(groups.length, "school")} in this view`}
        hint="Grouped by EMIS, school, and program so a shared building does not collapse two programs."
        action={
          <input
            className="grow"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Find a school, district, or EMIS"
          />
        }
      >
        <DataTable
          columns={columns}
          data={visible}
          pageSize={25}
          numeric={["students", "female", "disability", "missingBform"]}
          onRowClick={(group) => setSelected(group.key)}
          isSelected={(group) => group.key === selected}
          emptyText="No schools match this search."
        />
      </Panel>
      {current ? <Profile group={current} onOpen={() => onOpenStudents(current.school, "students")} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function Profile({ group, onOpen, onClose }: { group: SchoolGroup; onOpen: () => void; onClose: () => void }) {
  const max = Math.max(...group.grades.map((grade) => grade.count), 1);
  return (
    <aside className="profile">
      <button type="button" className="texty" onClick={onClose}>
        Close
      </button>
      <p className="kicker">{group.program}</p>
      <h2>{group.school}</h2>
      <p className="hint">
        {group.district} · {group.tehsil}
        <br />
        EMIS {group.emis || "—"} · {group.system} · {group.donor}
      </p>
      <div className="profile-stats">
        <span>
          <strong>{fmt(group.students)}</strong> students
        </span>
        <span>
          <strong>{pct(group.students ? (group.female / group.students) * 100 : 0)}</strong> female
        </span>
        <span>
          <strong>{fmt(group.disability)}</strong> disability
        </span>
        <span>
          <strong>{fmt(group.disaster)}</strong> disaster
        </span>
      </div>
      <h3>Grades</h3>
      <div className="grade-bars">
        {group.grades.map((grade) => (
          <div key={grade.grade}>
            <span>{grade.grade}</span>
            <i>
              <b style={{ width: `${(grade.count / max) * 100}%` }} />
            </i>
            <em>{grade.count}</em>
          </div>
        ))}
      </div>
      <button type="button" className="solid" onClick={onOpen}>
        Open these students
      </button>
    </aside>
  );
}
