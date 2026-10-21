import { GraduationCap, Handshake, Users } from "lucide-react";

export function Home({ onChoose }: { onChoose: (audience: "students" | "staff" | "partners") => void }) {
  return (
    <main className="gate">
      <p className="kicker">PEN · Academic year 2026</p>
      <h1>Which records do you want to open?</h1>
      <p className="lede">
        Students, staff, and the donor profile for PEN as a potential partner.
      </p>
      <div className="gate-grid">
        <button type="button" className="gate-card" onClick={() => onChoose("students")}>
          <span className="gate-icon" aria-hidden="true">
            <GraduationCap size={22} />
          </span>
          <span className="kicker">Students</span>
          <strong>Enrollment atlas</strong>
          <p>28,777 students. Grades, age, B-Form, admission year, gender, place, and school quality.</p>
        </button>
        <button type="button" className="gate-card" onClick={() => onChoose("staff")}>
          <span className="gate-icon" aria-hidden="true">
            <Users size={22} />
          </span>
          <span className="kicker">Staff</span>
          <strong>People atlas</strong>
          <p>2,103 employees. Roles, qualifications, CNIC, contact, gender, and the schools they work in.</p>
        </button>
        <button type="button" className="gate-card" onClick={() => onChoose("partners")}>
          <span className="gate-icon" aria-hidden="true">
            <Handshake size={22} />
          </span>
          <span className="kicker">Potential partner</span>
          <strong>Donor profile</strong>
          <p>Themes, programmes, pipeline, SDGs, and 120 demonstration entries for a donor partnership.</p>
        </button>
      </div>
    </main>
  );
}
