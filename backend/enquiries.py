"""Messages sent through the public Contact page of Inquiry Desk itself.
They are stored in Firestore (collection `enquiries`), which the browser cannot read."""

import re
import time

import companies
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
STATUSES = ["new", "read", "done"]

IP_LIMIT = (5, 3600)  # messages per IP per hour
DAILY_LIMIT = 500
EMAIL = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")
PHONE = re.compile(r"^\+?[0-9][0-9 ()\-]{5,24}$")


class EnquiryError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _public(doc) -> dict:
    data = doc.to_dict() or {}
    out = {"id": doc.id}
    for key in ("name", "email", "phone", "category", "service", "method", "message", "status"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            out[key] = value
    if out.get("service") == "Not sure yet":
        out.pop("service")  # the form's default, so the visitor did not pick one
    out["createdAt"] = data.get("createdAt") if isinstance(data.get("createdAt"), (int, float)) else 0
    out.setdefault("status", "new")
    return out


def list_all(company_id: str, limit: int = 300) -> list[dict]:
    """Newest first. Fields the visitor left empty are left out."""
    docs = companies.enquiries_col(company_id).order_by("createdAt", direction="DESCENDING").limit(limit).stream()
    return [_public(d) for d in docs]


def set_status(company_id: str, enquiry_id: str, status: str) -> None:
    if status not in STATUSES:
        raise EnquiryError("Unknown status.")
    ref = companies.enquiries_col(company_id).document(enquiry_id)
    if not ref.get().exists:
        raise EnquiryError("That message no longer exists.", 404)
    ref.update({"status": status})


def delete(company_id: str, enquiry_id: str) -> None:
    companies.enquiries_col(company_id).document(enquiry_id).delete()


def submit(ip: str, data: dict) -> None:
    if str(data.get("website", "")).strip():
        return  # A bot filled the hidden field; pretend it worked.

    company_id = companies.current_id()
    if not companies.exists(company_id):
        raise EnquiryError("This contact form is not available.", 404)

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

    if limited(f"enquiry-ip:{ip}", *IP_LIMIT, fail_closed=True):
        raise EnquiryError("You are sending messages too fast. Please try again later.", 429)
    if limited(f"enquiry-day:{company_id}", DAILY_LIMIT, 86400, fail_closed=True):
        raise EnquiryError("We are receiving a lot of messages. Please try again tomorrow.", 429)

    companies.enquiries_col(company_id).add(
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
