import { SPIN_DURATION_MS, useWheelSpin } from "@/components/hooks/useWheelSpin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Candidate {
  id: string;
  name: string;
}

interface Props {
  candidates: Candidate[];
  /** Shows a finished draw without spinning; used by the state sink only. */
  previewWinnerId?: string;
}

// The wheel is drawn in a 200 x 210 box: centre (100, 110), radius 92, the pointer sits above the rim.
const CENTER_X = 100;
const CENTER_Y = 110;
const RADIUS = 92;
const LABEL_RADIUS = 78;

// Four of the five chart roles; chart-5 is the error red and would read as a warning.
const SLICE_FILLS = ["fill-chart-1", "fill-chart-2", "fill-chart-3", "fill-chart-4"];

function sliceFill(index: number, count: number): string {
  // With a count of 4n + 1 the last slice would match the first one next to it.
  if (index === count - 1 && index % SLICE_FILLS.length === 0 && count > 1) return SLICE_FILLS[2];
  return SLICE_FILLS[index % SLICE_FILLS.length];
}

function point(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: CENTER_X + radius * Math.cos(radians), y: CENTER_Y + radius * Math.sin(radians) };
}

function slicePath(index: number, count: number): string {
  const step = 360 / count;
  const start = point(index * step, RADIUS);
  const end = point((index + 1) * step, RADIUS);
  const largeArc = step > 180 ? 1 : 0;
  return `M ${CENTER_X} ${CENTER_Y} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

// Above this many slices a name no longer fits, so each slice shows its number and the list is numbered.
const MAX_NAMED_SLICES = 12;

function labelSize(count: number): { fontSize: number; maxChars: number } {
  if (count <= 4) return { fontSize: 12, maxChars: 16 };
  if (count <= 8) return { fontSize: 10, maxChars: 12 };
  if (count <= MAX_NAMED_SLICES) return { fontSize: 8, maxChars: 9 };
  return { fontSize: 9, maxChars: 2 };
}

function shorten(name: string, maxChars: number): string {
  return name.length > maxChars ? `${name.slice(0, maxChars - 1)}\u2026` : name;
}

export function TieBreakerWheel({ candidates, previewWinnerId }: Props) {
  const count = candidates.length;
  const previewIndex = previewWinnerId ? candidates.findIndex((candidate) => candidate.id === previewWinnerId) : -1;
  const { rotation, animate, spinning, winnerIndex, spin, finish } = useWheelSpin(
    count,
    previewIndex >= 0 ? previewIndex : undefined,
  );
  const winner = winnerIndex === null ? null : candidates[winnerIndex];
  const { fontSize, maxChars } = labelSize(count);
  const step = 360 / count;
  const numbered = count > MAX_NAMED_SLICES;
  const ListTag = numbered ? "ol" : "ul";

  let buttonLabel = "Spin the wheel";
  if (spinning) buttonLabel = "Spinning\u2026";
  else if (winner) buttonLabel = "Spin again";

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 200 210"
        role="img"
        aria-label={`Wheel with ${count} tied options`}
        className="w-full max-w-xs shrink-0"
      >
        <g
          onTransitionEnd={finish}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
            transition: animate ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)` : "none",
          }}
        >
          {candidates.map((candidate, index) => {
            const labelAngle = (index + 0.5) * step;
            const label = point(labelAngle, LABEL_RADIUS);
            return (
              <g key={candidate.id}>
                <title>{candidate.name}</title>
                <path
                  d={slicePath(index, count)}
                  className={cn(sliceFill(index, count), "stroke-card")}
                  strokeWidth={1}
                />
                <text
                  x={label.x}
                  y={label.y}
                  transform={`rotate(${labelAngle - 90} ${label.x.toFixed(2)} ${label.y.toFixed(2)})`}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={fontSize}
                  fontWeight={600}
                  className="fill-background"
                >
                  {numbered ? index + 1 : shorten(candidate.name, maxChars)}
                </text>
              </g>
            );
          })}
          <circle cx={CENTER_X} cy={CENTER_Y} r={10} className="fill-card stroke-border" strokeWidth={1} />
        </g>
        <polygon
          points={`${CENTER_X},${CENTER_Y - RADIUS + 2} ${CENTER_X - 9},2 ${CENTER_X + 9},2`}
          className="fill-foreground stroke-background"
          strokeWidth={1}
        />
      </svg>
      <div className="flex w-full flex-col gap-3">
        <ListTag className={cn("text-foreground space-y-1 pl-5 text-sm", numbered ? "list-decimal" : "list-disc")}>
          {candidates.map((candidate) => (
            <li key={candidate.id}>{candidate.name}</li>
          ))}
        </ListTag>
        <div>
          {/* aria-disabled, not disabled: a disabled button drops keyboard focus when a spin starts. */}
          <Button
            type="button"
            onClick={spin}
            aria-disabled={spinning}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          >
            {buttonLabel}
          </Button>
        </div>
        <div role="status" aria-live="polite">
          {winner && (
            <Card className="gap-0 rounded-lg py-3 shadow-none">
              <CardContent className="space-y-1 px-3">
                <Badge variant="secondary">Tie-break draw</Badge>
                <p className="text-foreground text-lg font-semibold break-words">{winner.name}</p>
                <p className="text-muted-foreground text-sm">
                  Drawn at random from {count} tied options. The ranking and totals above are unchanged.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
