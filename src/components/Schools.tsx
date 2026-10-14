import { useMemo, useState } from "react";
import { countLabel, fmt, pct } from "../format";
import { schoolGroups, type SchoolGroup } from "../query";
import type { Student, TabId } from "../types";
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
        <div className="table-scroll tall">
          <table className="data">
            <thead>
              <tr>
                <th>School</th>
                <th>Program</th>
                <th>District</th>
                <th>Tehsil</th>
                <th>Students</th>
                <th>Female</th>
                <th>Disability</th>
                <th>Missing B-Form</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((group) => (
                <tr key={group.key} className={selected === group.key ? "picked" : ""} onClick={() => setSelected(group.key)}>
                  <td>
                    <strong>{group.school}</strong>
                    <small>EMIS {group.emis || "—"}</small>
                  </td>
                  <td>{group.program}</td>
                  <td>{group.district}</td>
                  <td>{group.tehsil}</td>
                  <td>{fmt(group.students)}</td>
                  <td>{pct(group.students ? (group.female / group.students) * 100 : 0)}</td>
                  <td>{fmt(group.disability)}</td>
                  <td>{pct(group.students ? (group.missingBform / group.students) * 100 : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
