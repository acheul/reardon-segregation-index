"""Rank-Order Information Theory Segregation Index (H^R) for continuous variables.

References:
    Reardon, S. F. (2011). "Measures of Income Segregation."
    Reardon, S. F. & Bischoff, K. (2011). "Income Inequality and Income
    Segregation." American Journal of Sociology 116(4), Appendix A.
"""

from __future__ import annotations

import math
from typing import List, Optional, Sequence, Union

import numpy as np

__all__ = ["estimate_Hp", "delta_m", "entropy_p", "Theil_p", "from_vvs_to_rrs"]

Values = Sequence[float]
FloatOrArray = Union[float, np.ndarray]


def delta_m(m: int) -> float:
    """Coefficient d_m = 2*integral(p^m * E(p) dp) over [0, 1].

    Used to integrate the fitted polynomial of H(p) against the entropy
    weighting (Reardon 2011).
    """
    s = sum(
        ((-1) ** (m - n)) * math.comb(m, n) / (m - n + 2) ** 2
        for n in range(m + 1)
    )
    return 2 / (m + 2) ** 2 + 2 * s


def entropy_p(p: FloatOrArray) -> FloatOrArray:
    """Binary entropy E(p) in bits.

    p is nudged away from exact 0/1 by 1e-6 so that log2 stays finite.
    Accepts a scalar or an array.
    """
    p = np.asarray(p, dtype=float)
    p = np.where(p == 0, 1e-6, p)
    p = np.where(p == 1, 1 - 1e-6, p)
    e = -(p * np.log2(p) + (1 - p) * np.log2(1 - p))
    return e if e.ndim else float(e)


def Theil_p(tt: Values, pp: Values) -> float:
    """Theil information theory index H for a binary split.

    Arguments:
        tt: population size (or weight sum) of each sector.
        pp: within-sector proportion belonging to the reference group.
    """
    tt = np.asarray(tt, dtype=float)
    pp = np.asarray(pp, dtype=float)
    T = tt.sum()
    P = (tt * pp).sum() / T
    return float(1 - (tt * entropy_p(pp)).sum() / (T * entropy_p(P)))


def _weighted_percentiles(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Cumulative-weight percentiles in (0, 1].

    Each observation is assigned the right edge of its weight block in the
    cumulative distribution; a group of tied values splits its pooled weight
    evenly among its members and every member gets the average right edge.
    With unit weights this reduces exactly to ``rank/N`` with average ranks
    for ties (scipy's ``rankdata`` convention, kept for backward
    compatibility with the unweighted path).
    """
    order = np.argsort(values, kind="stable")
    cum = np.cumsum(weights[order])
    total = cum[-1]

    sorted_v = values[order]
    starts = np.concatenate([[0], np.nonzero(np.diff(sorted_v))[0] + 1])
    ends = np.concatenate([starts[1:], [len(sorted_v)]])

    w_before = np.where(starts > 0, cum[starts - 1], 0.0)
    group_w = cum[ends - 1] - w_before
    group_n = ends - starts
    group_pct = (w_before + group_w * (group_n + 1) / (2 * group_n)) / total

    out = np.empty(values.size)
    out[order] = np.repeat(group_pct, group_n)
    return out


def from_vvs_to_rrs(
    vv_s: Sequence[Values],
    ww_s: Optional[Sequence[Values]] = None,
) -> List[np.ndarray]:
    """Rank-order transformation: pool all values and map each observation to
    its (weighted) percentile in (0, 1]. Returns one array per sector.

    Without weights this is ``rank/N`` with average ranks for ties. With
    weights, percentiles follow the cumulative weight distribution, so a
    weight-w observation occupies w times the rank mass (see
    notes/weighted-rank-review.md; changed in v0.2.0 — previously values were
    multiplied by their weights before ranking).
    """
    lengths = [len(vv) for vv in vv_s]
    flat = np.concatenate([np.asarray(vv, dtype=float) for vv in vv_s])
    if ww_s is None:
        weights = np.ones(flat.size)
    else:
        weights = np.concatenate([np.asarray(ww, dtype=float) for ww in ww_s])
    pct = _weighted_percentiles(flat, weights)
    offsets = np.concatenate([[0], np.cumsum(lengths)])
    return [pct[a:b] for a, b in zip(offsets[:-1], offsets[1:])]


def estimate_Hp(
    vv_s: Sequence[Values],
    ww_s: Optional[Sequence[Values]] = None,
    K: int = 14,
    m: int = 4,
) -> float:
    """Estimate the rank-order information theory segregation index H^R.

    Arguments:
        vv_s: values (e.g. incomes) grouped by sector; one inner sequence
            per sector.
        ww_s: optional observation weights, same shape as ``vv_s``.
        K: number of rank thresholds; H(p) is evaluated at p = 1/K ... (K-1)/K.
        m: degree of the polynomial fitted to H(p).

    Returns:
        H^R in [0, 1]: 0 means no segregation, 1 means complete segregation.
    """
    rr_s = from_vvs_to_rrs(vv_s, ww_s=ww_s)
    if ww_s is None:
        ww_arr = [np.ones(len(rr)) for rr in rr_s]
    else:
        ww_arr = [np.asarray(ww, dtype=float) for ww in ww_s]

    kk = np.arange(1, K) / K
    w_kk = entropy_p(kk) ** 2

    # Weighted share of each sector's members at or below each rank
    # threshold, then the Theil index of that binary split per threshold.
    tt = [ww.sum() for ww in ww_arr]
    pp = []
    for rr, ww in zip(rr_s, ww_arr):
        order = np.argsort(rr, kind="stable")
        cum_w = np.cumsum(ww[order])
        idx = np.searchsorted(rr[order], kk, side="right")
        below = np.where(idx > 0, cum_w[np.maximum(idx - 1, 0)], 0.0)
        pp.append(below / cum_w[-1])
    pp = np.array(pp)  # shape: (sectors, K-1)
    Hp_kk = np.array([Theil_p(tt, pp[:, i]) for i in range(kk.size)])

    # Weighted least squares fit of H(p) on [1, p, p^2, ..., p^m].
    X = np.vander(kk, m + 1, increasing=True)
    sw = np.sqrt(w_kk)
    betas, *_ = np.linalg.lstsq(X * sw[:, None], Hp_kk * sw, rcond=None)

    deltas = np.array([delta_m(n) for n in range(m + 1)])
    return float(np.sum(betas * deltas))
