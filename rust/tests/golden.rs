//! Golden tests: expected values were captured from the Python package
//! `segindex` v0.1.4 and are shared with `src/tests/test_segindex.py`.

use segindex::estimate_hp;

const TOL: f64 = 1e-8;

fn area1() -> Vec<Vec<f64>> {
    vec![
        vec![80.0, 80.0, 70.0, 70.0],
        vec![50.0, 45.0, 40.0],
        vec![20.0, 20.0, 20.0, 10.0],
    ]
}

fn area2() -> Vec<Vec<f64>> {
    vec![
        vec![80.0, 70.0, 50.0],
        vec![80.0, 70.0, 45.0, 20.0, 20.0],
        vec![40.0, 20.0, 10.0],
    ]
}

#[test]
fn readme_examples() {
    assert!((estimate_hp(&area1(), None, 14, 4) - 0.7181836873727949).abs() < TOL);
    assert!((estimate_hp(&area2(), None, 14, 4) - 0.31911014468247223).abs() < TOL);
}

#[test]
fn ties() {
    let vv = vec![
        vec![10.0, 10.0, 20.0, 20.0],
        vec![10.0, 20.0, 20.0, 30.0],
        vec![10.0, 10.0, 30.0, 30.0],
    ];
    assert!((estimate_hp(&vv, None, 14, 4) - 0.09728385942529805).abs() < TOL);
}

#[test]
fn weighted() {
    // v0.2.0 value: cumulative-weight percentiles (shared with the Python golden test).
    let ww = vec![
        vec![1.0, 2.0, 1.0],
        vec![1.0, 1.0, 2.0, 1.0, 1.0],
        vec![2.0, 1.0, 1.0],
    ];
    assert!((estimate_hp(&area2(), Some(&ww), 14, 4) - 0.373215856604312).abs() < TOL);
}

#[test]
fn unit_weights_match_unweighted() {
    let ones: Vec<Vec<f64>> = area2().iter().map(|v| vec![1.0; v.len()]).collect();
    let a = estimate_hp(&area2(), Some(&ones), 14, 4);
    let b = estimate_hp(&area2(), None, 14, 4);
    assert!((a - b).abs() < 1e-12);
}

#[test]
fn k_and_m_variations() {
    assert!((estimate_hp(&area1(), None, 20, 4) - 0.7214263124089512).abs() < TOL);
    assert!((estimate_hp(&area1(), None, 14, 3) - 0.7248087101014236).abs() < TOL);
}

#[test]
fn extremes() {
    let separated = vec![
        vec![1.0, 2.0, 3.0, 4.0],
        vec![11.0, 12.0, 13.0, 14.0],
        vec![21.0, 22.0, 23.0, 24.0],
    ];
    assert!((estimate_hp(&separated, None, 14, 4) - 0.6443587799989272).abs() < TOL);

    let mixed = vec![
        vec![1.0, 2.0, 3.0, 4.0],
        vec![1.0, 2.0, 3.0, 4.0],
        vec![1.0, 2.0, 3.0, 4.0],
    ];
    assert!((estimate_hp(&mixed, None, 14, 4) - 0.0).abs() < TOL);
}

#[test]
fn larger_sample() {
    let vv = vec![
        (0..60).step_by(2).map(f64::from).collect::<Vec<_>>(),
        (10..100).step_by(3).map(f64::from).collect::<Vec<_>>(),
        (5..45).map(f64::from).collect::<Vec<_>>(),
    ];
    assert!((estimate_hp(&vv, None, 14, 4) - 0.1503083540808926).abs() < TOL);
}
