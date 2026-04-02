from pipeline.calibrate import compute_domain_stats


def test_compute_domain_stats_shape() -> None:
    rows = [
        {"prediction": 0.9, "outcome": 1},
        {"prediction": 0.8, "outcome": 0},
        {"prediction": 0.2, "outcome": 0},
    ]
    stats = compute_domain_stats(rows)
    assert stats["sample_size"] == 3
    assert len(stats["calibration_curve"]) == 10
    assert "brier_score" in stats
    assert "overconfidence_index" in stats
