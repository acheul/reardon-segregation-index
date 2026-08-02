//! Rank-Order Information Theory Segregation Index (H^R) for continuous variables.
//!
//! Rust port of the Python package `segindex`. Both implementations follow
//! Reardon (2011) and Reardon & Bischoff (2011, Appendix A) and produce
//! identical results (within floating-point tolerance).
//!
//! ```
//! let area1 = vec![
//!     vec![80.0, 80.0, 70.0, 70.0],
//!     vec![50.0, 45.0, 40.0],
//!     vec![20.0, 20.0, 20.0, 10.0],
//! ];
//! let h_r = segindex::estimate_hp(&area1, None, 14, 4);
//! assert!((h_r - 0.7181836873727949).abs() < 1e-8);
//! ```

/// Coefficient d_m = 2 * integral of p^m * E(p) dp over [0, 1].
pub fn delta_m(m: usize) -> f64 {
    let mut s = 0.0;
    for n in 0..=m {
        let sign = if (m - n) % 2 == 0 { 1.0 } else { -1.0 };
        s += sign * binom(m, n) / ((m - n + 2) as f64).powi(2);
    }
    2.0 / ((m + 2) as f64).powi(2) + 2.0 * s
}

fn binom(n: usize, k: usize) -> f64 {
    let k = k.min(n - k.min(n));
    let mut c = 1.0;
    for i in 0..k {
        c = c * (n - i) as f64 / (i + 1) as f64;
    }
    c
}

/// Binary entropy E(p) in bits; p is nudged away from exact 0/1 by 1e-6.
pub fn entropy_p(p: f64) -> f64 {
    let p = if p == 0.0 {
        1e-6
    } else if p == 1.0 {
        1.0 - 1e-6
    } else {
        p
    };
    -(p * p.log2() + (1.0 - p) * (1.0 - p).log2())
}

/// Theil information theory index H for a binary split.
///
/// `tt`: population size (or weight sum) of each sector; `pp`: within-sector
/// proportion of the reference group.
pub fn theil_p(tt: &[f64], pp: &[f64]) -> f64 {
    let t: f64 = tt.iter().sum();
    let p_total = tt.iter().zip(pp).map(|(t, p)| t * p).sum::<f64>() / t;
    let weighted_e: f64 = tt.iter().zip(pp).map(|(t, &p)| t * entropy_p(p)).sum();
    1.0 - weighted_e / (t * entropy_p(p_total))
}

/// Cumulative-weight percentiles in (0, 1].
///
/// Each observation is assigned the right edge of its weight block in the
/// cumulative distribution; a group of tied values splits its pooled weight
/// evenly among its members and every member gets the average right edge.
/// With unit weights this reduces exactly to `rank/N` with average ranks for
/// ties (scipy's `rankdata` convention).
fn weighted_percentiles(values: &[f64], weights: &[f64]) -> Vec<f64> {
    let n = values.len();
    let mut idx: Vec<usize> = (0..n).collect();
    idx.sort_by(|&a, &b| values[a].partial_cmp(&values[b]).expect("NaN in input"));

    // Tie groups over the sorted order: (start, end, group weight).
    let mut groups: Vec<(usize, usize, f64)> = Vec::new();
    let mut i = 0;
    while i < n {
        let mut j = i;
        let mut group_w = weights[idx[i]];
        while j + 1 < n && values[idx[j + 1]] == values[idx[i]] {
            j += 1;
            group_w += weights[idx[j]];
        }
        groups.push((i, j, group_w));
        i = j + 1;
    }
    let total: f64 = groups.iter().map(|g| g.2).sum();

    let mut out = vec![0.0; n];
    let mut w_before = 0.0;
    for &(start, end, group_w) in &groups {
        let g = (end - start + 1) as f64;
        let pct = (w_before + group_w * (g + 1.0) / (2.0 * g)) / total;
        for &orig in &idx[start..=end] {
            out[orig] = pct;
        }
        w_before += group_w;
    }
    out
}

