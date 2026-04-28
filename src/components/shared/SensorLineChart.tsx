import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

interface Props {
  data: number[];
  color: string;
  yLabel: string;
  unit?: string;
  /** e.g. 6 = label every hour from "6h ago" to "Now" */
  hoursSpan?: number;
}

export function SensorLineChart({ data, color, yLabel, unit = "", hoursSpan = 6 }: Props) {
  const step = hoursSpan / Math.max(1, data.length - 1);
  const chartData = data.map((v, i) => {
    const hoursAgo = +(hoursSpan - i * step).toFixed(1);
    const t = hoursAgo === 0 ? "Now" : `${hoursAgo}h`;
    return { t, value: v };
  });

  return (
    <div className="w-full h-[180px] animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          >
            <Label
              value="Time"
              offset={-8}
              position="insideBottom"
              style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
          </XAxis>
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            width={36}
          >
            <Label
              value={`${yLabel}${unit ? ` (${unit})` : ""}`}
              angle={-90}
              position="insideLeft"
              style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 11,
            }}
            formatter={(v: number) => [`${v}${unit}`, yLabel]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
