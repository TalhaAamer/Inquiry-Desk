"""Public newsletter waitlist signups."""

import hashlib
import re
import time

from firebase_admin import firestore
from google.api_core.exceptions import GoogleAPICallError

import fb
from ratelimit import limited

EMAIL = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")


class NewsletterError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def subscribe(ip: str, email: str, website: str, consent: bool) -> None:
    if website.strip():
        return
    address = email.strip().lower()
    if not EMAIL.fullmatch(address):
        raise NewsletterError("Please enter a valid email address.")
    if not consent:
        raise NewsletterError("Please agree to receive newsletter emails.")
    if limited(f"newsletter-ip:{ip}", 5, 3600, fail_closed=True):
        raise NewsletterError("Too many signup attempts. Please try again later.", 429)

    email_hash = hashlib.sha256(address.encode()).hexdigest()
    if limited(f"newsletter-email:{email_hash}", 3, 86400, fail_closed=True):
        raise NewsletterError("Too many signup attempts. Please try again tomorrow.", 429)

    try:
        db = fb.db()
        reference = db.collection("newsletterSubscribers").document(email_hash)

        @firestore.transactional
        def save_subscription(transaction) -> None:
            snapshot = reference.get(transaction=transaction)
            now = time.time()
            data = {
                "email": address,
                "status": "active",
                "consent": True,
                "source": "homepage",
                "updatedAt": now,
            }
            if not snapshot.exists:
                data["createdAt"] = now
            transaction.set(reference, data, merge=True)

        save_subscription(db.transaction())
    except GoogleAPICallError as exc:
        raise NewsletterError("Signup could not be saved right now. Please try again later.", 503) from exc
