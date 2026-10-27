"""Read unread emails over IMAP and send replies over SMTP, using the signed-in user's own account.

Credentials arrive with each request and are never stored on the server.
"""

import email
import imaplib
import re
import smtplib
import socket
import time
from dataclasses import dataclass
from email.message import EmailMessage
from email.policy import default
from email.utils import parseaddr

from webfetch import FetchError, _public_ip, html_to_text

MAX_BODY = 3800
SEND_LIMIT_PER_HOUR = 20
_sent: dict[str, list[float]] = {}
ADDRESS = re.compile(r"^[^@\s<>,;]{1,64}@[^@\s<>,;]{1,255}\.[^@\s<>,;]{2,}$")
HOSTNAME = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")

# domain -> (imap host, imap port, smtp host, smtp port)
GMAIL = ("imap.gmail.com", 993, "smtp.gmail.com", 465)
OUTLOOK = ("outlook.office365.com", 993, "smtp.office365.com", 587)
YAHOO = ("imap.mail.yahoo.com", 993, "smtp.mail.yahoo.com", 465)
ICLOUD = ("imap.mail.me.com", 993, "smtp.mail.me.com", 587)
ZOHO = ("imap.zoho.com", 993, "smtp.zoho.com", 465)
PROVIDERS = {
    "gmail.com": GMAIL, "googlemail.com": GMAIL,
    "outlook.com": OUTLOOK, "hotmail.com": OUTLOOK, "live.com": OUTLOOK, "msn.com": OUTLOOK,
    "yahoo.com": YAHOO, "ymail.com": YAHOO,
    "icloud.com": ICLOUD, "me.com": ICLOUD,
    "zoho.com": ZOHO,
}


class InboxError(Exception):
    pass


@dataclass
class Account:
    email: str
    password: str
    imap_host: str
    imap_port: int
    smtp_host: str
    smtp_port: int


def _check_host(host: str, port: int):
    if not HOSTNAME.match(host.lower()):
        raise InboxError("That mail server address is not valid.")
    try:
        _public_ip(host, port)
    except FetchError:
        raise InboxError("That mail server address is not allowed or could not be found.")


def build_account(address: str, password: str, imap_host: str = "", smtp_host: str = "") -> Account:
    address = address.strip()
    if not ADDRESS.match(address):
        raise InboxError("Enter a valid email address.")
    domain = address.rsplit("@", 1)[1].lower()
    preset = PROVIDERS.get(domain)
    imap_host = imap_host.strip().lower() or (preset[0] if preset else "")
    smtp_host = smtp_host.strip().lower() or (preset[2] if preset else "")
    if not imap_host or not smtp_host:
        raise InboxError(
            f"We don't know the mail servers for {domain}. Open Advanced and enter them "
            "(your provider's help page lists the IMAP and SMTP server names)."
        )
    imap_port = preset[1] if preset and imap_host == preset[0] else 993
    smtp_port = preset[3] if preset and smtp_host == preset[2] else 465
    _check_host(imap_host, imap_port)
    _check_host(smtp_host, smtp_port)
    # Google shows app passwords in groups of four letters with spaces.
    if domain in ("gmail.com", "googlemail.com"):
        password = password.replace(" ", "")
    return Account(address, password, imap_host, imap_port, smtp_host, smtp_port)


def _friendly(e: Exception) -> str:
    text = str(e)
    low = text.lower()
    if "authenticationfailed" in low or "invalid credentials" in low or "authentication" in low or "login" in low:
        return "Sign-in failed. Check the email address and use an app password, not your normal password."
    if isinstance(e, TimeoutError):
        return "The mail server took too long to answer."
    return f"Could not reach the mail server: {text[:120]}"


def _clean(text: str) -> str:
    return re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text).strip()


def _body(msg: email.message.EmailMessage) -> str:
    part = msg.get_body(preferencelist=("plain", "html"))
    if part is None:
        return ""
    content = part.get_content()
    if part.get_content_type() == "text/html":
        content = html_to_text(content)
    # Drop quoted earlier replies so only the new message is triaged.
    lines = []
    for line in content.splitlines():
        if line.startswith(">"):
            continue
        if re.match(r"^On .+ wrote:$", line.strip()):
            break
        lines.append(line)
    return _clean("\n".join(lines))[:MAX_BODY]


