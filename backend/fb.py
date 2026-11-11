"""Firebase Admin setup and sign-in checks for the API."""

import base64
import json
import os
import re
import time

import firebase_admin
from fastapi import Header, HTTPException
from firebase_admin import auth, credentials, firestore

from ratelimit import limited

AI_LIMIT = (300, 3600)  # AI requests per user per hour

_app: firebase_admin.App | None = None


def init() -> firebase_admin.App:
    global _app
    if _app is None:
        path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        raw = os.getenv("FIREBASE_SERVICE_ACCOUNT", "").strip()
        if raw:
            if not raw.startswith("{"):
                raw = base64.b64decode(raw).decode()
            cred = credentials.Certificate(json.loads(raw))
        elif path:
            cred = credentials.Certificate(path)
        else:
            cred = credentials.ApplicationDefault()
        options = {"projectId": os.getenv("FIREBASE_PROJECT_ID")} if os.getenv("FIREBASE_PROJECT_ID") else None
        _app = firebase_admin.initialize_app(cred, options)
    return _app


def db():
    init()
    return firestore.client()


def _verify(authorization: str) -> dict:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Please sign in.")
    init()
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(401, "Your session expired. Please sign in again.")


def token_user(authorization: str = Header(default="")) -> dict:
    """The signed-in caller, even if their email is not confirmed yet. Only the sign-up steps use this."""
    return _verify(authorization)


def has_verified_email(decoded: dict) -> bool:
    email = decoded.get("email")
    return (
        isinstance(email, str)
        and bool(email)
        and decoded.get("otpVerified") is True
        and decoded.get("email_verified") is True
        and decoded.get("otpVerifiedEmail") == email
    )


def current_user(authorization: str = Header(default="")) -> str:
    """Returns the Firebase user id of the signed-in caller, or rejects the request.

    The caller must also have confirmed their email with a one-time code.
    """
    decoded = _verify(authorization)
    if not has_verified_email(decoded):
        raise HTTPException(403, "Please confirm your email address first.")
    return decoded["uid"]


def _membership(decoded: dict) -> dict | None:
    import admins

    email = str(decoded.get("email") or "").lower()
    if not has_verified_email(decoded) or not email:
        return None
    return admins.membership(email)


def _role(decoded: dict) -> str | None:
    found = _membership(decoded)
    return found["role"] if found else None


def verified_token(authorization: str = Header(default="")) -> dict:
    """The decoded token of a signed-in caller who has confirmed their email."""
    decoded = _verify(authorization)
    if not has_verified_email(decoded):
        raise HTTPException(403, "Please confirm your email address first.")
    return decoded


def is_admin_token(decoded: dict) -> bool:
    return _role(decoded) is not None


def admin_role(decoded: dict) -> str | None:
    return _role(decoded)


def _admin(authorization: str, company_header: str) -> dict:
    import companies

    decoded = _verify(authorization)
    found = _membership(decoded)
    if found is None:
        raise HTTPException(404, "Not found.")
    if limited(f"admin:{decoded['uid']}", 240, 3600, fail_closed=True):
        raise HTTPException(429, "Too many requests. Try again later.")
    company_id, role = found["companyId"], found["role"]
    if role == "support":
        # Support staff pick which company they are helping; they act as its owner.
        company_id = company_header.strip().lower()
        if not companies.exists(company_id):
            raise HTTPException(400, "Choose a company first.")
        role = "owner"
    return {**decoded, "companyId": company_id, "adminRole": role}


def admin_user(authorization: str = Header(default=""), x_company_id: str = Header(default="")) -> dict:
    """Allows only admins, scoped to their company. Everyone else gets 404, so the dashboard's existence is not revealed."""
    return _admin(authorization, x_company_id)


def owner_user(authorization: str = Header(default=""), x_company_id: str = Header(default="")) -> dict:
    """Allows only owners (they manage who else is an admin)."""
    decoded = _admin(authorization, x_company_id)
    if decoded["adminRole"] != "owner":
        raise HTTPException(403, "Only an owner can do this.")
    return decoded


_BAD_NAME_CHARS = re.compile(r"[0-9<>{}\[\]()\\/@:;|\"=+*%$#!?^~_&\x00-\x1f]")


def clean_name(value: str, label: str) -> str:
    value = " ".join(value.split())
    if not value or len(value) > 50 or _BAD_NAME_CHARS.search(value):
        raise HTTPException(400, f"Please enter a valid {label}.")
    return value


def save_name(uid: str, first: str, last: str) -> dict:
    """Stores the person's name on the account and on their profile document."""
    first = clean_name(first, "first name")
    last = clean_name(last, "last name")
    init()
    auth.update_user(uid, display_name=f"{first} {last}")
    db().collection("users").document(uid).set(
        {"firstName": first, "lastName": last, "name": f"{first} {last}"}, merge=True
    )
    return {"firstName": first, "lastName": last}


def record_sign_in(authorization: str = Header(default="")) -> dict:
    """Saves who the user is on their account document, using details Firebase has verified."""
    decoded = _verify(authorization)
    uid = decoded["uid"]
    record = auth.get_user(uid)
    now = int(time.time() * 1000)
    ref = db().collection("users").document(uid)
    profile = {
        "email": record.email or "",
        "photoURL": record.photo_url or "",
        "provider": (decoded.get("firebase") or {}).get("sign_in_provider", ""),
        "emailVerified": bool(record.email_verified),
        "lastLoginAt": now,
    }
    existing = ref.get()
    data = existing.to_dict() or {} if existing.exists else {}
    # A name is only written when there is one, so a sign-in never erases a name saved at sign-up.
    if record.display_name:
        profile["name"] = record.display_name
        if "firstName" not in data:
            first, _, last = record.display_name.partition(" ")
            profile["firstName"] = first
            profile["lastName"] = last.strip()
    if "createdAt" not in data:
        profile["createdAt"] = int(record.user_metadata.creation_timestamp or now)
    ref.set(profile, merge=True)
    return profile


def ai_user(authorization: str = Header(default="")) -> str:
    """Same as current_user, plus a per-user hourly limit so one account cannot run up AI costs."""
    uid = current_user(authorization)
    if limited(f"ai:{uid}", *AI_LIMIT, fail_closed=True):
        raise HTTPException(429, "You have reached the hourly limit. Please try again later.")
    return uid