/// Rank-order transformation: pool all values and map each observation to its
/// (weighted) percentile in (0, 1]. Returns one vector per sector.
///
/// Without weights this is `rank/N` with average ranks for ties. With
/// weights, percentiles follow the cumulative weight distribution, so a
/// weight-w observation occupies w times the rank mass (see
/// notes/weighted-rank-review.md).
pub fn rank_transform(vv_s: &[Vec<f64>], ww_s: Option<&[Vec<f64>]>) -> Vec<Vec<f64>> {
    let flat: Vec<f64> = vv_s.iter().flatten().copied().collect();
    let weights: Vec<f64> = match ww_s {
        Some(ww_s) => ww_s.iter().flatten().copied().collect(),
        None => vec![1.0; flat.len()],
    };
    let pct = weighted_percentiles(&flat, &weights);
    let mut out = Vec::with_capacity(vv_s.len());
    let mut offset = 0;
    for vv in vv_s {
        out.push(pct[offset..offset + vv.len()].to_vec());
        offset += vv.len();
    }
    out
}

/// Solve A x = b for a small symmetric system via Gaussian elimination with
/// partial pivoting. `a` is row-major (n x n).
fn solve(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Vec<f64> {
    let n = b.len();
    for col in 0..n {
        let pivot = (col..n)
            .max_by(|&i, &j| a[i][col].abs().partial_cmp(&a[j][col].abs()).unwrap())
            .unwrap();
        a.swap(col, pivot);
        b.swap(col, pivot);
        for row in col + 1..n {
            let factor = a[row][col] / a[col][col];
            for k in col..n {
                a[row][k] -= factor * a[col][k];
            }
            b[row] -= factor * b[col];
        }
    }
    let mut x = vec![0.0; n];
    for row in (0..n).rev() {
        let s: f64 = (row + 1..n).map(|k| a[row][k] * x[k]).sum();
        x[row] = (b[row] - s) / a[row][row];
    }
    x
}

/// Intermediate results of the estimation, useful for plotting.
pub struct HpDetails {
    /// The final rank-order index H^R.
    pub h_r: f64,
    /// Fitted polynomial coefficients beta_0..beta_m of H(p).
    pub betas: Vec<f64>,
    /// Rank thresholds p = 1/K .. (K-1)/K.
    pub thresholds: Vec<f64>,
    /// Theil index H(p) evaluated at each threshold.
    pub hp: Vec<f64>,
}

/// Like [`estimate_hp`] but also returns the H(p) curve and the fitted
/// polynomial coefficients.
pub fn estimate_hp_details(
    vv_s: &[Vec<f64>],
    ww_s: Option<&[Vec<f64>]>,
    k: usize,
    m: usize,
) -> HpDetails {
    let rr_s = rank_transform(vv_s, ww_s);
    let ww_arr: Vec<Vec<f64>> = match ww_s {
        Some(ww_s) => ww_s.to_vec(),
        None => vv_s.iter().map(|vv| vec![1.0; vv.len()]).collect(),
    };
    let thresholds: Vec<f64> = (1..k).map(|i| i as f64 / k as f64).collect();
    let w_kk: Vec<f64> = thresholds.iter().map(|&p| entropy_p(p).powi(2)).collect();

    // Per sector: rank/weight pairs sorted by rank, with cumulative weights,
    // so the weighted share at or below any threshold is a binary search.
    let tt: Vec<f64> = ww_arr.iter().map(|ww| ww.iter().sum()).collect();
    let sector_cum: Vec<(Vec<f64>, Vec<f64>)> = rr_s
        .iter()
        .zip(&ww_arr)
        .map(|(rr, ww)| {
            let mut pairs: Vec<(f64, f64)> =
                rr.iter().copied().zip(ww.iter().copied()).collect();
            pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap());
            let ranks: Vec<f64> = pairs.iter().map(|p| p.0).collect();
            let mut cum = 0.0;
            let cum_w: Vec<f64> = pairs
                .iter()
                .map(|p| {
                    cum += p.1;
                    cum
                })
                .collect();
            (ranks, cum_w)
        })
        .collect();

    // H(p): Theil index of the below/above split at each rank threshold.
    let hp: Vec<f64> = thresholds
        .iter()
        .map(|&thr| {
            let pp: Vec<f64> = sector_cum
                .iter()
                .map(|(ranks, cum_w)| {
                    let idx = ranks.partition_point(|&r| r <= thr);
                    let below = if idx > 0 { cum_w[idx - 1] } else { 0.0 };
                    below / cum_w[cum_w.len() - 1]
                })
                .collect();
            theil_p(&tt, &pp)
        })
        .collect();

    // Weighted least squares fit of H(p) on [1, p, ..., p^m] via the normal
    // equations X^T W X beta = X^T W y (small, well-conditioned system).
    let dim = m + 1;
    let mut xtx = vec![vec![0.0; dim]; dim];
    let mut xty = vec![0.0; dim];
    for (i, &p) in thresholds.iter().enumerate() {
        let mut pow = vec![1.0; dim];
        for d in 1..dim {
            pow[d] = pow[d - 1] * p;
        }
        for r in 0..dim {
            xty[r] += w_kk[i] * pow[r] * hp[i];
            for c in 0..dim {
                xtx[r][c] += w_kk[i] * pow[r] * pow[c];
            }
        }
    }
    let betas = solve(xtx, xty);

    let h_r = betas
        .iter()
        .enumerate()
        .map(|(n, b)| b * delta_m(n))
        .sum();

    HpDetails { h_r, betas, thresholds, hp }
}

