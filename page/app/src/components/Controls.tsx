interface Props {
  sectors: number; setSectors: (v: number) => void;
  n: number; setN: (v: number) => void;
  strength: number; setStrength: (v: number) => void;
  K: number; setK: (v: number) => void;
  m: number; setM: (v: number) => void;
  regenerate: () => void;
}

export default function Controls(props: Props) {
  return (
    <div class="controls panel">
      <div class="ctl">
        <label for="in-sectors">Sectors</label>
        <input
          type="range" id="in-sectors" min="2" max="5" step="1"
          value={props.sectors}
          onInput={(e) => props.setSectors(Number(e.currentTarget.value))}
        />
        <output>{props.sectors}</output>
      </div>
      <div class="ctl">
        <label for="in-n">Samples per sector</label>
        <input
          type="range" id="in-n" min="20" max="400" step="10"
          value={props.n}
          onInput={(e) => props.setN(Number(e.currentTarget.value))}
        />
        <output>{props.n}</output>
      </div>
      <div class="ctl">
        <label for="in-strength">Segregation strength</label>
        <input
          type="range" id="in-strength" min="0" max="100" step="1"
          value={Math.round(props.strength * 100)}
          onInput={(e) => props.setStrength(Number(e.currentTarget.value) / 100)}
        />
        <output>{Math.round(props.strength * 100)}%</output>
      </div>
      <div class="ctl">
        <label for="in-k">Thresholds K</label>
        <input
          type="range" id="in-k" min="6" max="30" step="1"
          value={props.K}
          onInput={(e) => props.setK(Number(e.currentTarget.value))}
        />
        <output>{props.K}</output>
      </div>
      <div class="ctl">
        <label for="in-m">Polynomial degree m</label>
        <input
          type="range" id="in-m" min="2" max="6" step="1"
          value={props.m}
          onInput={(e) => props.setM(Number(e.currentTarget.value))}
        />
        <output>{props.m}</output>
      </div>
      <button type="button" onClick={() => props.regenerate()}>
        Regenerate data
      </button>
    </div>
  );
}
