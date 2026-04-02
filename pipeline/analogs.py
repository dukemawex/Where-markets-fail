from __future__ import annotations

import os
from datetime import datetime, timezone

from pymongo import MongoClient
from pymongo.database import Database


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_db() -> Database | None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    return MongoClient(uri).get_default_database()


def run() -> int:
    db = get_db()
    if not db:
        print({"status": "success", "computed": 0, "reason": "MONGODB_URI not set"})
        return 0

    open_questions = list(db["questions"].find({"resolved": False}))
    resolved_questions = list(db["questions"].find({"resolved": True, "resolution": {"$in": [0, 1]}}))

    computed = 0
    for open_question in open_questions:
        question_id = int(open_question["metaculus_id"])
        domain = (open_question.get("domain_tags") or ["unknown"])[0]
        forecast = float(open_question.get("community_prediction") or 0.5)
        close_time = open_question.get("close_time")

        candidates: list[dict[str, object]] = []
        for resolved in resolved_questions:
            resolved_domain = (resolved.get("domain_tags") or ["unknown"])[0]
            if resolved_domain != domain:
                continue

            resolved_forecast = float(resolved.get("community_prediction") or 0.5)
            if abs(resolved_forecast - forecast) > 0.10:
                continue

            resolved_close_time = resolved.get("close_time")
            day_delta = 999
            if close_time and resolved_close_time:
                day_delta = abs((close_time - resolved_close_time).days)
            if day_delta > 30:
                continue

            candidates.append(
                {
                    "question_id": int(resolved["metaculus_id"]),
                    "title": str(resolved.get("title", "")),
                    "community_forecast": resolved_forecast,
                    "outcome": int(resolved.get("resolution", 0)),
                    "close_time": resolved_close_time,
                    "distance": abs(resolved_forecast - forecast) + day_delta / 1000,
                }
            )

        matches = sorted(candidates, key=lambda row: float(row["distance"]))[:3]
        for match in matches:
            match.pop("distance", None)

        db["analogs"].update_one(
            {"question_id": question_id},
            {
                "$set": {
                    "question_id": question_id,
                    "domain": domain,
                    "community_forecast": forecast,
                    "matches": matches,
                    "computed_at": now_utc(),
                }
            },
            upsert=True,
        )
        computed += 1

    print({"status": "success", "computed": computed})
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
