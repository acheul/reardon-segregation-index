export default function Hero(props: { hR: number }) {
  const hint = () => {
    const h = props.hR;
    if (h < 0.1) return "Sectors are almost perfectly mixed.";
    if (h < 0.3) return "Mild segregation — sector distributions largely overlap.";
    if (h < 0.6) return "Substantial segregation — sectors occupy distinct income ranges.";
    return "Severe segregation — sector membership nearly determines income rank.";
  };
  return (
    <div class="panel hero">
      <span class="label">
        Rank-order index H<sup>R</sup>
      </span>
      <span class="value">{props.hR.toFixed(4)}</span>
      <div class="meter">
        <div style={{ width: `${(Math.max(0, Math.min(1, props.hR)) * 100).toFixed(1)}%` }} />
      </div>
      <div class="scale">
        <span>0 · no segregation</span>
        <span>1 · complete</span>
      </div>
      <p class="hint">{hint()}</p>
    </div>
  );
}
