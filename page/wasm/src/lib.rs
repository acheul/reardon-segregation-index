//! wasm-bindgen bindings over the `segindex` crate. Values are passed
//! flattened (one `Float64Array` plus per-sector lengths) to avoid
//! nested-array marshalling.

use wasm_bindgen::prelude::*;

fn unflatten(values: &[f64], sector_lengths: &[u32]) -> Vec<Vec<f64>> {
    let mut out = Vec::with_capacity(sector_lengths.len());
    let mut offset = 0usize;
    for &len in sector_lengths {
        let len = len as usize;
        out.push(values[offset..offset + len].to_vec());
        offset += len;
    }
    out
}

/// Estimate H^R from flattened sector values.
#[wasm_bindgen]
pub fn estimate_hp_flat(values: &[f64], sector_lengths: &[u32], k: usize, m: usize) -> f64 {
    let vv_s = unflatten(values, sector_lengths);
    segindex::estimate_hp(&vv_s, None, k, m)
}

/// Like [`estimate_hp_flat`] but with weights (same flattened layout).
#[wasm_bindgen]
pub fn estimate_hp_weighted_flat(
    values: &[f64],
    weights: &[f64],
    sector_lengths: &[u32],
    k: usize,
    m: usize,
) -> f64 {
    let vv_s = unflatten(values, sector_lengths);
    let ww_s = unflatten(weights, sector_lengths);
    segindex::estimate_hp(&vv_s, Some(&ww_s), k, m)
}

/// Full estimation details for plotting, packed as a flat array:
/// `[H_R, beta_0..beta_m, p_1..p_{K-1}, H(p_1)..H(p_{K-1})]`.
#[wasm_bindgen]
pub fn estimate_hp_details_flat(
    values: &[f64],
    sector_lengths: &[u32],
    k: usize,
    m: usize,
) -> Vec<f64> {
    let vv_s = unflatten(values, sector_lengths);
    let d = segindex::estimate_hp_details(&vv_s, None, k, m);
    let mut out = Vec::with_capacity(1 + d.betas.len() + 2 * d.thresholds.len());
    out.push(d.h_r);
    out.extend_from_slice(&d.betas);
    out.extend_from_slice(&d.thresholds);
    out.extend_from_slice(&d.hp);
    out
}
