# Review: weighted rank transformation (`ww_s`)

**Status: resolved — fixed in v0.2.0.** Only calls that pass `ww_s` changed;
the default (unweighted) path is bit-for-bit compatible with earlier versions.

## The problem (versions ≤ 0.1.4)

The old weighted path computed

```
ranks = rankdata(values * weights) / N
```

i.e. each value was **multiplied by its weight first**, and the products were
then rank-ordered. That is not a weighted rank:

- It can **invert the ordering of the variable itself**. With A = (income 50,
  weight 2) and B = (income 80, weight 1), A's product (100) outranks B's (80)
  even though B is richer. Weights should determine how much *mass* an
  observation carries in the percentile distribution, not reorder values.
- Normalized ranks still stepped by 1/N — a weight-2 observation did not
  occupy twice the rank mass.
- Sector sizes `t_k` and below-threshold shares `p` used unweighted counts.

## The fix (v0.2.0)

Percentiles now follow the **cumulative weight distribution**, and `t_k` /
below-threshold shares use weighted sums throughout `estimate_Hp`:

1. Sort pooled observations by raw value.
2. Each observation takes the right edge of its weight block in the
   cumulative distribution; a group of tied values splits its pooled weight
   evenly among its members, and every member gets the group's average right
   edge:  `pct = (W_before + G * (g + 1) / (2g)) / W_total`
   where `G` is the group's pooled weight and `g` its member count.
3. Everything downstream is unchanged.

Properties of this convention:

- **Unit weights reduce exactly to `rank/N`** with average ranks for ties
  (scipy's `rankdata` convention) — the unweighted path is unchanged, and
  passing all-ones weights gives identical results to passing no weights
  (covered by tests in both implementations).
- **Scale invariant**: multiplying all weights by a constant changes nothing,
  so normalized sampling weights are safe.
- Percentiles stay in (0, 1].

One deliberate trade-off: with this convention a weight-w observation is not
*exactly* identical to w duplicated rows when ties are involved (the
difference is O(1/N) and vanishes asymptotically). The convention that makes
duplication exact (`pct = (W_before + (G+1)/2) / W`) was rejected because it
breaks for weights < 1 (percentiles can exceed 1), and the textbook midpoint
convention (`W_before + G/2`) was rejected because it would shift the
unweighted path to `(rank-1/2)/N` and change every existing result.

## References

- Reardon, S. F. (2011). "Measures of Income Segregation." Section on the
  rank-order information theory index (H^R).
- Reardon, S. F. & Bischoff, K. (2011). "Income Inequality and Income
  Segregation." AJS 116(4), Appendix A.
