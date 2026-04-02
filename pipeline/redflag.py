from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import httpx
from pymongo import MongoClient
from pymongo.database import Database


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_db() -> Database | None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        return None
    return MongoClient(uri).get_default_database()


def domain_penalty(overconfidence_index: float) -> int:
    if overconfidence_index <= 0.1:
        return 0
    return min(30, int(round(overconfidence_index * 300)))


def velocity_points(change: float) -> int:
    value = abs(change)
    if value > 0.15:
        return 25
    if value > 0.10:
        return 15
    if value > 0.05:
        return 8
    return 0


def crowd_size_penalty(num_forecasters: int) -> int:
    if num_forecasters < 10:
        return 20
    if num_forecasters < 25:
        return 12
    if num_forecasters < 50:
        return 5
    return 0


def high_confidence_zone(probability: float) -> int:
    if probability > 0.85 or probability < 0.15:
        return 25
    if probability > 0.75 or probability < 0.25:
        return 15
    return 0


def synthesize(title: str, probability: float, domain: str, flags: list[str]) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    fallback = (
        "This question is in conditions that have historically produced overconfidence, "
        "so current certainty may be overstated relative to underlying uncertainty."
    )
    if not api_key:
        return fallback

    prompt = (
        "You are a calibration analyst. In 2 sentences, explain "
        "why this Metaculus question may be overconfident: "
        f"Title: {title}. Community forecast: {probability:.0%}. "
        f"Domain: {domain}. Flags: {flags}. Be specific and direct."
    )

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "anthropic/claude-sonnet-4-20250514",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                },
            )
            response.raise_for_status()
            payload = response.json()
            return payload["choices"][0]["message"]["content"].strip()
    except Exception:
        return fallback


def run() -> int:
    db = get_db()
    if not db:
        print({"status": "success", "computed": 0, "reason": "MONGODB_URI not set"})
        return 0

    open_questions = list(db["questions"].find({"resolved": False}))
    computed = 0

    for question in open_questions:
        question_id = int(question["metaculus_id"])
        domain = (question.get("domain_tags") or ["unknown"])[0]
        probability = float(question.get("community_prediction") or 0.5)
        num_forecasters = int(question.get("num_forecasters") or 0)

        calibration = db["calibration_scores"].find_one({"domain": domain}) or {}
        overconfidence_index = float(calibration.get("overconfidence_index") or 0.0)
        domain_score = domain_penalty(overconfidence_index)

        since = now_utc() - timedelta(days=14)
        history = list(
            db["forecast_history"].find({"question_id": question_id, "timestamp": {"$gte": since}}, sort=[("timestamp", 1)])
        )
        change = (
            float(history[-1]["community_prediction"] - history[0]["community_prediction"])
            if len(history) >= 2
            else 0.0
        )

        velocity_score = velocity_points(change)
        crowd_score = crowd_size_penalty(num_forecasters)
        confidence_score = high_confidence_zone(probability)

        total = max(0, min(100, domain_score + velocity_score + crowd_score + confidence_score))

        why_flagged: list[str] = []
        if domain_score > 0:
            why_flagged.append(f"Domain overconfidence index is high ({overconfidence_index:.2f}).")
        if velocity_score > 0:
            why_flagged.append(f"Community forecast moved {abs(change):.0%} over the past 14 days.")
        if crowd_score > 0:
            why_flagged.append(f"Only {num_forecasters} forecasters contributed recently.")
        if confidence_score > 0:
            why_flagged.append(f"Forecast sits in a high-confidence zone at {probability:.0%}.")
        if not why_flagged:
            why_flagged.append("No major warning component fired, but baseline uncertainty remains.")

        llm_synthesis = synthesize(str(question.get("title", "")), probability, str(domain), why_flagged)

        db["red_flags"].update_one(
            {"question_id": question_id},
            {
                "$set": {
                    "question_id": question_id,
                    "title": question.get("title", ""),
                    "community_forecast": probability,
                    "red_flag_score": int(total),
                    "why_flagged": why_flagged,
                    "llm_synthesis": llm_synthesis,
                    "domain": domain,
                    "num_forecasters": num_forecasters,
                    "close_time": question.get("close_time"),
                    "computed_at": now_utc(),
                    "score_breakdown": {
                        "domain_penalty": domain_score,
                        "forecast_velocity": velocity_score,
                        "crowd_size_penalty": crowd_score,
                        "high_confidence_zone": confidence_score,
                    },
                }
            },
            upsert=True,
        )
        computed += 1

    print({"status": "success", "computed": computed})
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
