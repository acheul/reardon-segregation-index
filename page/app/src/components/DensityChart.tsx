import { For, Show, createMemo, createSignal } from "solid-js";
import { SERIES, fmt, kde, niceTicks } from "../lib/data";

const W = 720;
const H = 300;
const ML = 14;
const MR = 14;
const MT = 14;
const MB = 34;
const PW = W - ML - MR;
const PH = H - MT - MB;
const GRID_N = 120;

export default function DensityChart(props: { data: Float64Array[] }) {
  const [hover, setHover] = createSignal<{ gi: number; px: number; py: number } | null>(null);
  let svgRef: SVGSVGElement | undefined;
  let figRef: HTMLElement | undefined;

  const model = createMemo(() => {
    const lo = 0;
    let hi = 0;
    for (const d of props.data) for (const v of d) hi = Math.max(hi, v);
    hi *= 1.05;
    const grid = Array.from({ length: GRID_N + 1 }, (_, i) => lo + ((hi - lo) * i) / GRID_N);
    const curves = props.data.map((d) => kde(d, grid));
    const ymax = Math.max(...curves.flat()) * 1.12 || 1;
    return { lo, hi, grid, curves, ymax };
  });

  const sx = (v: number) => ML + ((v - model().lo) / (model().hi - model().lo)) * PW;
  const sy = (v: number) => MT + PH - (v / model().ymax) * PH;

  const paths = createMemo(() =>
    model().curves.map((c) =>
      c.map((y, i) => `${i ? "L" : "M"}${sx(model().grid[i]).toFixed(1)},${sy(y).toFixed(1)}`).join("")
    )
  );

  const peaks = createMemo(() =>
    model().curves.map((c) => {
      const pi = c.indexOf(Math.max(...c));
      return {
        x: Math.min(Math.max(sx(model().grid[pi]), ML + 26), ML + PW - 26),
        y: sy(c[pi]),
      };
    })
  );

  function onMove(ev: MouseEvent) {
    if (!svgRef || !figRef) return;
    const r = svgRef.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const frac = (px - ML) / PW;
    if (frac < 0 || frac > 1) return;
    const gi = Math.round(frac * GRID_N);
    const fig = figRef.getBoundingClientRect();
    setHover({ gi, px: ev.clientX - fig.left + 14, py: ev.clientY - fig.top + 14 });
  }

  return (
    <figure class="panel fig-density" ref={figRef}>
      <figcaption>Synthetic income distribution by sector</figcaption>
      <div class="figsub">
        Kernel density of the generated values. The strength slider pulls the sector distributions
        apart.
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Income density curves per sector"
        ref={svgRef}
      >
        <For each={niceTicks(model().lo, model().hi, 6)}>
          {(t) => (
            <>
              <line x1={sx(t)} x2={sx(t)} y1={MT} y2={MT + PH} stroke="var(--grid)" stroke-width="1" />
              <text x={sx(t)} y={H - 12} text-anchor="middle" font-size="11" fill="var(--text-muted)">
                {fmt(t)}
              </text>
            </>
          )}
        </For>
        <line x1={ML} x2={ML + PW} y1={MT + PH} y2={MT + PH} stroke="var(--baseline)" stroke-width="1" />
        <text x={ML + PW} y={H - 12} text-anchor="end" font-size="11" fill="var(--text-muted)">
          value (e.g. income)
        </text>

        <For each={paths()}>
          {(d, s) => (
            <path
              d={d}
              fill="none"
              stroke={`var(${SERIES[s()]})`}
              stroke-width="2"
              stroke-linejoin="round"
            />
          )}
        </For>
        <For each={peaks()}>
          {(pk, s) => (
            <>
              <circle cx={pk.x} cy={pk.y - 12} r="3.5" fill={`var(${SERIES[s()]})`} />
              <text x={pk.x + 7} y={pk.y - 8} font-size="11" fill="var(--text-secondary)">
                S{s() + 1}
              </text>
            </>
          )}
        </For>

        <Show when={hover()}>
          {(h) => (
            <line
              x1={sx(model().grid[h().gi])}
              x2={sx(model().grid[h().gi])}
              y1={MT}
              y2={MT + PH}
              stroke="var(--baseline)"
              stroke-width="1"
              stroke-dasharray="3 3"
            />
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

      <div class="legend">
        <For each={props.data}>
          {(d, s) => (
            <span>
              <i style={{ background: `var(${SERIES[s()]})` }} />
              Sector {s() + 1} (n={d.length})
            </span>
          )}
        </For>
      </div>

      <Show when={hover()}>
        {(h) => (
          <div class="tooltip" style={{ left: `${h().px}px`, top: `${h().py}px` }}>
            <div class="row">
              <b>value {fmt(model().grid[h().gi])}</b>
            </div>
            <For each={model().curves}>
              {(c, s) => (
                <div class="row">
                  <i style={{ background: `var(${SERIES[s()]})` }} />
                  Sector {s() + 1}: <b>{c[h().gi].toFixed(4)}</b>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </figure>
  );
}
