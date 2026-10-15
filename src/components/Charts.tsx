import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt, pct } from "../format";

const tooltipStyle = {
  background: "var(--chart-tip-bg)",
  border: "1px solid var(--chart-tip-line)",
  borderRadius: 12,
  fontSize: 13,
  color: "var(--chart-tip-ink)",
};

export function cutLabel(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function HBars({
  data,
  height,
  onPick,
  digits = 0,
  suffix = "",
}: {
  data: { name: string; value: number; fill: string }[];
  height: number;
  onPick?: (name: string) => void;
  digits?: number;
  suffix?: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={(value) => cutLabel(String(value), 22)}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            contentStyle={tooltipStyle}
            formatter={(value) => [`${digits ? Number(value).toFixed(digits) : fmt(Number(value))}${suffix}`, ""]}
          />
          <Bar
            dataKey="value"
            radius={[0, 7, 7, 0]}
            isAnimationActive={false}
            onClick={(item) => onPick?.(String(item.name))}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} cursor={onPick ? "pointer" : "default"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  total,
  onPick,
  center = "students",
}: {
  data: { name: string; value: number; fill: string }[];
  total: number;
  onPick?: (name: string) => void;
  center?: string;
}) {
  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={2}
            isAnimationActive={false}
            onClick={(item) => onPick?.(String(item.name))}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} cursor="pointer" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [fmt(Number(value)), name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <strong>{fmt(total)}</strong>
        <span>{center}</span>
      </div>
    </div>
  );
}

export function AdmissionArea({
  data,
  onPick,
}: {
  data: { year: string; female: number; male: number; other: number }[];
  onPick?: (year: string) => void;
}) {
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 10, bottom: 0 }} onClick={(state) => {
          const label = state?.activeLabel;
          if (label) onPick?.(String(label));
        }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [fmt(Number(value)), name]} />
          <Area type="monotone" dataKey="female" name="Female" stackId="1" stroke="#c24d2c" fill="#c24d2c" fillOpacity={0.85} isAnimationActive={false} />
          <Area type="monotone" dataKey="male" name="Male" stackId="1" stroke="#2a527a" fill="#2a527a" fillOpacity={0.85} isAnimationActive={false} />
          <Area type="monotone" dataKey="other" name="Unknown" stackId="1" stroke="#a3988c" fill="#a3988c" fillOpacity={0.8} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBars({
  data,
  series,
  height,
  onPick,
}: {
  data: Record<string, string | number>[];
  series: string[];
  height: number;
  onPick?: (name: string) => void;
}) {
  const fills = ["#0e6b57", "#c24d2c", "#2a527a", "#c9922a", "#6b4c9a", "#8a5a44"];
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={148}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
            tickFormatter={(value) => cutLabel(String(value), 22)}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [fmt(Number(value)), name]} />
          {series.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={fills[index % fills.length]}
              isAnimationActive={false}
              onClick={(item) => onPick?.(String(item.name))}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; fill: string; note?: string }[] }) {
  return (
    <ul className="legend">
      {items.map((item) => (
        <li key={item.name}>
          <i style={{ background: item.fill }} />
          <span>{item.name}</span>
          {item.note ? <em>{item.note}</em> : null}
        </li>
      ))}
    </ul>
  );
}

export function metricText(value: number, digits: number, metric: string): string {
  if (metric.endsWith("Pct") || metric === "share") return pct(value, digits);
  if (digits) return value.toFixed(digits);
  return fmt(value);
}
