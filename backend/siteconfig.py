"""Site settings the admin controls from the dashboard: which features are on, the colors
and the editable texts. They live in one Firestore document (`config/site`), which the browser
cannot read directly. Everyone gets it through the public GET /api/config; only admins can change it."""

import re
import threading
import time

from fastapi import Depends, HTTPException

import companies

FEATURES = [
    "screenshots",
    "inboxMode",
    "dictation",
    "readAloud",
    "writingStyle",
    "emailInbox",
    "contactPages",
    "proposals",
    "simulator",
    "knowledgeGaps",
    "samples",
    "contactUs",
]
COLOR_KEYS = ["bg", "card", "ink", "muted", "line", "accent", "on", "ok", "warn", "hot"]
THEMES = ["light", "dark"]

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
TEXT_KEY = re.compile(r"^[a-z][a-zA-Z0-9_.]{0,60}$")
MAX_TEXTS = 300
MAX_TEXT_LENGTH = 400
CACHE_SECONDS = 15

_lock = threading.Lock()
_cache: dict[str, tuple[float, dict]] = {}


def _empty() -> dict:
    return {"features": {}, "colors": {"light": {}, "dark": {}}, "texts": {}, "updatedAt": 0}


def _ref(company_id: str):
    return companies.settings_ref(company_id)


def _clean(raw: dict) -> dict:
    """Keeps only known, well-formed values, so a bad document can never break the site."""
    out = _empty()
    features = raw.get("features")
    if isinstance(features, dict):
        out["features"] = {k: v for k, v in features.items() if k in FEATURES and isinstance(v, bool)}
    colors = raw.get("colors")
    if isinstance(colors, dict):
        for theme in THEMES:
            values = colors.get(theme)
            if isinstance(values, dict):
                out["colors"][theme] = {
                    k: v.lower() for k, v in values.items() if k in COLOR_KEYS and isinstance(v, str) and HEX.match(v)
                }
    texts = raw.get("texts")
    if isinstance(texts, dict):
        out["texts"] = {
            k: v.strip()[:MAX_TEXT_LENGTH]
            for k, v in list(texts.items())[:MAX_TEXTS]
            if isinstance(k, str) and TEXT_KEY.match(k) and isinstance(v, str) and v.strip()
        }
    updated = raw.get("updatedAt")
    out["updatedAt"] = updated if isinstance(updated, (int, float)) else 0
    return out


def load(company_id: str | None = None, fresh: bool = False) -> dict:
    cid = company_id or companies.current_id()
    with _lock:
        hit = _cache.get(cid)
        if not fresh and hit and time.time() - hit[0] < CACHE_SECONDS:
            return hit[1]
    try:
        snap = _ref(cid).get()
        data = _clean(snap.to_dict() or {}) if snap.exists else _empty()
    except Exception:
        # If the settings cannot be read, the site keeps working with its defaults.
        return hit[1] if hit else _empty()
    with _lock:
        if len(_cache) > 500:
            _cache.clear()
        _cache[cid] = (time.time(), data)
    return data


def enabled(feature: str) -> bool:
    return load()["features"].get(feature, True)


def require(feature: str):
    """Route dependency that rejects the request when the admin has turned the feature off."""

    def check() -> None:
        if not enabled(feature):
            raise HTTPException(403, "This feature is turned off right now.")

    return Depends(check)


def save(company_id: str, update: dict, admin_email: str) -> dict:
    """Replaces the company's settings with what the dashboard sent, after checking every value."""
    if not isinstance(update, dict):
        raise HTTPException(400, "Invalid settings.")

    features = update.get("features", {})
    if not isinstance(features, dict) or any(k not in FEATURES or not isinstance(v, bool) for k, v in features.items()):
        raise HTTPException(400, "Unknown feature or invalid value.")

    colors = update.get("colors", {})
    if not isinstance(colors, dict) or any(t not in THEMES for t in colors):
        raise HTTPException(400, "Invalid colors.")
    for values in colors.values():
        if not isinstance(values, dict) or any(
            k not in COLOR_KEYS or not isinstance(v, str) or not HEX.match(v) for k, v in values.items()
        ):
            raise HTTPException(400, "Colors must use the format #RRGGBB.")

    texts = update.get("texts", {})
    if not isinstance(texts, dict) or len(texts) > MAX_TEXTS:
        raise HTTPException(400, "Invalid texts.")
    for k, v in texts.items():
        if not isinstance(k, str) or not TEXT_KEY.match(k) or not isinstance(v, str):
            raise HTTPException(400, "Invalid text entry.")
        if len(v) > MAX_TEXT_LENGTH:
            raise HTTPException(400, f"Texts can be at most {MAX_TEXT_LENGTH} characters.")

    data = _clean({"features": features, "colors": colors, "texts": texts, "updatedAt": time.time() * 1000})
    _ref(company_id).set({**data, "updatedBy": admin_email[:254]})
    with _lock:
        _cache[company_id] = (time.time(), data)
    return data
