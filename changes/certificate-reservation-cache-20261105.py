from pathlib import Path

# One-time cache refresh for the new certificate reservation module.
app = Path("app.js")
source = app.read_text(encoding="utf-8")
old = "modules/academic-certificate-registry.js"
new = "modules/academic-certificate-registry.js?v=20261105.reserve1"
if old not in source and new not in source:
    raise SystemExit("Certificate lazy-import path missing in app.js")
if new not in source:
    app.write_text(source.replace(old, new), encoding="utf-8")

page = Path("index.html")
html = page.read_text(encoding="utf-8")
old_cache = "./app.min.js?v=5.12.9.794"
new_cache = "./app.min.js?v=5.12.9.795"
if old_cache not in html and new_cache not in html:
    raise SystemExit("Unexpected app.min.js asset version; review before changing")
if new_cache not in html:
    page.write_text(html.replace(old_cache, new_cache), encoding="utf-8")
