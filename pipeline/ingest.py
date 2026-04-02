from __future__ import annotations

import argparse
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

API_BASE = "https://www.metaculus.com/api/questions"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def get_db() -> Database | None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    return MongoClient(uri).get_default_database()


def ensure_indexes(db: Database) -> None:
    db["questions"].create_index("metaculus_id", unique=True)
    db["forecast_history"].create_index([("question_id", ASCENDING), ("timestamp", ASCENDING)], unique=True)
    db["ingestion_logs"].create_index("run_id", unique=True)


def request_with_backoff(
    client: httpx.Client,
    url: str,
    headers: dict[str, str],
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    attempts = 0
    while True:
        response = client.get(url, headers=headers, params=params, timeout=30.0)
        if response.status_code != 429:
            response.raise_for_status()
            return response.json()
        delay = min(2**attempts, 60)
        time.sleep(delay)
        attempts += 1


def extract_domain_tags(question: dict[str, Any]) -> list[str]:
    categories = question.get("categories") or []
    out: list[str] = []
    for category in categories:
        if isinstance(category, dict):
            value = category.get("name") or category.get("slug")
            if value:
                out.append(str(value))
        elif isinstance(category, str):
            out.append(category)
    return out


def normalize_question(raw: dict[str, Any]) -> dict[str, Any]:
    community_prediction = raw.get("community_prediction")
    if isinstance(community_prediction, dict):
        community_prediction = community_prediction.get("q2")

    return {
        "metaculus_id": int(raw["id"]),
        "title": str(raw.get("title", "")),
        "description": str(raw.get("description", "")),
        "resolution": raw.get("resolution"),
        "resolved_at": parse_dt(raw.get("resolve_time") or raw.get("resolved_at")),
        "created_at": parse_dt(raw.get("created_time")) or now_utc(),
        "close_time": parse_dt(raw.get("close_time")) or now_utc(),
        "domain_tags": extract_domain_tags(raw),
        "num_forecasters": int(raw.get("nr_forecasters") or 0),
        "community_prediction": float(community_prediction)
        if isinstance(community_prediction, (int, float))
        else None,
        "resolved": bool(raw.get("status") == "resolved" or raw.get("resolution") is not None),
    }


def normalize_history(question_id: int, payload: dict[str, Any]) -> list[dict[str, Any]]:
    history = payload.get("history") or payload.get("results") or []
    normalized: list[dict[str, Any]] = []
    for item in history:
        timestamp = parse_dt(item.get("t") or item.get("timestamp") or item.get("time"))
        prediction = item.get("x2") if "x2" in item else item.get("community_prediction")
        forecasters = item.get("forecasters") if "forecasters" in item else item.get("num_forecasters", 0)
        if timestamp and isinstance(prediction, (int, float)):
            normalized.append(
                {
                    "question_id": question_id,
                    "timestamp": timestamp,
                    "community_prediction": float(prediction),
                    "num_forecasters": int(forecasters or 0),
                }
            )
    return normalized


def upsert_question(collection: Collection, question: dict[str, Any]) -> None:
    collection.update_one({"metaculus_id": question["metaculus_id"]}, {"$set": question}, upsert=True)


def upsert_history(collection: Collection, records: list[dict[str, Any]]) -> int:
    inserted = 0
    for record in records:
        collection.update_one(
            {"question_id": record["question_id"], "timestamp": record["timestamp"]},
            {"$set": record},
            upsert=True,
        )
        inserted += 1
    return inserted


def run(limit: int | None, full_sync: bool) -> int:
    token = os.getenv("METACULUS_TOKEN", "")
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    db = get_db()
    run_id = str(uuid.uuid4())
    started_at = now_utc()
    errors: list[str] = []
    question_count = 0
    forecast_count = 0

    logs = db["ingestion_logs"] if db else None
    if db:
        ensure_indexes(db)
        logs.update_one(
            {"run_id": run_id},
            {
                "$set": {
                    "run_id": run_id,
                    "started_at": started_at,
                    "completed_at": None,
                    "status": "running",
                    "questions_fetched": 0,
                    "forecasts_fetched": 0,
                    "errors": [],
                }
            },
            upsert=True,
        )

    status = "success"
    try:
        with httpx.Client() as client:
            offset = 0
            while True:
                if limit is not None and question_count >= limit:
                    break
                page = request_with_backoff(
                    client,
                    f"{API_BASE}/",
                    headers,
                    params={"status": "resolved", "limit": 100, "offset": offset},
                )
                results = page.get("results") or []
                if not results:
                    break

                for raw in results:
                    if limit is not None and question_count >= limit:
                        break
                    qdoc = normalize_question(raw)
                    qid = qdoc["metaculus_id"]
                    if db:
                        upsert_question(db["questions"], qdoc)

                    should_fetch_history = True
                    if db and not full_sync:
                        should_fetch_history = (
                            db["forecast_history"].find_one({"question_id": qid}, {"_id": 1}) is None
                        )

                    if should_fetch_history:
                        try:
                            payload = request_with_backoff(
                                client,
                                f"{API_BASE}/{qid}/forecast-history/",
                                headers,
                            )
                            records = normalize_history(qid, payload)
                            forecast_count += upsert_history(db["forecast_history"], records) if db else len(records)
                        except Exception as exc:  # pragma: no cover
                            errors.append(f"history_{qid}: {exc}")

                    question_count += 1
                offset += 100
    except Exception as exc:  # pragma: no cover
        status = "failed"
        errors.append(str(exc))

    if errors:
        status = "failed"

    if logs:
        logs.update_one(
            {"run_id": run_id},
            {
                "$set": {
                    "completed_at": now_utc(),
                    "status": status,
                    "questions_fetched": question_count,
                    "forecasts_fetched": forecast_count,
                    "errors": errors,
                }
            },
            upsert=True,
        )

    print(
        {
            "run_id": run_id,
            "status": status,
            "questions_fetched": question_count,
            "forecasts_fetched": forecast_count,
            "errors": errors,
        }
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raise SystemExit(run(limit=args.limit, full_sync=os.getenv("FULL_SYNC", "false").lower() == "true"))
