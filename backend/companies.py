"""Companies (workspaces). Each company has its own admins, site settings and enquiries.

Visitors reach a company through the X-Company-Id header that the website sends (or the COMPANY_ID
environment variable on the server). Without either, the built-in company "default" is used, which
keeps using the original, un-prefixed Firestore locations.
"""

import os
import re
import threading
import time
from contextvars import ContextVar

import fb

DEFAULT = "default"
COMPANY_ID = re.compile(r"^[a-z0-9][a-z0-9-]{2,47}$")
CACHE_SECONDS = 30

_current: ContextVar[str | None] = ContextVar("company", default=None)
_lock = threading.Lock()
_known: dict[str, tuple[float, str | None]] = {}


def valid_id(value: str) -> bool:
    return value == DEFAULT or bool(COMPANY_ID.match(value))


def set_current(header_value: str) -> None:
    """Remembers which company the current request is about. Called once per request."""
    value = (header_value or "").strip().lower()
    _current.set(value if valid_id(value) else None)


def current_id() -> str:
    value = _current.get() or os.getenv("COMPANY_ID", "").strip().lower()
    return value if valid_id(value) else DEFAULT


def _doc(company_id: str):
    return fb.db().collection("companies").document(company_id)


def forget(company_id: str | None = None) -> None:
    with _lock:
        if company_id is None:
            _known.clear()
        else:
            _known.pop(company_id, None)


def name_of(company_id: str) -> str | None:
    """The company's display name, or None when it does not exist."""
    if company_id == DEFAULT:
        return "Default"
    with _lock:
        hit = _known.get(company_id)
        if hit and time.time() - hit[0] < CACHE_SECONDS:
            return hit[1]
    try:
        snap = _doc(company_id).get()
    except Exception:
        return hit[1] if hit else None
    name = None
    if snap.exists:
        value = (snap.to_dict() or {}).get("name")
        name = value if isinstance(value, str) and value else company_id
    with _lock:
        _known[company_id] = (time.time(), name)
    return name


def exists(company_id: str) -> bool:
    return valid_id(company_id) and name_of(company_id) is not None


def list_all(limit: int = 200) -> list[dict]:
    others = []
    for doc in fb.db().collection("companies").limit(limit).stream():
        name = (doc.to_dict() or {}).get("name")
        others.append({"id": doc.id, "name": name if isinstance(name, str) and name else doc.id})
    others.sort(key=lambda c: c["name"].lower())
    return [{"id": DEFAULT, "name": "Default"}, *others]


def settings_ref(company_id: str):
    if company_id == DEFAULT:
        return fb.db().collection("config").document("site")
    return _doc(company_id).collection("settings").document("site")


def enquiries_col(company_id: str):
    if company_id == DEFAULT:
        return fb.db().collection("enquiries")
    return _doc(company_id).collection("enquiries")