def _pin(host: str, port: int) -> str:
    try:
        return _public_ip(host, port)
    except FetchError:
        raise InboxError("That mail server address is not allowed or could not be found.")


class _PinnedSMTP(smtplib.SMTP):
    # Connects to the address that was just checked, so DNS cannot change the target afterwards.
    def _get_socket(self, host, port, timeout):
        return socket.create_connection((_pin(host, port), port), timeout)


class _PinnedSMTP_SSL(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        sock = socket.create_connection((_pin(host, port), port), timeout)
        return self.context.wrap_socket(sock, server_hostname=self._host)


class _PinnedIMAP(imaplib.IMAP4_SSL):
    def _create_socket(self, timeout):
        sock = socket.create_connection((_pin(self.host, self.port), self.port), timeout)
        return self.ssl_context.wrap_socket(sock, server_hostname=self.host)


def _smtp(acc: Account):
    if acc.smtp_port == 465:
        server = _PinnedSMTP_SSL(acc.smtp_host, acc.smtp_port, timeout=15)
    else:
        server = _PinnedSMTP(acc.smtp_host, acc.smtp_port, timeout=15)
        server.starttls()
    server.login(acc.email, acc.password)
    return server


def verify(acc: Account) -> None:
    """Check that both reading and sending work, so problems show up at connect time."""
    try:
        with _PinnedIMAP(acc.imap_host, acc.imap_port, timeout=15) as imap:
            imap.login(acc.email, acc.password)
        with _smtp(acc):
            pass
    except (imaplib.IMAP4.error, smtplib.SMTPException, OSError) as e:
        raise InboxError(_friendly(e))


def fetch_unread(acc: Account, limit: int = 10) -> list[dict]:
    limit = max(1, min(limit, 20))
    try:
        with _PinnedIMAP(acc.imap_host, acc.imap_port, timeout=15) as imap:
            imap.login(acc.email, acc.password)
            imap.select("INBOX", readonly=True)
            status, data = imap.search(None, "UNSEEN")
            if status != "OK":
                raise InboxError("Could not search the inbox.")
            ids = data[0].split()[-limit:]
            out = []
            for uid in reversed(ids):
                status, parts = imap.fetch(uid, "(BODY.PEEK[])")
                if status != "OK" or not parts or not isinstance(parts[0], tuple):
                    continue
                msg = email.message_from_bytes(parts[0][1], policy=default)
                name, address = parseaddr(str(msg.get("From", "")))
                body = _body(msg)
                if not address or not body:
                    continue
                out.append({
                    "from_name": _clean(name)[:100],
                    "from_email": address[:254],
                    "subject": _clean(str(msg.get("Subject", "")))[:200],
                    "date": str(msg.get("Date", ""))[:60],
                    "message_id": _clean(str(msg.get("Message-ID", "")))[:300],
                    "body": body,
                })
            return out
    except (imaplib.IMAP4.error, OSError) as e:
        raise InboxError(_friendly(e))


def send_reply(acc: Account, to: str, subject: str, body: str, in_reply_to: str = "") -> None:
    to = to.strip()
    if not ADDRESS.match(to):
        raise InboxError("That is not a valid email address.")
    now = time.time()
    recent = [t for t in _sent.get(acc.email.lower(), []) if now - t < 3600]
    if len(recent) >= SEND_LIMIT_PER_HOUR:
        raise InboxError("Hourly sending limit reached. Try again later.")

    msg = EmailMessage()
    try:
        msg["From"] = acc.email
        msg["To"] = to
        msg["Subject"] = subject.strip()[:200] or "Re: your message"
        if in_reply_to and re.match(r"^<[^<>\s]+>$", in_reply_to):
            msg["In-Reply-To"] = in_reply_to
            msg["References"] = in_reply_to
    except ValueError:
        raise InboxError("The subject contains characters that are not allowed.")
    msg.set_content(body)

    try:
        with _smtp(acc) as server:
            server.send_message(msg)
    except (smtplib.SMTPException, OSError) as e:
        raise InboxError(_friendly(e))
    _sent[acc.email.lower()] = recent + [now]
