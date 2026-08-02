//! Theory cross-checks: compare against independently coded textbook
//! formulas rather than this crate's own outputs.

use segindex::{delta_m, rank_transform, theil_p};

/// Sectors with heavily overlapping ranges, so any mid-range threshold
/// splits every sector into two non-empty groups.
fn area_overlap() -> Vec<Vec<f64>> {
    vec![
        (0..60).step_by(2).map(f64::from).collect(),
        (10..100).step_by(3).map(f64::from).collect(),
        (5..45).map(f64::from).collect(),
    ]
}

/// Two-group entropy in bits, textbook form (E(0) = E(1) = 0 exactly).
fn entropy2(p: f64) -> f64 {
    if p <= 0.0 || p >= 1.0 {
        0.0
    } else {
        -(p * p.log2() + (1.0 - p) * (1.0 - p).log2())
    }
}

/// Two-group categorical information theory index H,
/// H = sum_k t_k (E - E_k) / (T E) (Theil 1972; Reardon & Firebaugh 2002),
/// written independently of the crate internals.
fn categorical_theil(below: &[f64], totals: &[f64]) -> f64 {
    let t: f64 = totals.iter().sum();
    let e = entropy2(below.iter().sum::<f64>() / t);
    below
        .iter()
        .zip(totals)
        .map(|(b, tk)| tk * (e - entropy2(b / tk)))
        .sum::<f64>()
        / (t * e)
}

#[test]
fn hp_equals_categorical_theil_of_dichotomized_data() {
    // H(p) is, by definition, the categorical two-group Theil index of the
    // below-p / above-p dichotomy (Reardon 2011).
    let rr_s = rank_transform(&area_overlap(), None);
    for thr in [0.3, 0.5, 0.7] {
        let below: Vec<f64> = rr_s
            .iter()
            .map(|rr| rr.iter().filter(|&&r| r <= thr).count() as f64)
            .collect();
        let totals: Vec<f64> = rr_s.iter().map(|rr| rr.len() as f64).collect();
        let pp: Vec<f64> = below.iter().zip(&totals).map(|(b, t)| b / t).collect();
        // stay clear of the 1e-6 entropy clamp
        assert!(pp.iter().all(|&p| p > 0.0 && p < 1.0));

        let ours = theil_p(&totals, &pp);
        let textbook = categorical_theil(&below, &totals);
        assert!((ours - textbook).abs() < 1e-12, "threshold {thr}");
    }
}

#[test]
fn delta_matches_numerical_integration() {
    // delta_m = integral(p^m E(p) dp) / integral(E(p) dp) over [0, 1];
    // verify the closed-form coefficients against plain trapezoid quadrature.
    let n = 200_000usize;
    let lo = 1e-9;
    let hi = 1.0 - 1e-9;
    let step = (hi - lo) / n as f64;

    let trapezoid = |f: &dyn Fn(f64) -> f64| -> f64 {
        let mut s = (f(lo) + f(hi)) / 2.0;
        for i in 1..n {
            s += f(lo + i as f64 * step);
        }
        s * step
    };

    let e = |p: f64| -(p * p.log2() + (1.0 - p) * (1.0 - p).log2());
    let denom = trapezoid(&e); // = 1 / (2 ln 2)
    for m in 0..6 {
        let num = trapezoid(&|p: f64| p.powi(m as i32) * e(p));
        assert!((delta_m(m) - num / denom).abs() < 1e-6, "delta_m({m})");
    }
}
