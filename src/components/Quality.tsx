import { duplicateStats, qualityScore, type Summary } from "../query";
import type { Meta, Student } from "../types";
import { fmt, pct } from "../format";
import { Panel } from "./Visuals";

export function Quality({ meta, rows, summary }: { meta: Meta; rows: Student[]; summary: Summary }) {
  const duplicates = duplicateStats(rows);
  const quality = qualityScore(summary, duplicates.extra);
  const implausible = rows.filter((student) => student.age >= 0 && (student.age < 3 || student.age > 22)).slice(0, 8);

  return (
    <div className="stack">
      <div className="quality-hero">
        <div>
          <p className="kicker">Record quality</p>
          <h2>How complete is this view?</h2>
          <p>
            The score weights missing B-Forms, dates, gender, father names, and repeated identity rows. It moves with the
            filters.
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
              <span>{part.value}</span>
            </div>
            <i>
              <b style={{ width: `${Math.max(0, 100 - (part.penalty / part.weight) * 100)}%` }} />
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
                <th>Rows</th>
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
                  <td>{sheet.included ? "Yes" : "No"}</td>
                  <td>{sheet.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-2">
        <Panel kicker="Cleanup" title="Spellings that were aligned">
          <ul className="notes">
            {meta.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <h3>Place names</h3>
          <ul className="notes">
            {meta.placeAliases.map((item) => (
              <li key={item.change}>
                {item.change} <em>{fmt(item.count)}</em>
              </li>
            ))}
          </ul>
          <h3>Religion</h3>
          <ul className="notes">
            {meta.religionFixes.map((item) => (
              <li key={item.change}>
                {item.change} <em>{fmt(item.count)}</em>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel kicker="Duplicates" title={`${fmt(duplicates.groups)} repeated identities`} hint={`${fmt(duplicates.extra)} extra rows share EMIS, name, father, and B-Form. They are kept, because they may be genuine re-entries.`}>
          <ul className="notes">
            {duplicates.samples.map((sample) => (
              <li key={`${sample.name}-${sample.school}`}>
                {sample.name}
                {sample.father ? ` · ${sample.father}` : ""} · {sample.school} · {sample.count} rows
              </li>
            ))}
            {!duplicates.samples.length ? <li>None in this view.</li> : null}
          </ul>
          <h3>Ages outside 3–22</h3>
          <ul className="notes">
            {implausible.map((student) => (
              <li key={`${student.name}-${student.dob}`}>
                {student.name} · age {student.age} · {student.dob} · {student.school}
              </li>
            ))}
            {!implausible.length ? <li>None in this view.</li> : null}
          </ul>
          <p className="fine">
            Missing dates of birth in this view: {fmt(summary.missingDob)} ({pct(summary.students ? (summary.missingDob / summary.students) * 100 : 0)}).
            Unknown grades: {fmt(meta.unknownGrade)} in the full file.
          </p>
        </Panel>
      </div>
    </div>
  );
}
