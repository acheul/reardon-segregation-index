import { For, Show, createMemo, createSignal } from "solid-js";
import type { Details } from "../lib/data";
import { niceTicks, polyval } from "../lib/data";

const W = 960;
const H = 280;
const ML = 46;
const MR = 16;
const MT = 14;
const MB = 34;
const PW = W - ML - MR;
const PH = H - MT - MB;

export default function HpChart(props: { details: Details }) {
  const [hover, setHover] = createSignal<{ i: number; px: number; py: number } | null>(null);
  let svgRef: SVGSVGElement | undefined;
  let figRef: HTMLElement | undefined;

  const ymax = createMemo(() =>
    Math.max(0.05, Math.max(...props.details.hp) * 1.15, polyval(props.details.betas, 0.5) * 1.15)
  );
  const sx = (p: number) => ML + p * PW;
  const sy = (v: number) => MT + PH - (Math.max(0, Math.min(v, ymax())) / ymax()) * PH;

  const fitPath = createMemo(() => {
    const steps = 100;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const p = i / steps;
      return `${i ? "L" : "M"}${sx(p).toFixed(1)},${sy(polyval(props.details.betas, p)).toFixed(1)}`;
    }).join("");
  });

  function onMove(ev: MouseEvent) {
    if (!svgRef || !figRef) return;
    const r = svgRef.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const p = (px - ML) / PW;
    const ts = props.details.thresholds;
    let best = 0;
    ts.forEach((t, i) => {
      if (Math.abs(t - p) < Math.abs(ts[best] - p)) best = i;
    });
    const fig = figRef.getBoundingClientRect();
    setHover({ i: best, px: ev.clientX - fig.left + 14, py: ev.clientY - fig.top + 14 });
  }

  return (
    <figure class="panel fig-hp" ref={figRef}>
      <figcaption>Pairwise Theil index H(p) across rank thresholds</figcaption>
      <div class="figsub">
        Dots: H(p) at each threshold p = 1/K … (K−1)/K. Line: fitted degree-m polynomial. H
        <sup>R</sup> is its entropy-weighted integral.
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="H of p by rank threshold with fitted polynomial"
        ref={svgRef}
      >
        <For each={niceTicks(0, ymax(), 4)}>
          {(t) => (
            <>
              <line x1={ML} x2={ML + PW} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" stroke-width="1" />
              <text x={ML - 8} y={sy(t) + 4} text-anchor="end" font-size="11" fill="var(--text-muted)">
                {t.toFixed(2)}
              </text>
            </>
          )}
        </For>
        <For each={[0, 0.25, 0.5, 0.75, 1]}>
          {(t) => (
            <text x={sx(t)} y={H - 12} text-anchor="middle" font-size="11" fill="var(--text-muted)">
              {t}
            </text>
          )}
        </For>
        <line x1={ML} x2={ML + PW} y1={sy(0)} y2={sy(0)} stroke="var(--baseline)" stroke-width="1" />
        <text x={ML + PW} y={H - 12} text-anchor="end" font-size="11" fill="var(--text-muted)">
          rank threshold p
        </text>

        <path d={fitPath()} fill="none" stroke="var(--series-1)" stroke-width="2" />

        <For each={props.details.thresholds}>
          {(p, i) => (
            <>
              <circle cx={sx(p)} cy={sy(props.details.hp[i()])} r="5.5" fill="var(--surface-1)" />
              <circle cx={sx(p)} cy={sy(props.details.hp[i()])} r="4" fill="var(--series-1)" />
            </>
          )}
        </For>

        <Show when={hover()}>
          {(h) => (
            <>
              <line
                x1={sx(props.details.thresholds[h().i])}
                x2={sx(props.details.thresholds[h().i])}
                y1={MT}
                y2={MT + PH}
                stroke="var(--baseline)"
                stroke-width="1"
                stroke-dasharray="3 3"
              />
              <circle
                cx={sx(props.details.thresholds[h().i])}
                cy={sy(props.details.hp[h().i])}
                r="8"
                fill="none"
                stroke="var(--series-1)"
                stroke-width="1.5"
              />
            </>
          )}
        </Show>
        <rect
          x={ML}
          y={MT}
          width={PW}
          height={PH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      <Show when={hover()}>
        {(h) => (
          <div class="tooltip" style={{ left: `${h().px}px`, top: `${h().py}px` }}>
            <div class="row">
              p = <b>{props.details.thresholds[h().i].toFixed(3)}</b>
            </div>
            <div class="row">
              <i style={{ background: "var(--series-1)" }} />
              H(p) observed: <b>{props.details.hp[h().i].toFixed(4)}</b>
            </div>
            <div class="row">
              fitted:{" "}
              <b>{polyval(props.details.betas, props.details.thresholds[h().i]).toFixed(4)}</b>
            </div>
          </div>
        )}
      </Show>
    </figure>
  );
}
