import { useEffect, useMemo, useRef, useState } from "react";
import { Compare } from "./components/Compare";
import { Explore } from "./components/Explore";
import { Filters } from "./components/Filters";
import { Geography } from "./components/Geography";
import { Overview } from "./components/Overview";
import { Quality } from "./components/Quality";
import { Schools } from "./components/Schools";
import { Students } from "./components/Students";
import { fmt } from "./format";
import { loadDataset } from "./model";
import { activeChips, applyFilters, bounds, isFiltered, removeChip, summarize } from "./query";
import {
  EMPTY_FILTERS,
  LIST_KEYS,
  type Dataset,
  type Dim,
  type Filters as FilterState,
  type ListKey,
  type TabId,
  type Tri,
} from "./types";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "explore", label: "Explore" },
  { id: "geography", label: "Geography" },
  { id: "schools", label: "Schools" },
  { id: "students", label: "Students" },
  { id: "compare", label: "Compare" },
  { id: "quality", label: "Quality" },
];

function readFilters(): FilterState {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return EMPTY_FILTERS;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<FilterState>;
    const next: FilterState = { ...EMPTY_FILTERS, program: [], system: [], donor: [], project: [], source: [], province: [], district: [], tehsil: [], school: [], gender: [], grade: [], stage: [], stream: [], religion: [], admitYear: [], ageBand: [] };
    for (const key of LIST_KEYS) {
      const value = data[key];
      if (Array.isArray(value)) next[key] = value.filter((item): item is string => typeof item === "string");
    }
    if (typeof data.q === "string") next.q = data.q;
    if (data.disability === "Yes" || data.disability === "No" || data.disability === "Unknown") next.disability = data.disability;
    if (data.disaster === "Yes" || data.disaster === "No" || data.disaster === "Unknown") next.disaster = data.disaster;
    if (data.afghani === "Yes" || data.afghani === "No" || data.afghani === "Unknown") next.afghani = data.afghani;
    if (data.bform === "Present" || data.bform === "Missing") next.bform = data.bform;
    if (typeof data.ageMin === "number") next.ageMin = data.ageMin;
    if (typeof data.ageMax === "number") next.ageMax = data.ageMax;
    if (typeof data.admitMin === "number") next.admitMin = data.admitMin;
    if (typeof data.admitMax === "number") next.admitMax = data.admitMax;
    return next;
  } catch {
    return EMPTY_FILTERS;
  }
}

function writeFilters(filters: FilterState, edge: ReturnType<typeof bounds>): string {
  const data: Record<string, unknown> = {};
  for (const key of LIST_KEYS) if (filters[key].length) data[key] = filters[key];
  if (filters.q.trim()) data.q = filters.q;
  if (filters.disability !== "all") data.disability = filters.disability;
  if (filters.disaster !== "all") data.disaster = filters.disaster;
  if (filters.afghani !== "all") data.afghani = filters.afghani;
  if (filters.bform !== "all") data.bform = filters.bform;
  if (filters.ageMin != null) data.ageMin = filters.ageMin;
  if (filters.ageMax != null) data.ageMax = filters.ageMax;
  if (filters.admitMin != null && filters.admitMin !== edge.admitMin) data.admitMin = filters.admitMin;
  if (filters.admitMax != null && filters.admitMax !== edge.admitMax) data.admitMax = filters.admitMax;
  if (!Object.keys(data).length) return "";
  return encodeURIComponent(JSON.stringify(data));
}

