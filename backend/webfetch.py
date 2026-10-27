"""Fetch a public web page as plain text, refusing private or internal addresses."""

import http.client
import ipaddress
import json
import socket
import ssl
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

MAX_BYTES = 1_500_000
MAX_REDIRECTS = 3
TIMEOUT = 10
SKIP_TAGS = {"script", "style", "noscript", "svg", "head", "template"}
BLOCK_TAGS = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article"}


class FetchError(Exception):
    pass


class ThinPage(FetchError):
    """The page loaded but has almost no text, usually because it is built with JavaScript."""

    def __init__(self, title: str):
        super().__init__(
            "This website builds its pages with JavaScript, so only its title"
            + (f' ("{title}")' if title else "")
            + " could be read. Paste your menu, prices and policies instead."
        )


class _PinnedHTTP(http.client.HTTPConnection):
    def __init__(self, host, port, ip, **kw):
        super().__init__(host, port, **kw)
        self._ip = ip

    def connect(self):
        self.sock = socket.create_connection((self._ip, self.port), self.timeout)


class _PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, port, ip, **kw):
        super().__init__(host, port, context=ssl.create_default_context(), **kw)
        self._ip = ip

    def connect(self):
        sock = socket.create_connection((self._ip, self.port), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def _public_ip(host: str, port: int) -> str:
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise FetchError("That address could not be found.")
    ips = {info[4][0] for info in infos}
    if not ips or not all(ipaddress.ip_address(ip).is_global for ip in ips):
        raise FetchError("Only public websites can be read.")
    return sorted(ips)[0]


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.title: list[str] = []
        self.meta: list[str] = []
        self.ld: list[str] = []
        self.skip = 0
        self.in_title = False
        self.in_ld = False

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            key = (a.get("name") or a.get("property") or "").lower()
            if key in ("description", "og:description", "og:title", "og:site_name") and a.get("content"):
                self.meta.append(a["content"].strip())
        elif tag == "script" and "ld+json" in a.get("type", ""):
            self.in_ld = True
        if tag in SKIP_TAGS:
            self.skip += 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "script":
            self.in_ld = False
        if tag in SKIP_TAGS and self.skip:
            self.skip -= 1
        elif tag in BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        if self.in_ld:
            self.ld.append(data)
        if not self.skip:
            self.parts.append(data)


def _lines(text: str) -> str:
    lines = (" ".join(line.split()) for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def html_to_text(html: str) -> str:
    parser = _Text()
    parser.feed(html)
    return _lines("".join(parser.parts))


def page_text(html: str) -> tuple[str, str]:
    """Readable text of a page, with its title, description and structured data first.

    Returns (text, title). Pages built entirely with JavaScript give little more than a title.
    """
    parser = _Text()
    parser.feed(html)
    title = " ".join("".join(parser.title).split())
    head = []
    if title:
        head.append(f"Page title: {title}")
    head += [f"Description: {m}" for m in dict.fromkeys(parser.meta)]
    ld = " ".join("".join(parser.ld).split())[:3000]
    if ld:
        head.append(f"Structured data: {ld}")
    return "\n".join([*head, _lines("".join(parser.parts))]).strip(), title


def post_json(url: str, payload: dict) -> int:
    """POST JSON to a public https webhook (Slack, Teams, Discord, Zapier...). No redirects."""
    parts = urlsplit(url.strip())
    if parts.scheme != "https" or not parts.hostname:
        raise FetchError("Webhook addresses must start with https://")
    port = parts.port or 443
    if port != 443:
        raise FetchError("Only standard web ports are allowed.")
    ip = _public_ip(parts.hostname, port)
    conn = _PinnedHTTPS(parts.hostname, port, ip, timeout=8)
    try:
        path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        body = json.dumps(payload).encode()
        conn.request(
            "POST", path, body=body,
            headers={"Content-Type": "application/json", "User-Agent": "InquiryDesk/1.0"},
        )
        res = conn.getresponse()
        res.read(2000)
        if not 200 <= res.status < 300:
            raise FetchError(f"The webhook answered with status {res.status}.")
        return res.status
    except (OSError, http.client.HTTPException, ssl.SSLError) as e:
        raise FetchError(f"Could not reach the webhook: {e}")
    finally:
        conn.close()


def fetch_text(url: str, limit_chars: int = 20_000) -> str:
    current = url.strip()
    for _ in range(MAX_REDIRECTS + 1):
        parts = urlsplit(current)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            raise FetchError("Enter a full link starting with http:// or https://")
        port = parts.port or (443 if parts.scheme == "https" else 80)
        if port not in (80, 443):
            raise FetchError("Only standard web ports are allowed.")
        ip = _public_ip(parts.hostname, port)
        cls = _PinnedHTTPS if parts.scheme == "https" else _PinnedHTTP
        conn = cls(parts.hostname, port, ip, timeout=TIMEOUT)
        try:
            path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
            conn.request("GET", path, headers={"User-Agent": "InquiryDesk/1.0", "Accept": "text/html,text/plain"})
            res = conn.getresponse()
            if res.status in (301, 302, 303, 307, 308):
                location = res.getheader("Location")
                if not location:
                    raise FetchError("The website redirected without a destination.")
                current = urljoin(current, location)
                continue
            if res.status != 200:
                raise FetchError(f"The website answered with status {res.status}.")
            kind = (res.getheader("Content-Type") or "").lower()
            if "html" not in kind and "text/plain" not in kind:
                raise FetchError("That link is not a web page or text file.")
            raw = res.read(MAX_BYTES)
            charset = res.headers.get_content_charset() or "utf-8"
            text = raw.decode(charset, errors="replace")
            if "html" in kind:
                text, title = page_text(text)
                if len(text) - len(title) < 80:
                    raise ThinPage(title)
            return text[:limit_chars]
        except (OSError, http.client.HTTPException, ssl.SSLError) as e:
            raise FetchError(f"Could not read that website: {e}")
        finally:
            conn.close()
    raise FetchError("The website redirected too many times.")
