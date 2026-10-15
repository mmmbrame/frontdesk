import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { App } from "./App";
import { Home } from "./Home";
import { StaffApp } from "./staff/StaffApp";
import "./index.css";

type Audience = "students" | "staff" | null;

function readAudience(): Audience {
  const value = new URLSearchParams(location.search).get("a");
  return value === "students" || value === "staff" ? value : null;
}

function Root() {
  const [audience, setAudience] = useState<Audience>(() => readAudience());

  useEffect(() => {
    const onPop = () => setAudience(readAudience());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function choose(next: "students" | "staff") {
    const params = new URLSearchParams();
    params.set("a", next);
    params.set("m", "overview");
    history.pushState(null, "", `${location.pathname}?${params.toString()}`);
    setAudience(next);
  }

  function home() {
    history.pushState(null, "", location.pathname);
    setAudience(null);
  }

  if (audience === "staff") return <StaffApp onHome={home} />;
  if (audience === "students") return <App onHome={home} />;
  return <Home onChoose={choose} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
