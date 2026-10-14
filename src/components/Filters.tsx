import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../format";
import { facetCounts } from "../query";
import type { Filters, ListKey, Student, TriFilter } from "../types";

const GROUPS: { title: string; open?: boolean; dims: { dim: ListKey; label: string }[] }[] = [
  {
    title: "Program",
    open: true,
    dims: [
      { dim: "program", label: "Program" },
      { dim: "system", label: "System" },
      { dim: "donor", label: "Donor" },
    ],
  },
  {
    title: "Place",
    open: true,
    dims: [
      { dim: "province", label: "Province" },
      { dim: "district", label: "District" },
      { dim: "tehsil", label: "Tehsil" },
      { dim: "school", label: "School" },
    ],
  },
  {
    title: "Student",
    open: true,
    dims: [
      { dim: "gender", label: "Gender" },
      { dim: "stage", label: "Stage" },
      { dim: "grade", label: "Grade" },
      { dim: "religion", label: "Religion" },
      { dim: "stream", label: "Stream" },
    ],
  },
  {
    title: "Workbook",
    dims: [
      { dim: "source", label: "Source" },
      { dim: "project", label: "Project" },
      { dim: "ageBand", label: "Age band" },
    ],
  },
];

export function Filters({
  students,
  filters,
  filteredCount,
  edge,
  onToggle,
  onSetList,
  onPatch,
  onReset,
  active,
}: {
  students: Student[];
  filters: Filters;
  filteredCount: number;
  edge: { admitMin: number; admitMax: number; ageMin: number; ageMax: number };
  onToggle: (key: ListKey, value: string) => void;
  onSetList: (key: ListKey, values: string[]) => void;
  onPatch: (partial: Partial<Filters>) => void;
  onReset: () => void;
  active: boolean;
}) {
  return (
    <div className="filters">
      {GROUPS.map((group) => (
        <details key={group.title} open={group.open}>
          <summary>{group.title}</summary>
          {group.dims.map((item) => (
            <Picker
              key={item.dim}
              label={item.label}
              dim={item.dim}
              students={students}
              filters={filters}
              onToggle={onToggle}
              onSetList={onSetList}
            />
          ))}
        </details>
      ))}

      <details open>
        <summary>Flags</summary>
        <Flag
          label="Disability"
          value={filters.disability}
          options={["all", "Yes", "No", "Unknown"]}
          onChange={(disability) => onPatch({ disability: disability as TriFilter })}
        />
        <Flag
          label="Disaster affected"
          value={filters.disaster}
          options={["all", "Yes", "No", "Unknown"]}
          onChange={(disaster) => onPatch({ disaster: disaster as TriFilter })}
        />
        <Flag
          label="Afghan"
          value={filters.afghani}
          options={["all", "Yes", "No", "Unknown"]}
          onChange={(afghani) => onPatch({ afghani: afghani as TriFilter })}
        />
        <Flag
          label="B-Form"
          value={filters.bform}
          options={["all", "Present", "Missing"]}
          onChange={(bform) => onPatch({ bform: bform as Filters["bform"] })}
        />
      </details>

      <details open>
        <summary>Ranges</summary>
        <Range
          label="Admission year"
          min={edge.admitMin}
          max={edge.admitMax}
          from={filters.admitMin ?? edge.admitMin}
          to={filters.admitMax ?? edge.admitMax}
          onChange={(from, to) =>
            onPatch(
              from <= edge.admitMin && to >= edge.admitMax
                ? { admitMin: null, admitMax: null }
                : { admitMin: from, admitMax: to },
            )
          }
        />
        <Range
          label="Age on 14 Oct 2026"
          min={edge.ageMin}
          max={edge.ageMax}
          from={filters.ageMin ?? edge.ageMin}
          to={filters.ageMax ?? edge.ageMax}
          onChange={(from, to) =>
            onPatch(
              from <= edge.ageMin && to >= edge.ageMax
                ? { ageMin: null, ageMax: null }
                : { ageMin: from, ageMax: to },
            )
          }
        />
        <p className="fine">An age range hides students with no date of birth.</p>
      </details>

      <div className="sidebar-foot">
        <button type="button" className="clear" onClick={onReset} disabled={!active}>
          Clear filters
        </button>
        <span>{fmt(filteredCount)} showing</span>
      </div>
    </div>
  );
}

function Picker({
  label,
  dim,
  students,
  filters,
  onToggle,
  onSetList,
}: {
  label: string;
  dim: ListKey;
  students: Student[];
  filters: Filters;
  onToggle: (key: ListKey, value: string) => void;
  onSetList: (key: ListKey, values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const options = useMemo(() => facetCounts(students, filters, dim), [students, filters, dim]);
  const selected = filters[dim];
  const visible = options.filter((option) => option.value.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="picker" ref={box}>
      <span>{label}</span>
      <button type="button" className="picker-btn" onClick={() => setOpen((value) => !value)}>
        {selected.length === 0
          ? `All ${label.toLowerCase()}`
          : selected.length <= 2
            ? selected.join(", ")
            : `${selected.length} selected`}
      </button>
      {open ? (
        <div className="popover">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} />
          <button type="button" className="texty" onClick={() => onSetList(dim, [])}>
            Clear
          </button>
          <div className="popover-list">
            {visible.map((option) => {
              const on = selected.includes(option.value);
              return (
                <label key={option.value}>
                  <input type="checkbox" checked={on} onChange={() => onToggle(dim, option.value)} />
                  <span>{option.value}</span>
                  <em>{fmt(option.count)}</em>
                </label>
              );
            })}
            {!visible.length ? <p className="fine">No matches.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Flag({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flag">
      <span>{label}</span>
      <div className="segment">
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? "on" : ""} onClick={() => onChange(option)}>
            {option === "all" ? "All" : option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  from,
  to,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  return (
    <div className="range">
      <div className="range-top">
        <span>{label}</span>
        <strong>
          {from}–{to}
        </strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={from}
        onChange={(event) => onChange(Math.min(Number(event.target.value), to), to)}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={to}
        onChange={(event) => onChange(from, Math.max(Number(event.target.value), from))}
      />
    </div>
  );
}
