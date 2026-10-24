"""Mailbox connections, stored encrypted in Firestore so the browser never keeps the password."""

import os
import time

from cryptography.fernet import Fernet, InvalidToken

import fb
import inbox


def _fernet() -> Fernet:
    key = os.getenv("EMAIL_ENCRYPTION_KEY", "").strip()
    if not key:
        raise inbox.InboxError("Email connections are not available on this server yet.")
    try:
        return Fernet(key.encode())
    except ValueError:
        raise inbox.InboxError("Email connections are not set up correctly on this server.")


def _ref(uid: str):
    return fb.db().collection("emailAccounts").document(uid)


def save(uid: str, acc: inbox.Account, imap_host: str, smtp_host: str) -> None:
    _ref(uid).set(
        {
            "email": acc.email,
            "imap_host": imap_host,
            "smtp_host": smtp_host,
            "secret": _fernet().encrypt(acc.password.encode()).decode(),
            "updatedAt": time.time(),
        }
    )


def info(uid: str) -> dict | None:
    snap = _ref(uid).get()
    if not snap.exists:
        return None
    d = snap.to_dict()
    return {"email": d.get("email", ""), "imap_host": d.get("imap_host", ""), "smtp_host": d.get("smtp_host", "")}


def load(uid: str) -> inbox.Account:
    snap = _ref(uid).get()
    if not snap.exists:
        raise inbox.InboxError("Connect your email first.")
    d = snap.to_dict()
    try:
        password = _fernet().decrypt(d["secret"].encode()).decode()
    except (InvalidToken, KeyError):
        raise inbox.InboxError("Your email connection could not be read. Please connect it again.")
    return inbox.build_account(d["email"], password, d.get("imap_host", ""), d.get("smtp_host", ""))


def delete(uid: str) -> None:
    _ref(uid).delete()
