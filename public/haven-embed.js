/**
 * Haven chat embed — drop this on any page with:
 *   <script src="https://haveninlipa.com/haven-embed.js" async></script>
 *
 * Injects a floating "Ask Haven" launcher. On click, it lazily creates an iframe pointing
 * at https://haveninlipa.com/embed/haven — the real chat widget (no second implementation;
 * see src/components/chat/ChatWidget.tsx's `embedded` prop) — tagged chat_surface="blog"
 * for GA4 so blog chats are counted separately from the main site. Self-contained: no
 * external CSS/JS dependencies, since the host page's own stylesheet is unknown.
 *
 * haven-chat-usage-2026-11-09.md #5 (blog bridge) / hil-pm-handoff-2026-10-27.md.
 */
(function () {
  "use strict";

  if (window.__havenEmbedLoaded) return;
  window.__havenEmbedLoaded = true;

  var EMBED_ORIGIN = "https://haveninlipa.com";
  var EMBED_URL = EMBED_ORIGIN + "/embed/haven";
  var PREFIX = "haven-embed-";

  var style = document.createElement("style");
  style.textContent =
    "#" + PREFIX + "launcher{position:fixed;bottom:20px;right:20px;z-index:2147483000;" +
    "height:52px;padding:0 18px;border:none;border-radius:999px;display:flex;" +
    "align-items:center;gap:8px;background:#3B5323;color:#fff;font:600 14px/1 " +
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;cursor:pointer;" +
    "box-shadow:0 4px 18px rgba(0,0,0,.22);}" +
    "#" + PREFIX + "launcher:hover{background:#2e4119;}" +
    "#" + PREFIX + "launcher svg{width:20px;height:20px;flex:none;}" +
    "@media (max-width:639px){#" + PREFIX + "launcher span{display:none;}" +
    "#" + PREFIX + "launcher{padding:0;width:52px;justify-content:center;}}" +
    "#" + PREFIX + "panel{position:fixed;bottom:84px;right:20px;z-index:2147483000;" +
    "width:360px;max-width:calc(100vw - 2.5rem);height:520px;max-height:calc(100vh - 8rem);" +
    "border:none;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.22);display:none;" +
    "overflow:hidden;background:#F9F5EE;}" +
    "#" + PREFIX + "panel.open{display:block;}";
  document.head.appendChild(style);

  var launcher = document.createElement("button");
  launcher.id = PREFIX + "launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Ask Haven — chat with Haven");
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M4 4h16v12H8l-4 4V4z" fill="#fff"/></svg>' +
    "<span>Ask Haven</span>";

  var panel = document.createElement("div");
  panel.id = PREFIX + "panel";

  var iframe = null;
  var opened = false;

  function openPanel() {
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.src = EMBED_URL;
      iframe.title = "Ask Haven";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      panel.appendChild(iframe);
    }
    panel.classList.add("open");
    opened = true;
  }

  function closePanel() {
    panel.classList.remove("open");
    opened = false;
  }

  launcher.addEventListener("click", function () {
    if (opened) closePanel();
    else openPanel();
  });

  document.body.appendChild(panel);
  document.body.appendChild(launcher);
})();