/// Estimate the rank-order information theory segregation index H^R.
///
/// * `vv_s`: values (e.g. incomes) grouped by sector.
/// * `ww_s`: optional observation weights, same shape as `vv_s`.
/// * `k`: number of rank thresholds; H(p) is evaluated at p = 1/K .. (K-1)/K.
/// * `m`: degree of the polynomial fitted to H(p).
///
/// Returns H^R in [0, 1]: 0 means no segregation, 1 complete segregation.
pub fn estimate_hp(vv_s: &[Vec<f64>], ww_s: Option<&[Vec<f64>]>, k: usize, m: usize) -> f64 {
    estimate_hp_details(vv_s, ww_s, k, m).h_r
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percentiles_match_rankdata_for_unit_weights() {
        let p = weighted_percentiles(&[10.0, 20.0, 20.0, 30.0], &[1.0; 4]);
        assert_eq!(p, vec![0.25, 0.625, 0.625, 1.0]); // ranks 1, 2.5, 2.5, 4 over N=4
    }

    #[test]
    fn percentiles_scale_invariant() {
        let v = [10.0, 20.0, 20.0, 30.0];
        let a = weighted_percentiles(&v, &[1.0, 2.0, 1.0, 1.0]);
        let b = weighted_percentiles(&v, &[0.001, 0.002, 0.001, 0.001]);
        for (x, y) in a.iter().zip(&b) {
            assert!((x - y).abs() < 1e-12);
        }
    }

    #[test]
    fn delta_matches_python() {
        // Values from the Python implementation.
        let expect = [1.0, 0.5, 0.3055555555555556, 0.20833333333333337, 0.15222222222222226];
        for (m, e) in expect.iter().enumerate() {
            assert!((delta_m(m) - e).abs() < 1e-12, "delta_m({m})");
        }
    }

    #[test]
    fn solve_small_system() {
        let a = vec![vec![2.0, 1.0], vec![1.0, 3.0]];
        let x = solve(a, vec![3.0, 5.0]);
        assert!((x[0] - 0.8).abs() < 1e-12);
        assert!((x[1] - 1.4).abs() < 1e-12);
    }
}
