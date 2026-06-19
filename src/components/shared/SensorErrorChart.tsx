import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
  ReferenceArea,
  ReferenceLine,
} from "recharts";


interface Props {
  /** Raw (pre-normalization) values over time. */
  data: number[];
  /** Per-point flag: true when the reading was outside the valid range. */
  errors: boolean[];
  /** Valid normalization band [min, max]. */
  range: [number, number];
  color: string;
  yLabel: string;
  unit?: string;
  hoursSpan?: number;
}

interface ErrPoint {
  t: string;
  value: number;
  err: boolean;
}

// Render dots in red when the point is an error, otherwise the normal color.
function ErrorDot({ cx, cy, payload, color }: { cx?: number; cy?: number; payload?: ErrPoint; color: string }) {
  if (cx == null || cy == null || !payload) return null;
  const isErr = payload.err;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isErr ? 4.5 : 2.5}
      fill={isErr ? "hsl(var(--danger))" : color}
      stroke={isErr ? "hsl(var(--card))" : "none"}
      strokeWidth={isErr ? 1.5 : 0}
    />
  );
}

export function SensorErrorChart({
  data,
  errors,
  range,
  color,
  yLabel,
  unit = "",
  hoursSpan = 6,
}: Props) {
  const [min, max] = range;
  const step = hoursSpan / Math.max(1, data.length - 1);
  const chartData: ErrPoint[] = data.map((v, i) => {
    const hoursAgo = +(hoursSpan - i * step).toFixed(1);
    const t = hoursAgo === 0 ? "Now" : `${hoursAgo}h`;
    return { t, value: v, err: !!errors[i] };
  });

  // Where did the error first start?
  const firstErrIdx = chartData.findIndex((p) => p.err);
  const firstErrLabel = firstErrIdx >= 0 ? chartData[firstErrIdx].t : null;

  // Pad the Y domain so out-of-range spikes are visible beyond the safe band.
  const values = data.filter((v) => Number.isFinite(v));
  const dataMin = values.length ? Math.min(...values) : min;
  const dataMax = values.length ? Math.max(...values) : max;
  const yMin = Math.min(min, dataMin);
  const yMax = Math.max(max, dataMax);

  return (
    <div className="w-full h-[180px] animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {/* Safe normalization band */}
          <ReferenceArea
            y1={min}
            y2={max}
            fill="hsl(var(--green))"
            fillOpacity={0.08}
            stroke="hsl(var(--green))"
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />
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
            domain={[yMin, yMax]}
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
            formatter={(v: number, _n, p) => [
              `${v}${unit}${(p?.payload as ErrPoint)?.err ? " ⚠ out of range" : ""}`,
              yLabel,
            ]}
          />
          {firstErrLabel && (
            <ReferenceLine
              x={firstErrLabel}
              stroke="hsl(var(--danger))"
              strokeDasharray="4 2"
              label={{
                value: "Error started",
                position: "top",
                fontSize: 9,
                fill: "hsl(var(--danger))",
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={(props) => <ErrorDot {...props} color={color} />}
            activeDot={{ r: 5 }}
            isAnimationActive
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
