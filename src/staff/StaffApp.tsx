import { useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Database,
  GitCompare,
  LayoutDashboard,
  LayoutGrid,
  Map as MapIcon,
  Moon,
  PanelLeft,
  School,
  ShieldCheck,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";
import { fmt } from "../format";
import { StaffFilters } from "./Filters";
import { loadStaff } from "./model";
import { activeChips, applyFilters, isFiltered, pickDim, removeChip, summarize } from "./query";
import {
  EMPTY_FILTERS,
  LIST_KEYS,
  type Dim,
  type Filters,
  type ListKey,
  type Presence,
  type StaffDataset,
  type TabId,
} from "./types";
import { Compare, Explore, Geography, Overview, People, Quality, Schools } from "./views";

const NAV: { label: string; items: { id: TabId; label: string; icon: LucideIcon }[] }[] = [
  { label: "Dashboard", items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }] },
  {
    label: "Analysis",
    items: [
      { id: "explore", label: "Explore", icon: Compass },
      { id: "geography", label: "Geography", icon: MapIcon },
      { id: "compare", label: "Compare", icon: GitCompare },
    ],
  },
  {
    label: "Records",
    items: [
      { id: "schools", label: "Schools", icon: School },
      { id: "people", label: "Staff", icon: Users },
    ],
  },
  { label: "Data", items: [{ id: "quality", label: "Quality", icon: ShieldCheck }] },
];

const TABS = NAV.flatMap((group) => group.items);

function readFilters(): Filters {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return EMPTY_FILTERS;
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Partial<Filters>;
    const next: Filters = { ...EMPTY_FILTERS, program: [], system: [], donor: [], province: [], district: [], tehsil: [], school: [], gender: [], religion: [], role: [], family: [], qualification: [], source: [] };
    for (const key of LIST_KEYS) {
      const value = data[key];
      if (Array.isArray(value)) next[key] = value.filter((item): item is string => typeof item === "string");
    }
    if (typeof data.q === "string") next.q = data.q;
    if (data.cnic === "Present" || data.cnic === "Missing") next.cnic = data.cnic;
    if (data.contact === "Present" || data.contact === "Missing") next.contact = data.contact;
    if (data.kin === "Present" || data.kin === "Missing") next.kin = data.kin;
    return next;
  } catch {
    return EMPTY_FILTERS;
  }
}

function writeFilters(filters: Filters): string {
  const data: Record<string, unknown> = {};
  for (const key of LIST_KEYS) if (filters[key].length) data[key] = filters[key];
  if (filters.q.trim()) data.q = filters.q;
  if (filters.cnic !== "all") data.cnic = filters.cnic;
  if (filters.contact !== "all") data.contact = filters.contact;
  if (filters.kin !== "all") data.kin = filters.kin;
  if (!Object.keys(data).length) return "";
  return encodeURIComponent(JSON.stringify(data));
}

function readModule(): TabId {
  const requested = new URLSearchParams(location.search).get("m");
  return TABS.some((item) => item.id === requested) ? (requested as TabId) : "overview";
}

export function StaffApp({ onHome }: { onHome: () => void }) {
  const [data, setData] = useState<StaffDataset | null>(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [filters, setFilters] = useState<Filters>(() => readFilters());
  const [tab, setTab] = useState<TabId>(() => readModule());
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 860);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStaff()
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "The staff atlas could not be opened.");
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

  const filtered = useMemo(() => (data ? applyFilters(data.staff, filters) : []), [data, filters]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const chips = useMemo(() => activeChips(filters), [filters]);

  useEffect(() => {
    if (!data) return;
    const next = writeFilters(filters);
    const current = location.hash.replace(/^#/, "");
    if (next !== current) {
      history.replaceState(null, "", next ? `${location.pathname}${location.search}#${next}` : `${location.pathname}${location.search}`);
    }
  }, [filters, data]);

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
        <h1>The staff atlas did not open</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="boot">
        <p className="kicker">PEN · Academic year 2026</p>
        <h1>Staff Atlas</h1>
        <p>Reading 2,103 staff records…</p>
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
            <span>Staff 2026</span>
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
                    {item.id === "people" ? <em>{fmt(filtered.length)}</em> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="nav-group sidebar-actions">
          <button type="button" className="nav-link" data-label="Choose records" aria-label="Choose records" onClick={onHome}>
            <LayoutGrid size={16} />
            <span>Choose records</span>
          </button>
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
            Staff Atlas / <strong>{TABS.find((item) => item.id === tab)?.label}</strong>
          </span>
        </div>
        <header className="top">
          <div>
            <p className="kicker">Staff atlas · academic year 2026</p>
            <h1>Every employee, every cut.</h1>
            <p className="lede">
              PEIMA, PSRP-I, PSRP-II, Sindh PSP, evening schools, and adopted Punjab schools. Each staff sheet is its own
              list, so nobody is dropped as a duplicate extract.
            </p>
          </div>
          <div className="top-tools">
            <div className="search">
              <input
                ref={searchRef}
                value={filters.q}
                onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
                placeholder="Search name, father, CNIC, contact, EMIS, school, place"
                aria-label="Search staff"
              />
              <span className="slash">/</span>
            </div>
            <button type="button" className="ghost" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>
              Filters{isFiltered(filters) ? ` · ${chips.length} active` : ""}
            </button>
          </div>
        </header>

        <div className="filter-bar">
          <span className="fine">
            {isFiltered(filters) ? "Clear a value in the drawer to widen the results." : "Showing everyone. Open filters to narrow the list."}
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
  <StaffFilters
                staff={data.staff}
                filters={filters}
                filteredCount={filtered.length}
                onToggle={toggle}
                onSetList={(key, values) => setFilters((current) => ({ ...current, [key]: values }))}
                onPresence={(key, value: Presence) => setFilters((current) => ({ ...current, [key]: value }))}
                onReset={() => setFilters(EMPTY_FILTERS)}
              />
              </div>
            </aside>
          </>
        ) : null}

        <div className="status">
          <strong>
            {fmt(filtered.length)} <em>of {fmt(data.staff.length)}</em>
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
            universe={data.staff.length}
            filters={filters}
            onPick={(dim: Dim, value: string) => setFilters((current) => pickDim(current, dim, value))}
          />
        ) : null}
        {tab === "explore" ? (
          <Explore rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "geography" ? (
          <Geography rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "schools" ? (
          <Schools
            rows={filtered}
            onOpen={(school, district) => {
              setFilters((current) => ({ ...current, school: [school], district: [district] }));
              setTab("people");
            }}
          />
        ) : null}
        {tab === "people" ? (
          <People
            rows={filtered}
            query={filters.q}
            catalog={data.staff}
            onCreated={(person) => setData((current) => (current ? { ...current, staff: [person, ...current.staff] } : current))}
          />
        ) : null}
        {tab === "compare" ? (
          <Compare rows={filtered} onPick={(dim, value) => setFilters((current) => pickDim(current, dim, value))} />
        ) : null}
        {tab === "quality" ? <Quality meta={data.meta} rows={filtered} /> : null}
      </main>
    </div>
  );
}
