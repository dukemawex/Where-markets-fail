from pipeline.redflag import crowd_size_penalty, domain_penalty, high_confidence_zone, velocity_points


def test_component_thresholds() -> None:
    assert domain_penalty(0.2) == 30
    assert velocity_points(0.16) == 25
    assert velocity_points(0.11) == 15
    assert velocity_points(0.06) == 8
    assert crowd_size_penalty(9) == 20
    assert crowd_size_penalty(24) == 12
    assert high_confidence_zone(0.9) == 25
    assert high_confidence_zone(0.8) == 15
