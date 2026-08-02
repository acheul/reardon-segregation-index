# Rank-Order Segregation Index for Continuous Variables

- [PyPI](https://pypi.org/project/segindex/) (Python)
- [Crates.io](https://crates.io/crates/segindex) · [docs.rs](https://docs.rs/segindex) (Rust)
- [Github](https://github.com/acheul/reardon-segregation-index)
- [Interactive demo](https://acheul.github.io/reardon-segregation-index/) — generate example data and watch the index respond, computed in-browser by the Rust/WASM build

## Use

### Python

```python
# pip install segindex
from segindex import estimate_Hp

# Say, each variable is income.
# Inner lists of each area stand for sectors.
# Each area has three sectors in this case.
# How much is each area segregated by sectors in terms of income?
area1 = [[80, 80, 70, 70], [50, 45, 40], [20, 20, 20, 10]]
area2 = [[80, 70, 50], [80, 70, 45, 20, 20], [40, 20, 10]]

print(estimate_Hp(area1))
print(estimate_Hp(area2))

>> 0.7182
>> 0.3191
# area1 is more income-way segregated than area2. In other words, area2 is more mixed.
```

### Rust

The same algorithm is available as a pure Rust crate in
[`rust/`](https://github.com/acheul/reardon-segregation-index/tree/main/rust).
(The demo page's wasm-bindgen bindings live separately in
[`page/wasm/`](https://github.com/acheul/reardon-segregation-index/tree/main/page/wasm).)

```rust
// cargo add segindex
let area1 = vec![
    vec![80.0, 80.0, 70.0, 70.0],
    vec![50.0, 45.0, 40.0],
    vec![20.0, 20.0, 20.0, 10.0],
];
let h_r = segindex::estimate_hp(&area1, None, 14, 4); // 0.7182
```

Both implementations are pinned to the same golden test values
([`python/tests/test_segindex.py`](https://github.com/acheul/reardon-segregation-index/blob/main/python/tests/test_segindex.py),
[`rust/tests/golden.rs`](https://github.com/acheul/reardon-segregation-index/blob/main/rust/tests/golden.rs))
and agree within 1e-8.

## Description

- Many kinds of segregation index are used for various purposes like from policies to studies. While there are a wide range of categorical variables like race group to meausre an amount of segregation, continuous values like income are also important but do not fit very well with categorical segregation index.

- [Reardon(2011)](https://cepa.stanford.edu/sites/default/files/reardon%20&%20bischoff%20income%20inequality%20segregation%20AJS%20final.pdf), [Reardon and Bischoff(2011)](https://cepa.stanford.edu/sites/default/files/reardon%20&%20bischoff%20income%20inequality%20segregation%20AJS%20final.pdf) propsed a rank-order segregation index based on Theil index which is based on the concept of Entropy. This index is widely accepted for practical and academic uses to calculate continuous value based segregation index like in [Chetty et al. 2014](https://www.nber.org/system/files/working_papers/w19843/w19843.pdf).

- The proposed method of them is a bit intricate however and there seems to be no good online library or code that implements it. Therefore, here is one. Python codes inside [`python/segindex/segregation_index.py`](https://github.com/acheul/reardon-segregation-index/blob/main/python/segindex/segregation_index.py) implement the Rank-Order Information Theory Index of Reardon(2011); [`rust/src/lib.rs`](https://github.com/acheul/reardon-segregation-index/blob/main/rust/src/lib.rs) is the Rust port.

- Essentials of the Index
  - The inequality index _H_ is an average of each value from a total of K sectors, which is total region's entropy(_E_) minus each sector's entropy(_E_K_). It is weighted by each sector's relative popultaion size(_t_k/T_). Here the entropy stands for how equally variables(ex. income) are distributed over sectors.

  $$ H = \Sigma*{k=1}^{K} \frac{t*{k}}{T} \frac{E-E\_{k}}{E} $$
  - Below is an equation to calculate entropy when there is two groups. _p_ is a ratio of a group. As the variable here is continuous not categorical, one needs to integrate the below equation over _p_ with a range of 0≤p≤1. Thus transformation of raw values into rank ordered values is required.

  $$ E(p) = -(p\log*{2}^{p} + (1-p)\log*{2}^{(1-p)}) $$
  - Combining above equations, we can calculate below one to get a Rank-Order Information Theory Index, which is the segregation index for continuous variables. 0 means perfect equality. 1 means perfect segregation.

  $$
  H^R = \int_{0}^{1} \frac{E(p)}{\int_{0}^{1} E(q)\,dq} H(p) \,dp \\
      = 2 \log_{2}^{\int_{0}^{1} E(p)H(p) \,dp}
  $$

## Repository layout & development

- `python/` — the Python package (`pip install segindex`). Tests: `pip install pytest` then `pytest` at the repo root.
- `rust/` — the Rust crate (pure library, no wasm code). Tests: `cargo test` at the repo root (cargo workspace: `rust/` + `page/wasm/`).
- `page/` — the demo page: `page/wasm/` is a small wasm-bindgen binding crate over `rust/`, and `page/app/` is a SolidJS + Vite app (pnpm). `pnpm install && pnpm run build` inside `page/app/` runs wasm-pack and builds the site into `docs/`.
- `docs/` — the built demo page, served by GitHub Pages (source: `main` branch, `/docs` folder). Do not edit by hand.
- `notes/` — design notes, e.g. [notes/weighted-rank-review.md](https://github.com/acheul/reardon-segregation-index/blob/main/notes/weighted-rank-review.md) on the v0.2.0 weighted-rank change.

## Version Logs

- `v.0.2.0`:
  - Python: dropped statsmodels/pandas/scipy dependencies (numpy only), removed a leaked global, vectorized internals — unweighted results are unchanged and pinned by golden tests.
  - **Fixed the weighted path (`ww_s`)**: percentiles now follow the cumulative weight distribution instead of ranking value×weight products, and sector sizes/shares use weighted sums. Weighted results change; see [notes/weighted-rank-review.md](https://github.com/acheul/reardon-segregation-index/blob/main/notes/weighted-rank-review.md).
  - Added a Rust implementation (`rust/`).
  - Added an interactive demo page (SolidJS + Rust/WASM, built from `page/` into `docs/` for GitHub Pages).
- `v.0.1.4`: minor modification of README file
