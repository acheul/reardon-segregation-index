# Golden tests: expected values were captured from segindex v0.1.4
# (statsmodels-based implementation) and must be preserved by refactors.
#
# Theory tests at the bottom cross-check building blocks against
# independently coded textbook formulas, so the suite does not rely solely
# on the implementation's own historical outputs.

import math

import numpy as np
import pytest

from segindex import estimate_Hp
from segindex.segregation_index import Theil_p, delta_m, from_vvs_to_rrs

AREA1 = [[80, 80, 70, 70], [50, 45, 40], [20, 20, 20, 10]]
AREA2 = [[80, 70, 50], [80, 70, 45, 20, 20], [40, 20, 10]]

GOLDEN = [
    ("readme_area1", dict(vv_s=AREA1), 0.7181836873727949),
    ("readme_area2", dict(vv_s=AREA2), 0.31911014468247223),
    ("ties", dict(vv_s=[[10, 10, 20, 20], [10, 20, 20, 30], [10, 10, 30, 30]]), 0.09728385942529805),
    # v0.2.0: weighted path switched to cumulative-weight percentiles
    # (previously values were multiplied by weights before ranking).
    (
        "weighted",
        dict(vv_s=AREA2, ww_s=[[1, 2, 1], [1, 1, 2, 1, 1], [2, 1, 1]]),
        0.373215856604312,
    ),
    ("K20", dict(vv_s=AREA1, K=20), 0.7214263124089512),
    ("m3", dict(vv_s=AREA1, m=3), 0.7248087101014236),
    ("separated", dict(vv_s=[[1, 2, 3, 4], [11, 12, 13, 14], [21, 22, 23, 24]]), 0.6443587799989272),
    ("mixed", dict(vv_s=[[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 4]]), 0.0),
    (
        "larger",
        dict(vv_s=[list(range(0, 60, 2)), list(range(10, 100, 3)), list(range(5, 45))]),
        0.1503083540808926,
    ),
]


@pytest.mark.parametrize("name,kwargs,expected", GOLDEN, ids=[g[0] for g in GOLDEN])
def test_golden(name, kwargs, expected):
    assert estimate_Hp(**kwargs) == pytest.approx(expected, abs=1e-8)


def test_mixed_is_less_segregated_than_separated():
    mixed = estimate_Hp([[1, 5, 9], [2, 6, 10], [3, 7, 11]])
    separated = estimate_Hp([[1, 2, 3], [11, 12, 13], [21, 22, 23]])
    assert mixed < separated


def test_accepts_numpy_weights():
    import numpy as np

    ww_s = [np.array([1.0, 2.0, 1.0]), np.array([1.0, 1.0, 2.0, 1.0, 1.0]), np.array([2.0, 1.0, 1.0])]
    result = estimate_Hp(AREA2, ww_s=ww_s)
    assert result == pytest.approx(0.373215856604312, abs=1e-8)


def test_unit_weights_match_unweighted():
    ones = [[1] * len(vv) for vv in AREA2]
    assert estimate_Hp(AREA2, ww_s=ones) == pytest.approx(estimate_Hp(AREA2), abs=1e-12)


def test_weights_are_scale_invariant():
    ww_s = [[1, 2, 1], [1, 1, 2, 1, 1], [2, 1, 1]]
    scaled = [[w * 0.001 for w in ww] for ww in ww_s]
    assert estimate_Hp(AREA2, ww_s=scaled) == pytest.approx(
        estimate_Hp(AREA2, ww_s=ww_s), abs=1e-12
    )


# ---------------------------------------------------------------------------
# Theory cross-checks: compare against independently coded textbook formulas
# rather than this package's own outputs.
# ---------------------------------------------------------------------------

# Sectors with heavily overlapping ranges, so any mid-range threshold splits
# every sector into two non-empty groups.
AREA_OVERLAP = [list(range(0, 60, 2)), list(range(10, 100, 3)), list(range(5, 45))]


def _entropy2(p: float) -> float:
    """Two-group entropy in bits, textbook form (E(0) = E(1) = 0 exactly)."""
    if p <= 0.0 or p >= 1.0:
        return 0.0
    return -(p * math.log2(p) + (1 - p) * math.log2(1 - p))


def _categorical_theil(below: list, totals: list) -> float:
    """Two-group categorical information theory index H.

    Textbook form H = sum_k t_k (E - E_k) / (T E) (Theil 1972; Reardon &
    Firebaugh 2002), written independently of the package internals.
    """
    T = sum(totals)
    E = _entropy2(sum(below) / T)
    return sum(t * (E - _entropy2(b / t)) for b, t in zip(below, totals)) / (T * E)


@pytest.mark.parametrize("threshold", [0.3, 0.5, 0.7])
def test_hp_equals_categorical_theil_of_dichotomized_data(threshold):
    # H(p) is, by definition, the categorical two-group Theil index of the
    # below-p / above-p dichotomy (Reardon 2011).
    rr_s = from_vvs_to_rrs(AREA_OVERLAP)
    below = [int(np.sum(rr <= threshold)) for rr in rr_s]
    totals = [len(rr) for rr in rr_s]
    pp = [b / t for b, t in zip(below, totals)]
    assert all(0 < p < 1 for p in pp)  # stay clear of the 1e-6 entropy clamp

    assert Theil_p(totals, pp) == pytest.approx(
        _categorical_theil(below, totals), abs=1e-12
    )


def test_delta_matches_numerical_integration():
    # delta_m = integral(p^m E(p) dp) / integral(E(p) dp) over [0, 1];
    # verify the closed-form coefficients against plain quadrature.
    p = np.linspace(1e-9, 1 - 1e-9, 200001)
    E = -(p * np.log2(p) + (1 - p) * np.log2(1 - p))
    denom = np.trapezoid(E, p)  # = 1 / (2 ln 2)
    for m in range(6):
        num = np.trapezoid(p**m * E, p)
        assert delta_m(m) == pytest.approx(num / denom, abs=1e-6)
