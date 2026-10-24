"""In-memory sliding-window rate limits (per server process)."""

import threading
import time
from collections import defaultdict, deque

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


def limited(key: str, limit: int, window: int) -> bool:
    now = time.time()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False
