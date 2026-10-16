import { useEffect, type ReactNode } from "react";

export function RecordDialog({
  title,
  lede,
  onClose,
  children,
}: {
  title: string;
  lede: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="dialog-back"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="record-title">
        <div className="dialog-bar">
          <div>
            <p className="kicker">Add a record</p>
            <h2 id="record-title">{title}</h2>
            <p className="hint">{lede}</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  list,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  list?: string[];
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  const listId = list?.length ? label.replace(/\W+/g, "-").toLowerCase() : undefined;
  return (
    <label>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        required={required}
        type={type}
        placeholder={placeholder}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
      />
      {listId ? (
        <datalist id={listId}>
          {list!.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value && value !== "Unknown"))].sort((a, b) =>
    a.localeCompare(b),
  );
}
