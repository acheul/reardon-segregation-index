import { createMemo, createSignal } from "solid-js";
import { compute, generate } from "./lib/data";
import Controls from "./components/Controls";
import Hero from "./components/Hero";
import DensityChart from "./components/DensityChart";
import HpChart from "./components/HpChart";
import DataTable from "./components/DataTable";

export default function App() {
  const [sectors, setSectors] = createSignal(3);
  const [n, setN] = createSignal(120);
  const [strength, setStrength] = createSignal(0.45);
  const [K, setK] = createSignal(14);
  const [m, setM] = createSignal(4);
  const [seed, setSeed] = createSignal(42);

  const data = createMemo(() =>
    generate({ sectors: sectors(), n: n(), strength: strength(), K: K(), m: m(), seed: seed() })
  );
  const details = createMemo(() => compute(data(), K(), m()));

  return (
    <div class="wrap">
      <header>
        <h1>
          Rank-Order Segregation Index (H<sup>R</sup>)
        </h1>
        <p class="sub">
          Reardon's information-theory segregation index for continuous variables — computed live
          in your browser by the Rust implementation compiled to WebAssembly.
        </p>
        <nav>
          <a href="https://github.com/acheul/reardon-segregation-index">GitHub</a>
          <a href="https://pypi.org/project/segindex/">PyPI (Python)</a>
          <a href="https://github.com/acheul/reardon-segregation-index/tree/main/rust">Rust crate</a>
        </nav>
      </header>

      <Controls
        sectors={sectors()} setSectors={setSectors}
        n={n()} setN={setN}
        strength={strength()} setStrength={setStrength}
        K={K()} setK={setK}
        m={m()} setM={setM}
        regenerate={() => setSeed((Math.random() * 2 ** 31) | 0)}
      />

      <div class="grid">
        <Hero hR={details().hR} />
        <DensityChart data={data()} />
        <HpChart details={details()} />
      </div>

      <DataTable details={details()} />

      <section class="explain">
        <h2>What is being measured?</h2>
        <p>
          Classic segregation indices work on categorical groups (e.g. race). For a continuous
          variable like income, Reardon (2011) proposed the{" "}
          <b>rank-order information theory index</b>: slice the population at every income
          percentile <i>p</i>, compute the binary Theil segregation index H(<i>p</i>) of the
          below-vs-above split across sectors, and average those slices with entropy weights.
        </p>
        <div class="formula">
          H(p) = Σ<sub>k</sub> (t<sub>k</sub> / T) · (E(p) − E<sub>k</sub>(p)) / E(p) ,&nbsp;&nbsp;
          E(p) = −p·log<sub>2</sub>p − (1−p)·log<sub>2</sub>(1−p)
        </div>
        <div class="formula">
          H<sup>R</sup> = 2·ln(2) ∫<sub>0</sub><sup>1</sup> E(p) · H(p) dp
        </div>
        <p>
          In practice H(p) is evaluated at K−1 rank thresholds, a degree-m polynomial is fitted by
          entropy-weighted least squares, and the integral is taken analytically from the fitted
          coefficients (Reardon &amp; Bischoff 2011, Appendix A). That whole pipeline runs here in
          WebAssembly on every slider move.
        </p>
        <h2>Reading the demo</h2>
        <ul>
          <li>
            At <b>strength 0</b> all sectors draw from the same distribution — H(p) hovers near 0
            and H<sup>R</sup> ≈ 0.
          </li>
          <li>
            As strength grows the sector incomes separate, the below/above split becomes
            predictable from the sector, and H<sup>R</sup> rises toward 1.
          </li>
          <li>More samples per sector reduce the sampling noise in the H(p) dots.</li>
        </ul>
      </section>

      <footer>
        segindex — Python: <code>pip install segindex</code> · Rust sources in{" "}
        <a href="https://github.com/acheul/reardon-segregation-index/tree/main/rust">/rust</a>.
        References: Reardon (2011), “Measures of Income Segregation”; Reardon &amp; Bischoff
        (2011), AJS 116(4), Appendix A.
      </footer>
    </div>
  );
}
