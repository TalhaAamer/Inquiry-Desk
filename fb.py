"""Firebase Admin setup and sign-in checks for the API."""

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
        cred = credentials.Certificate(path) if path else credentials.ApplicationDefault()
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


def current_user(authorization: str = Header(default="")) -> str:
    """Returns the Firebase user id of the signed-in caller, or rejects the request.

    The caller must also have confirmed their email with a one-time code.
    """
    decoded = _verify(authorization)
    if decoded.get("otpVerified") is not True:
        raise HTTPException(403, "Please confirm your email address first.")
    return decoded["uid"]


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
    if limited(f"ai:{uid}", *AI_LIMIT):
        raise HTTPException(429, "You have reached the hourly limit. Please try again later.")
    return uid
