"""Website contact-form connections: businesses embed a widget, visitors submit messages,
and the owner pulls them into Inquiry Desk with a private secret."""

import hashlib
import hmac
import re
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
from contextlib import contextmanager
from pathlib import Path
from urllib.parse import urlsplit

DB_PATH = Path(__file__).with_name("inquiry_desk.db")
MAX_SITES = 2000
MAX_WAITING = 500
MAX_ORIGINS = 5
IP_LIMIT = (5, 600)  # submissions per IP per site per 10 minutes
SITE_DAILY_LIMIT = 300
CREATE_LIMIT = (10, 3600)  # new connections per IP per hour
KEEP_DAYS = 30
EMAIL = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")

_lock = threading.Lock()
_hits: dict[str, deque] = defaultdict(deque)


class SiteError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sites (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, origins TEXT NOT NULL,
            secret_hash TEXT NOT NULL, created_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL,
            name TEXT, email TEXT, message TEXT NOT NULL, page_url TEXT,
            created_at REAL NOT NULL, pulled INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS idx_sub_site ON submissions(site_id, pulled, id);
        """
    )
    return conn


@contextmanager
def _db():
    conn = _connect()
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _limited(key: str, limit: int, window: int) -> bool:
    now = time.time()
    with _lock:
        q = _hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return True
        q.append(now)
        return False


limited = _limited


def normalize_origin(value: str) -> str:
    value = value.strip()
    if "://" not in value:
        value = f"https://{value}"
    parts = urlsplit(value)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise SiteError("Enter your website address, like https://yourcompany.com")
    host = parts.hostname.lower()
    if "." not in host and host != "localhost":
        raise SiteError("Enter your website address, like https://yourcompany.com")
    port = f":{parts.port}" if parts.port and parts.port not in (80, 443) else ""
    return f"{parts.scheme}://{host}{port}"


def parse_origins(raw: str, allow_empty: bool = False) -> list[str]:
    items = [p for p in re.split(r"[,\s]+", raw.strip()) if p]
    if not items:
        if allow_empty:
            return []
        raise SiteError("Enter your website address, like https://yourcompany.com")
    origins = list(dict.fromkeys(normalize_origin(i) for i in items))
    if len(origins) > MAX_ORIGINS:
        raise SiteError(f"Use at most {MAX_ORIGINS} website addresses.")
    return origins


def create_site(name: str, origins_raw: str, ip: str) -> dict:
    name = name.strip()[:80]
    if not name:
        raise SiteError("Give this form a name.")
    origins = parse_origins(origins_raw, allow_empty=True)
    if _limited(f"create:{ip}", *CREATE_LIMIT):
        raise SiteError("Too many connections created. Try again later.", 429)
    site_id = secrets.token_urlsafe(8)
    secret = secrets.token_urlsafe(24)
    with _db() as db:
        if db.execute("SELECT COUNT(*) FROM sites").fetchone()[0] >= MAX_SITES:
            raise SiteError("The server cannot take more connections.", 503)
        db.execute(
            "INSERT INTO sites VALUES (?,?,?,?,?)",
            (site_id, name, " ".join(origins), _hash(secret), time.time()),
        )
    return {"id": site_id, "secret": secret, "origins": origins}


def update_origins(site_id: str, secret: str, origins_raw: str) -> list[str]:
    origins = parse_origins(origins_raw, allow_empty=True)
    with _db() as db:
        _authorize(db, site_id, secret)
        db.execute("UPDATE sites SET origins = ? WHERE id = ?", (" ".join(origins), site_id))
    return origins


def _site(db: sqlite3.Connection, site_id: str) -> sqlite3.Row:
    row = db.execute("SELECT * FROM sites WHERE id = ?", (site_id,)).fetchone()
    if not row:
        raise SiteError("Unknown website connection.", 404)
    return row


def _authorize(db: sqlite3.Connection, site_id: str, secret: str) -> sqlite3.Row:
    row = _site(db, site_id)
    if not hmac.compare_digest(row["secret_hash"], _hash(secret)):
        raise SiteError("Wrong secret for this website connection.", 403)
    return row


def allowed_origin(site_id: str, origin: str | None) -> bool:
    if not origin:
        return False
    try:
        with _db() as db:
            row = db.execute("SELECT origins FROM sites WHERE id = ?", (site_id,)).fetchone()
    except sqlite3.Error:
        return False
    return bool(row) and origin.lower() in row["origins"].split()


def public_info(site_id: str) -> dict:
    with _db() as db:
        return {"name": _site(db, site_id)["name"]}


def submit(site_id: str, origin: str | None, same_origin: bool, ip: str, name: str, email: str, message: str, page_url: str, honeypot: str) -> None:
    # The hosted contact page lives on this app's own address, so it needs no allowed website.
    if not same_origin and not allowed_origin(site_id, origin):
        raise SiteError("This website is not allowed to send messages here.", 403)
    if honeypot.strip():
        return  # A bot filled the hidden field; pretend it worked.
    message = message.strip()
    email = email.strip()
    name = name.strip()
    if len(message) < 5:
        raise SiteError("Please write a message.")
    if email and not EMAIL.match(email):
        raise SiteError("That email address does not look right.")
    if _limited(f"ip:{site_id}:{ip}", *IP_LIMIT):
        raise SiteError("You are sending messages too fast. Please wait a few minutes.", 429)
    if _limited(f"site:{site_id}", SITE_DAILY_LIMIT, 86400):
        raise SiteError("This form has reached its daily limit.", 429)
    cutoff = time.time() - KEEP_DAYS * 86400
    with _db() as db:
        _site(db, site_id)
        db.execute("DELETE FROM submissions WHERE created_at < ?", (cutoff,))
        waiting = db.execute(
            "SELECT COUNT(*) FROM submissions WHERE site_id = ? AND pulled = 0", (site_id,)
        ).fetchone()[0]
        if waiting >= MAX_WAITING:
            raise SiteError("This form is full right now. Please try again later.", 503)
        db.execute(
            "INSERT INTO submissions (site_id, name, email, message, page_url, created_at) VALUES (?,?,?,?,?,?)",
            (site_id, name[:100], email[:254], message[:4000], page_url[:300], time.time()),
        )


def waiting_count(site_id: str, secret: str) -> int:
    with _db() as db:
        _authorize(db, site_id, secret)
        return db.execute(
            "SELECT COUNT(*) FROM submissions WHERE site_id = ? AND pulled = 0", (site_id,)
        ).fetchone()[0]


def pull(site_id: str, secret: str, limit: int, include_pulled: bool) -> list[dict]:
    limit = max(1, min(limit, 20))
    with _db() as db:
        site = _authorize(db, site_id, secret)
        rows = db.execute(
            "SELECT * FROM submissions WHERE site_id = ? "
            + ("" if include_pulled else "AND pulled = 0 ")
            + "ORDER BY id DESC LIMIT ?",
            (site_id, limit),
        ).fetchall()
        if rows:
            db.executemany(
                "UPDATE submissions SET pulled = 1 WHERE id = ?", [(r["id"],) for r in rows]
            )
    return [
        {
            "from_name": r["name"] or "",
            "from_email": r["email"] or "",
            "subject": f"Your message to {site['name']}",
            "date": time.strftime("%Y-%m-%d %H:%M", time.localtime(r["created_at"])),
            "message_id": "",
            "body": r["message"],
        }
        for r in reversed(rows)
    ]


def delete_site(site_id: str, secret: str) -> None:
    with _db() as db:
        _authorize(db, site_id, secret)
        db.execute("DELETE FROM submissions WHERE site_id = ?", (site_id,))
        db.execute("DELETE FROM sites WHERE id = ?", (site_id,))
