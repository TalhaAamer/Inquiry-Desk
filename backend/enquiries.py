"""Messages sent through the public Contact page of Inquiry Desk itself.
They are stored in Firestore (collection `enquiries`), which the browser cannot read."""

import re
import time

import fb
from ratelimit import limited

CATEGORIES = [
    "General question",
    "How a feature works",
    "Help with my account",
    "Report a problem",
    "Feature request",
    "Pricing and plans",
    "Partnership",
    "Feedback",
    "Other",
]
SERVICES = [
    "Not sure yet",
    "Smart triage",
    "Replies from your facts",
    "Reply guard and privacy shield",
    "Contact page and QR code",
    "Email inbox",
    "Customer memory",
    "Alerts",
    "Writing style and voice",
]
CONTACT_METHODS = ["Email", "Phone", "WhatsApp"]

IP_LIMIT = (5, 3600)  # messages per IP per hour
DAILY_LIMIT = 500
EMAIL = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")
PHONE = re.compile(r"^\+?[0-9][0-9 ()\-]{5,24}$")


class EnquiryError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def submit(ip: str, data: dict) -> None:
    if str(data.get("website", "")).strip():
        return  # A bot filled the hidden field; pretend it worked.

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    category = str(data.get("category", "")).strip()
    service = str(data.get("service", "")).strip() or "Not sure yet"
    method = str(data.get("method", "")).strip() or "Email"
    message = str(data.get("message", "")).strip()

    if len(name) < 2:
        raise EnquiryError("Please enter your name.")
    if not EMAIL.match(email):
        raise EnquiryError("That email address does not look right.")
    if phone and not PHONE.match(phone):
        raise EnquiryError("That phone number does not look right.")
    if category not in CATEGORIES:
        raise EnquiryError("Please choose what your message is about.")
    if service not in SERVICES:
        raise EnquiryError("Please choose a service from the list.")
    if method not in CONTACT_METHODS:
        raise EnquiryError("Please choose how we should reply.")
    if method in ("Phone", "WhatsApp") and not phone:
        raise EnquiryError(f"Please add your phone number so we can reach you by {method}.")
    if len(message) < 10:
        raise EnquiryError("Please write a little more so we can help.")

    if limited(f"enquiry-ip:{ip}", *IP_LIMIT):
        raise EnquiryError("You are sending messages too fast. Please try again later.", 429)
    if limited("enquiry-day", DAILY_LIMIT, 86400):
        raise EnquiryError("We are receiving a lot of messages. Please try again tomorrow.", 429)

    fb.db().collection("enquiries").add(
        {
            "name": name[:100],
            "email": email[:254],
            "phone": phone[:30],
            "category": category,
            "service": service,
            "method": method,
            "message": message[:4000],
            "createdAt": time.time(),
            "status": "new",
        }
    )
