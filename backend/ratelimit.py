"""Sliding-window rate limits.

Locally the counters live in memory. On Vercel every request can run on a
different instance, so the counters are kept in Firestore instead.
"""

import hashlib
import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)

SHARED = bool(os.getenv("VERCEL")) or os.getenv("RATE_LIMIT_STORE") == "firestore"


def _memory(key: str, limit: int, window: int) -> bool:
    now = time.time()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False


def _firestore(key: str, limit: int, window: int) -> bool:
    from firebase_admin import firestore

    import fb

    client = fb.db()
    ref = client.collection("rateLimits").document(hashlib.sha256(key.encode()).hexdigest())

    @firestore.transactional
    def run(tx) -> bool:
        now = time.time()
        snap = ref.get(transaction=tx)
        data = snap.to_dict() if snap.exists else {}
        start, count = data.get("start", 0), data.get("count", 0)
        if now - start >= window:
            start, count = now, 0
        if count >= limit:
            return True
        tx.set(
            ref,
            {
                "start": start,
                "count": count + 1,
                "expireAt": datetime.fromtimestamp(start + window, timezone.utc) + timedelta(hours=1),
            },
        )
        return False

    return run(client.transaction())


def limited(key: str, limit: int, window: int) -> bool:
    if SHARED:
        try:
            return _firestore(key, limit, window)
        except Exception:
            pass  # fall back to the per-instance limit
    return _memory(key, limit, window)