from __future__ import annotations

import math
import os
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_db() -> Database | None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    return MongoClient(uri).get_default_database()


def brier_score(predictions: list[float], outcomes: list[int]) -> float:
    if not predictions:
        return 0.0
    return sum((p - o) ** 2 for p, o in zip(predictions, outcomes)) / len(predictions)


def decile_bin(probability: float) -> int:
    return min(9, max(0, int(math.floor(probability * 10))))


def find_confidence_cliff(bin_stats: list[dict[str, Any]]) -> float | None:
    previous_brier: float | None = None
    cliff: float | None = None
    max_degradation = 0.0
    for idx, entry in enumerate(bin_stats):
        if entry["n"] == 0:
            continue
        current = float(entry["brier"])
        if previous_brier is not None and current > previous_brier and (current - previous_brier) > max_degradation:
            max_degradation = current - previous_brier
            cliff = (idx + 1) / 10
        previous_brier = current
    return cliff


def compute_domain_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    predictions = [float(row["prediction"]) for row in rows]
    outcomes = [int(row["outcome"]) for row in rows]

    buckets: list[list[dict[str, Any]]] = [[] for _ in range(10)]
    for row in rows:
        buckets[decile_bin(float(row["prediction"]))].append(row)

    calibration_curve: list[dict[str, Any]] = []
    overconfidence_index = 0.0
    bin_stats: list[dict[str, Any]] = []

    for idx, bucket in enumerate(buckets):
        n = len(bucket)
        if n == 0:
            predicted = 0.0
            actual = 0.0
            brier = 0.0
        else:
            predicted = sum(float(item["prediction"]) for item in bucket) / n
            actual = sum(int(item["outcome"]) for item in bucket) / n
            brier = sum((float(item["prediction"]) - int(item["outcome"])) ** 2 for item in bucket) / n

        calibration_curve.append({"bin": f"{idx*10}-{(idx+1)*10}%", "predicted": predicted, "actual": actual, "n": n})
        bin_stats.append({"brier": brier, "n": n})

        if idx >= 5 and n > 0:
            overconfidence_index += predicted - actual

    return {
        "brier_score": brier_score(predictions, outcomes),
        "calibration_curve": calibration_curve,
        "overconfidence_index": overconfidence_index,
        "confidence_cliff": find_confidence_cliff(bin_stats),
        "sample_size": len(rows),
    }


def run() -> int:
    db = get_db()
    if not db:
        print({"status": "success", "computed": 0, "reason": "MONGODB_URI not set"})
        return 0

    resolved_questions = list(
        db["questions"].find(
            {"resolved": True, "resolution": {"$in": [0, 1]}},
            {"metaculus_id": 1, "domain_tags": 1, "resolution": 1},
        )
    )
    question_map = {int(q["metaculus_id"]): q for q in resolved_questions}
    histories = db["forecast_history"].find({"question_id": {"$in": list(question_map.keys())}})

    by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in histories:
        question = question_map.get(int(row["question_id"]))
        if not question:
            continue
        domains = question.get("domain_tags") or ["unknown"]
        prediction = float(row.get("community_prediction", 0.5))
        outcome = int(question.get("resolution", 0))
        for domain in domains:
            by_domain[str(domain)].append({"prediction": prediction, "outcome": outcome})

    computed = 0
    for domain, samples in by_domain.items():
        stats = compute_domain_stats(samples)
        db["calibration_scores"].update_one(
            {"domain": domain},
            {"$set": {"domain": domain, **stats, "computed_at": now_utc()}},
            upsert=True,
        )
        computed += 1

    print({"status": "success", "computed": computed})
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
