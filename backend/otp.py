"""Email one-time codes that confirm the address of a new account.

Rules enforced here, on the server only:
- a code is 6 random digits, valid for 15 minutes and usable once
- only a salted keyed hash of the code is stored, never the code itself
- 5 wrong guesses cancel the code, so a new one has to be requested
- a new code can be requested once a minute, 5 times an hour, and replaces the old one
- the code is sent to the address Firebase has on record, never to one the browser supplies
"""

import hashlib
import hmac
import html
import math
import os
import re
import secrets
import smtplib
import ssl
import time
from email.message import EmailMessage

from firebase_admin import auth, firestore

import fb
from ratelimit import limited

CODE_TTL = 15 * 60
MAX_ATTEMPTS = 5
RESEND_AFTER = 60
MAX_SENDS_PER_HOUR = 5
CLAIM = "otpVerified"


class OtpError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _key() -> bytes:
    raw = os.getenv("OTP_SECRET") or os.getenv("EMAIL_ENCRYPTION_KEY")
    if not raw:
        raise OtpError("Email verification is not set up on the server.", 503)
    return hashlib.sha256(b"inquiry-desk-otp:" + raw.encode()).digest()


def _digest(uid: str, code: str, salt: str) -> str:
    return hmac.new(_key(), f"{uid}:{salt}:{code}".encode(), hashlib.sha256).hexdigest()


def _ref(uid: str):
    return fb.db().collection("emailOtps").document(uid)


def mask(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:1]}***@{domain}" if domain else ""


def is_verified(record) -> bool:
    return bool((record.custom_claims or {}).get(CLAIM))


def status(uid: str) -> dict:
    fb.init()
    record = auth.get_user(uid)
    if is_verified(record):
        return {"verified": True}
    out: dict = {"verified": False, "email": mask(record.email or "")}
    snap = _ref(uid).get()
    data = snap.to_dict() if snap.exists else {}
    now = time.time()
    if data.get("hash") and data.get("expiresAt", 0) > now:
        out["expiresIn"] = int(data["expiresAt"] - now)
        out["resendIn"] = max(0, math.ceil(data.get("sentAt", 0) + RESEND_AFTER - now))
    return out


@firestore.transactional
def _reserve(tx, ref, now: float, hashed: str, salt: str):
    snap = ref.get(transaction=tx)
    data = snap.to_dict() if snap.exists else {}
    wait = data.get("sentAt", 0) + RESEND_AFTER - now
    if wait > 0:
        return ("wait", math.ceil(wait))
    sends = [t for t in data.get("sends", []) if now - t < 3600]
    if len(sends) >= MAX_SENDS_PER_HOUR:
        return ("hourly", 0)
    tx.set(
        ref,
        {
            "hash": hashed,
            "salt": salt,
            "attempts": 0,
            "expiresAt": now + CODE_TTL,
            "sentAt": now,
            "sends": sends + [now],
        },
    )
    return ("ok", 0)


def send(uid: str, ip: str) -> dict:
    fb.init()
    record = auth.get_user(uid)
    if is_verified(record):
        return {"verified": True}
    if not record.email:
        raise OtpError("This account has no email address to verify.")
    if limited(f"otp-ip:{ip}", 20, 3600):
        raise OtpError("Too many requests. Please try again later.", 429)

    code = f"{secrets.randbelow(1_000_000):06d}"
    salt = secrets.token_hex(16)
    ref = _ref(uid)
    state, wait = _reserve(fb.db().transaction(), ref, time.time(), _digest(uid, code, salt), salt)
    if state == "wait":
        raise OtpError(f"Please wait {wait} seconds before asking for a new code.", 429)
    if state == "hourly":
        raise OtpError("Too many codes requested. Please try again in an hour.", 429)

    try:
        _deliver(record.email, code, record.display_name or "")
    except Exception:
        # The code never reached the user, so it must not stay valid or count against them.
        ref.update({"hash": firestore.DELETE_FIELD, "sentAt": 0})
        raise OtpError("We could not send the email. Please try again in a moment.", 502)
    return {
        "sent": True,
        "email": mask(record.email),
        "expiresIn": CODE_TTL,
        "resendIn": RESEND_AFTER,
    }


