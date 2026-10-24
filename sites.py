"""Website contact pages: a business owner creates a page, visitors submit messages,
and the signed-in owner pulls them into Inquiry Desk. Everything is stored in Firestore."""

import re
import secrets
import time
from urllib.parse import urlsplit

import fb
from ratelimit import limited

MAX_SITES_PER_USER = 20
MAX_WAITING = 500
MAX_ORIGINS = 5
IP_LIMIT = (5, 600)  # submissions per IP per site per 10 minutes
SITE_DAILY_LIMIT = 300
CREATE_LIMIT = (10, 3600)  # new contact pages per IP per hour
KEEP_DAYS = 30
ORIGIN_CACHE_SECONDS = 30
EMAIL = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")
COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")

DEFAULT_OPTIONS = {
    "title": "Contact us",
    "greeting": "Send us a message and we will reply by email.",
    "button": "Message us",
    "color": "#3340f5",
    "position": "right",
}

_origin_cache: dict[str, tuple[float, list[str]]] = {}


class SiteError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _sites():
    return fb.db().collection("sites")


def _subs(site_id: str):
    return _sites().document(site_id).collection("submissions")


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


def clean_options(raw: dict | None) -> dict:
    raw = raw or {}

    def text(key: str, max_len: int) -> str:
        value = raw.get(key)
        return value.strip()[:max_len] if isinstance(value, str) and value.strip() else DEFAULT_OPTIONS[key]

    color = raw.get("color")
    position = raw.get("position")
    return {
        "title": text("title", 60),
        "greeting": text("greeting", 200),
        "button": text("button", 30),
        "color": color if isinstance(color, str) and COLOR.match(color) else DEFAULT_OPTIONS["color"],
        "position": position if position in ("left", "right") else DEFAULT_OPTIONS["position"],
    }


def _waiting(site_id: str) -> int:
    result = _subs(site_id).where("pulled", "==", False).count().get()
    return int(result[0][0].value)


def _owned(site_id: str, uid: str):
    snap = _sites().document(site_id).get()
    if not snap.exists:
        raise SiteError("Unknown contact page.", 404)
    data = snap.to_dict()
    if data.get("ownerUid") != uid:
        raise SiteError("Unknown contact page.", 404)
    return snap.reference, data


def _view(site_id: str, data: dict, waiting: int | None = None) -> dict:
    out = {
        "id": site_id,
        "name": data.get("name", ""),
        "origins": data.get("origins", []),
        "options": {**DEFAULT_OPTIONS, **data.get("options", {})},
    }
    if waiting is not None:
        out["waiting"] = waiting
    return out


def list_sites(uid: str) -> list[dict]:
    docs = _sites().where("ownerUid", "==", uid).get()
    rows = sorted(docs, key=lambda d: d.to_dict().get("createdAt", 0))
    return [_view(d.id, d.to_dict(), _waiting(d.id)) for d in rows]


def create_site(uid: str, name: str, origins_raw: str, options: dict | None, ip: str) -> dict:
    name = name.strip()[:80]
    if not name:
        raise SiteError("Give this contact page a name.")
    origins = parse_origins(origins_raw, allow_empty=True)
    if limited(f"create:{ip}", *CREATE_LIMIT):
        raise SiteError("Too many contact pages created. Try again later.", 429)
    owned = _sites().where("ownerUid", "==", uid).count().get()
    if int(owned[0][0].value) >= MAX_SITES_PER_USER:
        raise SiteError(f"You can have at most {MAX_SITES_PER_USER} contact pages.", 400)
    site_id = secrets.token_urlsafe(8)
    data = {
        "ownerUid": uid,
        "name": name,
        "origins": origins,
        "options": clean_options(options),
        "createdAt": time.time(),
    }
    _sites().document(site_id).set(data)
    return _view(site_id, data, 0)


def update_site(uid: str, site_id: str, origins_raw: str, options: dict | None) -> dict:
    origins = parse_origins(origins_raw, allow_empty=True)
    ref, data = _owned(site_id, uid)
    update = {"origins": origins}
    if options is not None:
        update["options"] = clean_options(options)
    ref.update(update)
    _origin_cache.pop(site_id, None)
    return _view(site_id, {**data, **update})


def _origins_of(site_id: str) -> list[str] | None:
    cached = _origin_cache.get(site_id)
    if cached and time.time() - cached[0] < ORIGIN_CACHE_SECONDS:
        return cached[1]
    snap = _sites().document(site_id).get()
    if not snap.exists:
        return None
    origins = snap.to_dict().get("origins", [])
    _origin_cache[site_id] = (time.time(), origins)
    return origins


def allowed_origin(site_id: str, origin: str | None) -> bool:
    if not origin:
        return False
    try:
        origins = _origins_of(site_id)
    except Exception:
        return False
    return bool(origins) and origin.lower() in origins


def public_info(site_id: str) -> dict:
    snap = _sites().document(site_id).get()
    if not snap.exists:
        raise SiteError("Unknown contact page.", 404)
    return {"name": snap.to_dict().get("name", "")}


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
    if limited(f"ip:{site_id}:{ip}", *IP_LIMIT):
        raise SiteError("You are sending messages too fast. Please wait a few minutes.", 429)
    if limited(f"site:{site_id}", SITE_DAILY_LIMIT, 86400):
        raise SiteError("This contact page has reached its daily limit.", 429)
    if not _sites().document(site_id).get().exists:
        raise SiteError("Unknown contact page.", 404)
    subs = _subs(site_id)
    cutoff = time.time() - KEEP_DAYS * 86400
    for old in subs.where("created_at", "<", cutoff).limit(100).get():
        old.reference.delete()
    if _waiting(site_id) >= MAX_WAITING:
        raise SiteError("This contact page is full right now. Please try again later.", 503)
    subs.add(
        {
            "name": name[:100],
            "email": email[:254],
            "message": message[:4000],
            "page_url": page_url[:300],
            "created_at": time.time(),
            "pulled": False,
        }
    )


def waiting_count(uid: str, site_id: str) -> int:
    _owned(site_id, uid)
    return _waiting(site_id)


def pull(uid: str, site_id: str, limit: int, include_pulled: bool) -> list[dict]:
    limit = max(1, min(limit, 20))
    _, site = _owned(site_id, uid)
    if include_pulled:
        rows = list(_subs(site_id).order_by("created_at", direction="DESCENDING").limit(limit).get())
    else:
        rows = sorted(
            _subs(site_id).where("pulled", "==", False).get(),
            key=lambda d: d.to_dict().get("created_at", 0),
            reverse=True,
        )[:limit]
    batch = fb.db().batch()
    for r in rows:
        batch.update(r.reference, {"pulled": True})
    if rows:
        batch.commit()
    out = []
    for r in reversed(rows):
        d = r.to_dict()
        out.append(
            {
                "from_name": d.get("name", ""),
                "from_email": d.get("email", ""),
                "subject": f"Your message to {site.get('name', '')}",
                "date": time.strftime("%Y-%m-%d %H:%M", time.localtime(d.get("created_at", 0))),
                "message_id": "",
                "body": d.get("message", ""),
            }
        )
    return out


def delete_site(uid: str, site_id: str) -> None:
    ref, _ = _owned(site_id, uid)
    while True:
        docs = list(ref.collection("submissions").limit(200).get())
        if not docs:
            break
        batch = fb.db().batch()
        for d in docs:
            batch.delete(d.reference)
        batch.commit()
    ref.delete()
    _origin_cache.pop(site_id, None)
