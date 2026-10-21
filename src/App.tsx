import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Database,
  FileSpreadsheet,
  GitCompare,
  LayoutDashboard,
  Map as MapIcon,
  Moon,
  Sun,
  LayoutGrid,
  PanelLeft,
  School,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Compare } from "./components/Compare";
import { Explore } from "./components/Explore";
import { Filters } from "./components/Filters";
import { Geography } from "./components/Geography";
import { Overview } from "./components/Overview";
import { Quality } from "./components/Quality";
import { StudentReport } from "./components/ReportView";
import { Schools } from "./components/Schools";
import { StudentWorkbook } from "./components/Workbook";
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

const NAV: { label: string; items: { id: TabId; label: string; icon: LucideIcon }[] }[] = [
  { label: "Dashboard", items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Analysis",
    items: [
      { id: "explore", label: "Explore", icon: Compass },
      { id: "geography", label: "Geography", icon: MapIcon },
      { id: "compare", label: "Compare", icon: GitCompare },
      { id: "report", label: "Report", icon: Sparkles },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "schools", label: "Schools", icon: School },
      { id: "students", label: "Students", icon: Users },
      { id: "sheets", label: "Sheets", icon: FileSpreadsheet },
    ],
  },
  { label: "Data", items: [{ id: "quality", label: "Quality", icon: ShieldCheck }] },
];

const TABS: { id: TabId; label: string }[] = NAV.flatMap((group) => group.items.map(({ id, label }) => ({ id, label })));

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

export function App({ onHome }: { onHome?: () => void }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [filters, setFilters] = useState<FilterState>(() => readFilters());
  const [tab, setTab] = useState<TabId>(() => readModule());
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 860);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDataset()
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "The atlas could not be opened.");
      });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("atlas-theme", dark ? "dark" : "light");
    } catch {
      // Storage can be blocked; the theme still works for this visit.
    }
  }, [dark]);

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
      <aside className={sideOpen ? "sidebar open" : "sidebar collapsed"}>
        <div className="sidebar-brand">
          <span className="logo" aria-hidden="true">
            <Database size={16} />
          </span>
          <div>
            <strong>PEN Atlas</strong>
            <span>Enrollment 2026</span>
          </div>
        </div>
        <nav className="nav" aria-label="Modules">
          {NAV.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? "nav-link on" : "nav-link"}
                    data-label={item.label}
                    aria-label={item.label}
                    onClick={() => selectModule(item.id)}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                    {item.id === "students" ? <em>{fmt(filtered.length)}</em> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="nav-group sidebar-actions">
          {onHome ? (
            <button type="button" className="nav-link" data-label="Choose records" aria-label="Choose records" onClick={onHome}>
              <LayoutGrid size={16} />
              <span>Choose records</span>
            </button>
          ) : null}
          <button
            type="button"
            className="nav-link"
            data-label={dark ? "Light mode" : "Dark mode"}
            aria-label={dark ? "Light mode" : "Dark mode"}
            onClick={() => setDark((value) => !value)}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span>{dark ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>
      {sideOpen && window.innerWidth <= 860 ? (
        <button className="scrim" type="button" aria-label="Close menu" onClick={() => setSideOpen(false)} />
      ) : null}

      <main className="main">
        <div className="content-bar">
          <button
            type="button"
            className="icon-btn"
            aria-label={sideOpen ? "Hide sidebar" : "Show sidebar"}
            title={sideOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={() => setSideOpen((value) => !value)}
          >
            <PanelLeft size={18} />
          </button>
          <span className="crumb">
            Enrollment Atlas / <strong>{TABS.find((item) => item.id === tab)?.label}</strong>
          </span>
        </div>
        <header className="top">
          <div>
            <p className="kicker">Enrollment atlas · academic year 2026</p>
            <h1>Every student, every cut.</h1>
            <p className="lede">
              PEIMA, PSRP-I, PSRP-II, Sindh PSP, evening schools, and adopted Punjab schools. Standalone PEIMA and PSRP-II
              sheets were already inside the combined Punjab extract, so they are not counted twice.
            </p>
          </div>
          <div className="top-tools">
            <div className="search">
              <input
                ref={searchRef}
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Search name, father, B-Form, EMIS, school, place"
                aria-label="Search students"
              />
              <span className="slash">/</span>
            </div>
            <button type="button" className="ghost" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>
              Filters{isFiltered(filters, edge) ? ` · ${chips.length} active` : ""}
            </button>
          </div>
        </header>

        <div className="filter-bar">
          <span className="fine">
            {isFiltered(filters, edge) ? "Clear a value in the drawer to widen the results." : "Showing everyone. Open filters to narrow the list."}
          </span>
        </div>

        {filterOpen ? (
          <>
            <button type="button" className="filter-scrim" aria-label="Close filters" onClick={() => setFilterOpen(false)} />
            <aside className="filter-drawer" aria-label="Filters">
              <div className="filter-drawer-head">
                <strong>Filters</strong>
                <button type="button" className="ghost" onClick={() => setFilterOpen(false)}>Done</button>
              </div>
              <div className="filter-drawer-body">
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
              </div>
            </aside>
          </>
        ) : null}

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
        {tab === "students" ? (
          <Students
            rows={filtered}
            query={filters.q}
            catalog={data.students}
            onCreated={(student) =>
              setData((current) => (current ? { ...current, students: [student, ...current.students] } : current))
            }
          />
        ) : null}
        {tab === "compare" ? (
          <Compare rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "quality" ? <Quality meta={data.meta} rows={filtered} summary={summary} /> : null}
        {tab === "report" ? <StudentReport rows={filtered} universe={data.students.length} chips={chips} /> : null}
        {tab === "sheets" ? <StudentWorkbook rows={data.students} fileName={data.meta.generatedFrom} /> : null}
      </main>
    </div>
  );
}