function pickDim(filters: FilterState, dim: Dim, value: string): FilterState {
  if (dim === "disability" || dim === "disaster" || dim === "afghani") {
    return { ...filters, [dim]: filters[dim] === value ? "all" : (value as Tri) };
  }
  if (dim === "bform") {
    const next = value === "Missing" ? "Missing" : "Present";
    return { ...filters, bform: filters.bform === next ? "all" : next };
  }
  const key = dim as ListKey;
  const selected = filters[key];
  return {
    ...filters,
    [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
  };
}

function readModule(): TabId {
  const requested = new URLSearchParams(location.search).get("m");
  return TABS.some((item) => item.id === requested) ? (requested as TabId) : "overview";
}

export function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>(() => readFilters());
  const [tab, setTab] = useState<TabId>(() => readModule());
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 860);
  const [filterOpen, setFilterOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDataset()
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The atlas could not be opened."));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const edge = useMemo(() => (data ? bounds(data.students) : { admitMin: 2014, admitMax: 2026, ageMin: 3, ageMax: 22 }), [data]);
  const filtered = useMemo(() => (data ? applyFilters(data.students, filters) : []), [data, filters]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const chips = useMemo(() => activeChips(filters, edge), [filters, edge]);

  useEffect(() => {
    if (!data) return;
    const next = writeFilters(filters, edge);
    const current = location.hash.replace(/^#/, "");
    if (next !== current) {
      history.replaceState(null, "", next ? `${location.pathname}${location.search}#${next}` : `${location.pathname}${location.search}`);
    }
  }, [filters, edge, data]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("m") === tab) return;
    params.set("m", tab);
    history.replaceState(null, "", `${location.pathname}?${params.toString()}${location.hash}`);
  }, [tab]);

  function selectModule(next: TabId) {
    setTab(next);
    if (window.innerWidth <= 860) setSideOpen(false);
  }

  function toggle(key: ListKey, value: string) {
    setFilters((current) => pickDim(current, key, value));
  }

  if (error) {
    return (
      <main className="boot">
        <p className="kicker">PEN</p>
        <h1>The atlas did not open</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="boot">
        <p className="kicker">PEN · Academic year 2026</p>
        <h1>Enrollment Atlas</h1>
        <p>Reading 28,777 student records…</p>
      </main>
    );
  }

  return (
    <div className={sideOpen ? "shell" : "shell collapsed"}>
      <aside className={sideOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <p className="kicker">PEN · 2026</p>
          <strong>Enrollment Atlas</strong>
          <p>Choose a module. Filters apply to every page.</p>
        </div>
        <nav className="modules" aria-label="Modules">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "on" : ""} onClick={() => selectModule(item.id)}>
              {item.label}
              {item.id === "students" ? <em>{fmt(filtered.length)}</em> : null}
            </button>
          ))}
        </nav>
      </aside>
      {sideOpen && window.innerWidth <= 860 ? (
        <button className="scrim" type="button" aria-label="Close menu" onClick={() => setSideOpen(false)} />
      ) : null}

      <main className="main">
        <header className="top">
          <div>
            <p className="kicker">Enrollment atlas · academic year 2026</p>
            <h1>Every student, every cut.</h1>
            <p className="lede">
              PEIMA, PSRP-I, PSRP-II, Sindh PSP, evening schools, and adopted Punjab schools. Standalone PEIMA and PSRP-II
              sheets were already inside the combined Punjab extract, so they are not counted twice.
            </p>
          </div>
          <div className="search">
            <button type="button" className="ghost" onClick={() => setSideOpen((value) => !value)}>
              {sideOpen ? "Hide menu" : "Show menu"}
            </button>
            <input
              ref={searchRef}
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Search name, father, B-Form, EMIS, school, place"
              aria-label="Search students"
            />
            <span className="slash">/</span>
          </div>
        </header>

        <section className="filter-panel" aria-label="Filters">
          <div className="filter-panel-head">
            <div>
              <strong>Filters</strong>
              <span className="fine">
                {isFiltered(filters, edge)
                  ? `${chips.length} active. Clear a value to widen the results.`
                  : "Tick a value, or leave it clear to keep everyone."}
              </span>
            </div>
            <button type="button" className="ghost" onClick={() => setFilterOpen((value) => !value)}>
              {filterOpen ? "Hide filters" : "Show filters"}
            </button>
          </div>
          {filterOpen ? (
            <Filters
              students={data.students}
              filters={filters}
              filteredCount={filtered.length}
              edge={edge}
              active={isFiltered(filters, edge)}
              onToggle={toggle}
              onSetList={(key, values) => setFilters((current) => ({ ...current, [key]: values }))}
              onPatch={(partial) => setFilters((current) => ({ ...current, ...partial }))}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
          ) : null}
        </section>

        <div className="status">
          <strong>
            {fmt(filtered.length)} <em>of {fmt(data.students.length)}</em>
          </strong>
          <div className="chips">
            {chips.map((chip) => (
              <button key={chip.key} type="button" onClick={() => setFilters((current) => removeChip(current, chip.key))}>
                {chip.label} <span>×</span>
              </button>
            ))}
            {!chips.length ? <span className="fine">No filters yet. Click any chart to narrow the atlas.</span> : null}
          </div>
        </div>

        {tab === "overview" ? (
          <Overview
            rows={filtered}
            summary={summary}
            universe={data.students.length}
            filters={filters}
            onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))}
            onYear={(year) =>
              setFilters((current) => ({
                ...current,
                admitYear: current.admitYear.length === 1 && current.admitYear[0] === year ? [] : [year],
              }))
            }
            onCohort={(year, grade) =>
              setFilters((current) => {
                const same = current.admitYear.length === 1 && current.admitYear[0] === year && current.grade.length === 1 && current.grade[0] === grade;
                return same ? { ...current, admitYear: [], grade: [] } : { ...current, admitYear: [year], grade: [grade] };
              })
            }
          />
        ) : null}
        {tab === "explore" ? (
          <Explore rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "geography" ? (
          <Geography
            rows={filtered}
            onDistrict={(value) => toggle("district", value)}
            onTehsil={(value) => toggle("tehsil", value)}
            onSchool={(value) => toggle("school", value)}
            onProvince={(value) => toggle("province", value)}
          />
        ) : null}
        {tab === "schools" ? (
          <Schools
            rows={filtered}
            onOpenStudents={(school) => {
              setFilters((current) => ({ ...current, school: [school] }));
              setTab("students");
            }}
          />
        ) : null}
        {tab === "students" ? <Students rows={filtered} query={filters.q} /> : null}
        {tab === "compare" ? (
          <Compare rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "quality" ? <Quality meta={data.meta} rows={filtered} summary={summary} /> : null}
      </main>
    </div>
  );
}
