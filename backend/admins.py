"""Who may use the admin site, and for which company.

Every admin belongs to exactly one company and is either its `owner` (can also manage the company's
admins) or an `admin`. Memberships live in Firestore (`adminMembers`, one document per email), which
the browser cannot read.

Emails in the ADMIN_EMAILS environment variable are support staff: they can open any company (to help
a company that lost access) and are treated as owners there.

Registration: anyone with a confirmed email can create a company and becomes its owner, unless the
server is set to ADMIN_REGISTRATION=closed. If ADMIN_REGISTRATION_CODE is set, creating a company
also needs that code, so only people you gave it to can register.
"""

import hashlib
import hmac
import os
import re
import secrets
import threading
import time

from fastapi import HTTPException
from firebase_admin import firestore

import companies
import fb
from ratelimit import limited

ROLES = ("owner", "admin")
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CACHE_SECONDS = 10
MAX_ADMINS = 50

_lock = threading.Lock()
_cache: dict[str, tuple[float, dict | None]] = {}


def env_emails() -> set[str]:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def registration_closed() -> bool:
    return os.getenv("ADMIN_REGISTRATION", "").strip().lower() == "closed"


def code_required() -> bool:
    return bool(os.getenv("ADMIN_REGISTRATION_CODE", "").strip())


def _members():
    return fb.db().collection("adminMembers")


def _key(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()


def _forget(email: str) -> None:
    with _lock:
        _cache.pop(email, None)


def _clean(data: dict | None) -> dict | None:
    if not isinstance(data, dict):
        return None
    company, role = data.get("companyId"), data.get("role")
    if isinstance(company, str) and companies.valid_id(company) and role in ROLES:
        return {"companyId": company, "role": role}
    return None


def membership(email: str) -> dict | None:
    """{"companyId", "role"} for a member, {"companyId": None, "role": "support"} for support staff."""
    email = (email or "").strip().lower()
    if not email:
        return None
    if email in env_emails():
        return {"companyId": None, "role": "support"}
    with _lock:
        hit = _cache.get(email)
        if hit and time.time() - hit[0] < CACHE_SECONDS:
            return hit[1]
    try:
        snap = _members().document(_key(email)).get()
    except Exception:
        # If the list cannot be read, nobody except server-set support staff is trusted.
        return hit[1] if hit else None
    value = _clean(snap.to_dict()) if snap.exists else None
    with _lock:
        _cache[email] = (time.time(), value)
    return value


def can_register(email: str) -> bool:
    """Whether this email may sign up on the admin site."""
    if membership(email) is not None:
        return True
    return not registration_closed()


def _slug(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:30].strip("-")
    if len(base) < 2:
        base = "company"
    return f"{base}-{secrets.token_hex(2)}"


def create_company(name: str, email: str, uid: str, code: str) -> dict:
    email = email.strip().lower()
    name = " ".join(name.split())
    if len(name) < 2 or len(name) > 60 or re.search(r"[<>{}\\]", name):
        raise HTTPException(400, "Enter your company name (2 to 60 characters).")
    if registration_closed():
        raise HTTPException(403, "New companies cannot be created right now. Ask the person who gave you access.")
    if limited(f"company-create:{uid}", 5, 3600, fail_closed=True):
        raise HTTPException(429, "Too many attempts. Please try again later.")
    expected = os.getenv("ADMIN_REGISTRATION_CODE", "").strip()
    if expected and not hmac.compare_digest(code.strip().encode(), expected.encode()):
        raise HTTPException(403, "That registration code is not correct.")
    if membership(email) is not None:
        raise HTTPException(409, "This email already belongs to a company.")

    client = fb.db()
    member_ref = _members().document(_key(email))
    company_id = _slug(name)
    company_ref = client.collection("companies").document(company_id)

    @firestore.transactional
    def run(tx) -> None:
        if member_ref.get(transaction=tx).exists:
            raise HTTPException(409, "This email already belongs to a company.")
        now = int(time.time() * 1000)
        tx.create(company_ref, {"name": name, "createdAt": now, "createdBy": email})
        tx.set(member_ref, {"email": email, "companyId": company_id, "role": "owner", "addedAt": now})

    run(client.transaction())
    _forget(email)
    companies.forget(company_id)
    return {"id": company_id, "name": name}


def listing(company_id: str) -> list[dict]:
    docs = _members().where("companyId", "==", company_id).limit(MAX_ADMINS + 1).stream()
    people = []
    for doc in docs:
        data = doc.to_dict() or {}
        if isinstance(data.get("email"), str) and data.get("role") in ROLES:
            people.append({"email": data["email"], "role": data["role"], "locked": False})
    return sorted(people, key=lambda p: (p["role"] != "owner", p["email"]))


def _clean_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL.match(email):
        raise HTTPException(400, "Enter a valid email address.")
    return email


def add(company_id: str, email: str, role: str, added_by: str) -> None:
    email = _clean_email(email)
    if role not in ROLES:
        raise HTTPException(400, "Choose owner or admin.")
    if email in env_emails():
        raise HTTPException(409, "That email cannot be added.")

    client = fb.db()
    ref = _members().document(_key(email))

    @firestore.transactional
    def run(tx) -> None:
        snap = ref.get(transaction=tx)
        existing = _clean(snap.to_dict()) if snap.exists else None
        if existing and existing["companyId"] != company_id:
            raise HTTPException(409, "That email already belongs to another company.")
        if existing is None:
            current = _members().where("companyId", "==", company_id).limit(MAX_ADMINS).get(transaction=tx)
            if len(list(current)) >= MAX_ADMINS:
                raise HTTPException(400, f"You can have at most {MAX_ADMINS} admins.")
        tx.set(
            ref,
            {
                "email": email,
                "companyId": company_id,
                "role": role,
                "addedAt": int(time.time() * 1000),
                "addedBy": added_by[:254],
            },
        )

    run(client.transaction())
    _forget(email)


def remove(company_id: str, email: str) -> None:
    email = _clean_email(email)
    client = fb.db()
    ref = _members().document(_key(email))

    @firestore.transactional
    def run(tx) -> None:
        snap = ref.get(transaction=tx)
        existing = _clean(snap.to_dict()) if snap.exists else None
        if not existing or existing["companyId"] != company_id:
            raise HTTPException(404, "That person is not on the list.")
        if existing["role"] == "owner":
            owners = _members().where("companyId", "==", company_id).where("role", "==", "owner").limit(2)
            if len(list(owners.get(transaction=tx))) < 2:
                raise HTTPException(409, "There must always be at least one owner.")
        tx.delete(ref)

    run(client.transaction())
    _forget(email)
