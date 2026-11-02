"""Server-side verification for Cloudflare Turnstile form challenges."""

import json
import os
import uuid
from urllib.error import URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

from fastapi import HTTPException, Request as FastAPIRequest

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def required() -> bool:
    return bool(os.getenv("TURNSTILE_SECRET_KEY", "").strip()) or (
        os.getenv("VERCEL") == "1"
        or os.getenv("APP_ENV", "").lower() == "production"
        or os.getenv("ENV", "").lower() == "production"
    )


def public_config() -> dict:
    enabled = required()
    return {
        "enabled": enabled,
        "siteKey": os.getenv("TURNSTILE_SITE_KEY", "").strip() if enabled else "",
    }


def _hostname(request: FastAPIRequest) -> str:
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    return (urlsplit(f"//{host.split(',')[0].strip()}").hostname or "").lower()


def verify(token: str, request: FastAPIRequest, action: str, ip: str = "") -> None:
    secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret:
        if required():
            raise HTTPException(503, "Human verification is not configured on the server.")
        return
    if not token.strip():
        raise HTTPException(400, "Complete the human verification challenge and try again.")

    fields = {
        "secret": secret,
        "response": token.strip(),
        "idempotency_key": str(uuid.uuid4()),
    }
    if ip:
        fields["remoteip"] = ip
    req = Request(
        SITEVERIFY_URL,
        data=urlencode(fields).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=8) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (OSError, URLError, TimeoutError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(503, "Human verification is temporarily unavailable. Please try again.") from exc

    if not isinstance(result, dict):
        raise HTTPException(503, "Human verification returned an invalid response. Please try again.")
    if (
        result.get("success") is not True
        or result.get("action") != action
        or str(result.get("hostname", "")).lower() != _hostname(request)
    ):
        raise HTTPException(400, "Human verification expired or failed. Please try again.")
