import { useEffect, useMemo, useState } from "react";
import { fmt } from "../format";
import { staffBrief, studentBrief } from "../report/brief";
import type { Staff } from "../staff/types";
import type { Student } from "../types";
import type { ReportBrief, WrittenReport } from "../../shared/report";

const STUDENT_PROMPTS = [
  "Where do girls and boys differ most?",
  "Which places are missing B-Forms?",
  "How does age vary by program and district?",
  "Where is secondary enrolment concentrated?",
  "Compare disability and disaster flags across programs",
];

const STAFF_PROMPTS = [
  "Where is the teaching staff concentrated?",
  "Which programs are missing CNICs or phone numbers?",
  "How do qualifications differ by role and district?",
  "Where is the gender mix most uneven?",
  "Compare leadership and support staff across programs",
];

function ReportScreen({
  noun,
  universe,
  filters,
  prompts,
  brief,
  question,
  onQuestion,
}: {
  noun: string;
  universe: number;
  filters: string[];
  prompts: string[];
  brief: ReportBrief;
  question: string;
  onQuestion: (value: string) => void;
}) {
  const [report, setReport] = useState<WrittenReport | null>(null);
  const [error, setError] = useState("");
  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setReport(null);
    setError("");
    setCopied(false);
  }, [brief]);

  async function write() {
    setWriting(true);
    setError("");
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, brief }),
      });
      const body = (await response.json()) as { report?: WrittenReport; error?: string };
      if (!response.ok || !body.report) throw new Error(body.error || "The report could not be written.");
      setReport(body.report);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "The report could not be written.");
    } finally {
      setWriting(false);
    }
  }

  async function copy() {
    if (!report) return;
    const sections = report.sections.map((section) => `${section.heading}\n${section.finding}\n${section.why}`).join("\n\n");
    const caveats = report.caveats.length ? `\n\nCaveats\n${report.caveats.map((item) => `- ${item}`).join("\n")}` : "";
    await navigator.clipboard.writeText(`${report.title}\n\n${report.lede}\n\n${sections}${caveats}`);
    setCopied(true);
  }

  const scope = filters.length ? `Filtered by ${filters.join(", ")}.` : `Full census, ${fmt(universe)} ${noun}.`;

  return (
    <section className="stack">
      <header>
        <p className="kicker">Report</p>
        <h2>What this view can show</h2>
        <p className="lede">
          The atlas scores the comparisons in the current filters, then writes a briefing from those figures. Type a requirement to aim it.
        </p>
      </header>

      <div className="panel report-ask">
        <label className="report-label">
          <span>Describe the report</span>
          <textarea
            value={question}
            maxLength={500}
            placeholder="Ask for a comparison, a place, or a metric. Leave this blank and the briefing uses the strongest cuts."
            onChange={(event) => onQuestion(event.target.value)}
          />
        </label>
        <div className="chips">
          {prompts.map((prompt) => (
            <button key={prompt} type="button" className={question === prompt ? "on" : undefined} onClick={() => onQuestion(question === prompt ? "" : prompt)}>
              {prompt}
            </button>
          ))}
        </div>
        <div className="report-actions">
          <button type="button" className="solid" disabled={!brief.total || writing} onClick={() => void write()}>
            {writing ? "Writing…" : "Write the report"}
          </button>
          <span className="fine">
            {fmt(brief.total)} {noun} in this view. {scope}
          </span>
        </div>
      </div>

      {error ? <p className="notice">{error}</p> : null}

      {report ? (
        <article className="panel">
          <div className="panel-head">
            <div>
              <p className="kicker">Briefing</p>
              <h2>{report.title}</h2>
            </div>
            <button type="button" className="ghost" onClick={() => void copy()}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="lede">{report.lede}</p>
          <div className="report-sections">
            {report.sections.map((section) => (
              <article key={section.heading}>
                <h3>{section.heading}</h3>
                <p>{section.finding}</p>
                <p className="fine">{section.why}</p>
              </article>
            ))}
          </div>
          {report.caveats.length ? (
            <ul className="report-caveats">
              {report.caveats.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      <div>
        <h2>Useful cuts</h2>
        <p className="fine">A wider gap, among groups large enough to matter, ranks higher. A question moves the matching cuts up.</p>
        {brief.angles.length ? (
          <div className="report-angles">
            {brief.angles.map((angle) => (
              <article key={`${angle.dimension}:${angle.metric}`} className={angle.dimension === "Combination" ? "wide" : undefined}>
                <p className="kicker">{angle.dimension}</p>
                <h3>{angle.metric}</h3>
                <p>{angle.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="fine">This view is too small, or the groups are too similar, for a comparison. The overview figures can still be written up.</p>
        )}
      </div>

      {brief.tables.map((table) => (
        <article className="panel" key={table.title}>
          <div className="panel-head">
            <h2>{table.title}</h2>
          </div>
          <div className="table-scroll">
            <table className="data plain">
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={`${table.title}-${rowIndex}`}>
                    {row.map((cell, index) => (
                      <td key={`${cell}-${index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}

export function StudentReport({ rows, universe, chips }: { rows: Student[]; universe: number; chips: { label: string }[] }) {
  const [question, setQuestion] = useState("");
  const filters = useMemo(() => chips.map((chip) => chip.label), [chips]);
  const brief = useMemo(() => studentBrief(rows, universe, filters, question), [rows, universe, filters, question]);
  return <ReportScreen noun="students" universe={universe} filters={filters} prompts={STUDENT_PROMPTS} brief={brief} question={question} onQuestion={setQuestion} />;
}

export function StaffReport({ rows, universe, chips }: { rows: Staff[]; universe: number; chips: { label: string }[] }) {
  const [question, setQuestion] = useState("");
  const filters = useMemo(() => chips.map((chip) => chip.label), [chips]);
  const brief = useMemo(() => staffBrief(rows, universe, filters, question), [rows, universe, filters, question]);
  return <ReportScreen noun="staff" universe={universe} filters={filters} prompts={STAFF_PROMPTS} brief={brief} question={question} onQuestion={setQuestion} />;
}
