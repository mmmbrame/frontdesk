import { useEffect, useMemo, useRef, useState } from "react";
import { fmt } from "../format";
import { facetCounts, isFiltered } from "./query";
import type { Filters, ListKey, Presence, Staff } from "./types";

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
    title: "Staff",
    open: true,
    dims: [
      { dim: "gender", label: "Gender" },
      { dim: "family", label: "Role family" },
      { dim: "role", label: "Role" },
      { dim: "qualification", label: "Qualification" },
      { dim: "religion", label: "Religion" },
    ],
  },
  { title: "Workbook", dims: [{ dim: "source", label: "Sheet" }] },
];

export function StaffFilters({
  staff,
  filters,
  filteredCount,
  onToggle,
  onSetList,
  onPresence,
  onReset,
}: {
  staff: Staff[];
  filters: Filters;
  filteredCount: number;
  onToggle: (key: ListKey, value: string) => void;
  onSetList: (key: ListKey, values: string[]) => void;
  onPresence: (key: "cnic" | "contact" | "kin", value: Presence) => void;
  onReset: () => void;
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
              staff={staff}
              filters={filters}
              onToggle={onToggle}
              onSetList={onSetList}
            />
          ))}
        </details>
      ))}
      <details open>
        <summary>Records on file</summary>
        <PresenceSelect label="CNIC" value={filters.cnic} onChange={(value) => onPresence("cnic", value)} />
        <PresenceSelect label="Contact" value={filters.contact} onChange={(value) => onPresence("contact", value)} />
        <PresenceSelect label="Kin CNIC" value={filters.kin} onChange={(value) => onPresence("kin", value)} />
      </details>
      <div className="sidebar-foot">
        <button type="button" className="clear" onClick={onReset} disabled={!isFiltered(filters)}>
          Clear filters
        </button>
        <span>{fmt(filteredCount)} showing</span>
      </div>
    </div>
  );
}

function PresenceSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Presence;
  onChange: (value: Presence) => void;
}) {
  return (
    <label className="picker">
      <span>{label}</span>
      <select className="picker-btn" value={value} onChange={(event) => onChange(event.target.value as Presence)}>
        <option value="all">All</option>
        <option value="Present">Present</option>
        <option value="Missing">Missing</option>
      </select>
    </label>
  );
}

function Picker({
  label,
  dim,
  staff,
  filters,
  onToggle,
  onSetList,
}: {
  label: string;
  dim: ListKey;
  staff: Staff[];
  filters: Filters;
  onToggle: (key: ListKey, value: string) => void;
  onSetList: (key: ListKey, values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const options = useMemo(() => facetCounts(staff, filters, dim), [staff, filters, dim]);
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
        {selected.length === 0 ? `All ${label.toLowerCase()}` : selected.length <= 2 ? selected.join(", ") : `${selected.length} selected`}
      </button>
      {open ? (
        <div className="popover">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} />
          <button type="button" className="texty" onClick={() => onSetList(dim, [])}>
            Clear
          </button>
          <div className="popover-list">
            {visible.map((option) => (
              <label key={option.value}>
                <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(dim, option.value)} />
                <span>{option.value}</span>
                <em>{fmt(option.count)}</em>
              </label>
            ))}
            {!visible.length ? <p className="fine">No matches.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