@firestore.transactional
def _check(tx, ref, uid: str, code: str, now: float):
    snap = ref.get(transaction=tx)
    data = snap.to_dict() if snap.exists else {}
    if not data.get("hash"):
        return ("none", 0)
    drop = {"hash": firestore.DELETE_FIELD, "salt": firestore.DELETE_FIELD}
    if data.get("expiresAt", 0) <= now:
        tx.update(ref, drop)
        return ("expired", 0)
    attempts = data.get("attempts", 0)
    if attempts >= MAX_ATTEMPTS:
        tx.update(ref, drop)
        return ("locked", 0)
    if hmac.compare_digest(_digest(uid, code, data["salt"]), data["hash"]):
        tx.update(ref, drop)
        return ("ok", 0)
    attempts += 1
    if attempts >= MAX_ATTEMPTS:
        tx.update(ref, drop)
        return ("locked", 0)
    tx.update(ref, {"attempts": attempts})
    return ("wrong", MAX_ATTEMPTS - attempts)


def verify(uid: str, code: str) -> dict:
    fb.init()
    code = code.strip()
    if not re.fullmatch(r"\d{6}", code):
        raise OtpError("Enter the 6-digit code.")
    if limited(f"otp-verify:{uid}", 15, 900):
        raise OtpError("Too many attempts. Please wait a few minutes.", 429)

    state, left = _check(fb.db().transaction(), _ref(uid), uid, code, time.time())
    if state == "none":
        raise OtpError("There is no active code. Please request a new one.")
    if state == "expired":
        raise OtpError("This code has expired. Please request a new one.")
    if state == "locked":
        raise OtpError("Too many wrong codes. Please request a new one.")
    if state == "wrong":
        raise OtpError(f"That code is not right. {left} {'try' if left == 1 else 'tries'} left.")

    record = auth.get_user(uid)
    auth.set_custom_user_claims(uid, {**(record.custom_claims or {}), CLAIM: True})
    auth.update_user(uid, email_verified=True)
    fb.db().collection("users").document(uid).set(
        {"emailVerified": True, "verifiedAt": int(time.time() * 1000)}, merge=True
    )
    _ref(uid).delete()
    return {"verified": True}


def _deliver(to: str, code: str, name: str) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        if os.getenv("APP_ENV", "development").lower() == "production":
            raise RuntimeError("SMTP is not configured")
        print(
            f"[dev] Verification code for {to}: {code}  "
            "(set SMTP_HOST in .env to send real emails)",
            flush=True,
        )
        return

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    sender = os.getenv("SMTP_FROM") or user
    greeting = f"Hi {name.split(' ')[0]}," if name.strip() else "Hi,"

    msg = EmailMessage()
    msg["Subject"] = "Your Inquiry Desk verification code"
    msg["From"] = f"Inquiry Desk <{sender}>"
    msg["To"] = to
    msg.set_content(
        f"{greeting}\n\nYour Inquiry Desk verification code is {code}.\n"
        "It works for 15 minutes and can be used once.\n\n"
        "If you did not try to sign up, you can ignore this email. "
        "Nobody can use the code without access to this inbox.\n"
    )
    msg.add_alternative(
        f"""<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#161b33">
<p style="font-size:16px">{html.escape(greeting)}</p>
<p style="font-size:15px">Use this code to finish setting up your Inquiry Desk account:</p>
<p style="font-size:34px;font-weight:700;letter-spacing:10px;background:#eef0ff;border-radius:12px;padding:16px;text-align:center;margin:20px 0">{code}</p>
<p style="font-size:13px;color:#5c6684">It works for 15 minutes and can be used once. If you did not try to sign up, you can ignore this email.</p>
</div>""",
        subtype="html",
    )

    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=15, context=context) as smtp:
            if user:
                smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=15) as smtp:
            smtp.starttls(context=context)
            if user:
                smtp.login(user, os.getenv("SMTP_PASSWORD", ""))
            smtp.send_message(msg)
