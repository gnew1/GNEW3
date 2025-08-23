from datetime import timedelta, datetime, timezone

def compute_nps_bucket(answers: dict[str, int]) -> str | None:
    # Detect first nps-like answer (0..10)
    for v in answers.values():
        if isinstance(v, int) and 0 <= v <= 10:
            if v <= 6: return "detractor"
            if v <= 8: return "neutral"
            return "promoter"
    return None

def allow_new_survey(last_dt: datetime | None, frequency_days: int) -> bool:
    if last_dt is None: return True
    return datetime.now(timezone.utc) >= last_dt.replace(tzinfo=timezone.utc) + timedelta(days=frequency_days)

