/*
 * Inquiry Desk contact widget.
 * Add to any website:
 *   <script src="https://YOUR-APP/widget.js" data-site="YOUR_SITE_ID" async></script>
 * Optional attributes: data-title, data-greeting, data-button, data-color, data-position (left|right), data-api
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script || window.__inquiryDeskWidget) return;
  var site = script.getAttribute("data-site");
  if (!site) {
    console.warn("Inquiry Desk widget: add data-site to the script tag.");
    return;
  }
  window.__inquiryDeskWidget = true;

  var api = (script.getAttribute("data-api") || new URL(script.src, location.href).origin).replace(/\/$/, "");
  var title = script.getAttribute("data-title") || "Contact us";
  var greeting = script.getAttribute("data-greeting") || "Send us a message and we will reply by email.";
  var label = script.getAttribute("data-button") || "Message us";
  var color = /^#[0-9a-f]{3,8}$/i.test(script.getAttribute("data-color") || "") ? script.getAttribute("data-color") : "#3340f5";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";

  // Pick black or white text so the button stays readable on any brand color.
  function onColor(hex) {
    var h = hex.slice(1);
    if (h.length < 6) h = h.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111" : "#fff";
  }
  var on = onColor(color);

  var host = document.createElement("div");
  host.style.cssText = "all:initial;position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" +
    ":host{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    "*{box-sizing:border-box;font-family:inherit}" +
    ".btn{display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 18px;font-size:15px;font-weight:600;cursor:pointer;background:" + color + ";color:" + on + ";box-shadow:0 6px 20px rgba(0,0,0,.25)}" +
    ".btn:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid " + color + ";outline-offset:2px}" +
    ".panel{position:absolute;bottom:60px;" + side + ":0;width:min(360px,calc(100vw - 40px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;color:#1a1f36;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);padding:18px}" +
    ".panel[hidden]{display:none}" +
    "h2{margin:0 0 4px;font-size:18px}p{margin:0 0 12px;font-size:14px;color:#5b6477}" +
    "label{display:block;font-size:13px;font-weight:600;margin:10px 0 4px}" +
    "input,textarea{width:100%;border:1px solid #cfd5e3;border-radius:10px;padding:9px 11px;font-size:14px;color:#1a1f36;background:#fff}" +
    "textarea{min-height:90px;resize:vertical}" +
    ".send{margin-top:12px;width:100%;border:0;border-radius:10px;padding:11px;font-size:15px;font-weight:600;cursor:pointer;background:" + color + ";color:" + on + "}" +
    ".send[disabled]{opacity:.6;cursor:default}" +
    ".msg{margin-top:10px;font-size:13px}.err{color:#c62828}.ok{color:#1b7f5c;font-size:15px}" +
    ".close{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:#5b6477}" +
    ".hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}" +
    "@media(prefers-reduced-motion:no-preference){.panel{animation:pop .15s ease-out}@keyframes pop{from{opacity:0;transform:translateY(6px)}}}" +
    "</style>" +
    '<button class="btn" type="button" aria-haspopup="dialog" aria-expanded="false"></button>' +
    '<div class="panel" role="dialog" aria-label="" hidden>' +
    '<button class="close" type="button" aria-label="Close">&times;</button>' +
    '<form novalidate><h2></h2><p class="greet"></p>' +
    '<label for="idw-name">Your name</label><input id="idw-name" name="name" autocomplete="name" maxlength="100">' +
    '<label for="idw-email">Email</label><input id="idw-email" name="email" type="email" autocomplete="email" maxlength="254" required>' +
    '<label for="idw-msg">Message</label><textarea id="idw-msg" name="message" maxlength="4000" required></textarea>' +
    '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
    '<button class="send" type="submit">Send message</button>' +
    '<div class="msg" role="status" aria-live="polite"></div></form></div>';

  var btn = root.querySelector(".btn");
  var panel = root.querySelector(".panel");
  var form = root.querySelector("form");
  var out = root.querySelector(".msg");
  var send = root.querySelector(".send");
  btn.textContent = label;
  root.querySelector("h2").textContent = title;
  root.querySelector(".greet").textContent = greeting;
  panel.setAttribute("aria-label", title);

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) root.querySelector("input[name=name]").focus();
    else btn.focus();
  }
  btn.addEventListener("click", function () { setOpen(panel.hidden); });
  root.querySelector(".close").addEventListener("click", function () { setOpen(false); });
  root.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) setOpen(false); });

  function show(text, cls) { out.className = "msg " + cls; out.textContent = text; }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
      website: form.website.value,
      page_url: location.href.slice(0, 300)
    };
    if (!data.email || data.email.indexOf("@") < 1) return show("Please enter a valid email so we can reply.", "err");
    if (data.message.length < 5) return show("Please write a message.", "err");
    send.disabled = true;
    show("Sending...", "");
    fetch(api + "/api/widget/" + encodeURIComponent(site) + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b }; });
      })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          show("Thanks! We got your message and will reply by email.", "ok");
        } else {
          show(typeof res.body.detail === "string" ? res.body.detail : "Could not send. Please try again.", "err");
        }
      })
      .catch(function () { show("Could not reach the server. Please try again.", "err"); })
      .then(function () { send.disabled = false; });
  });

  if (document.body) document.body.appendChild(host);
  else document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(host); });
})();
