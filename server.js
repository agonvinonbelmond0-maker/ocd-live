// Serveur OCD Live – Node.js sans dépendance (lancez : npm start)
process.env.TZ = process.env.TZ || "Africa/Lome";
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
// Lecture du fichier .env (ADMIN_PASSWORD, SMTP_USER, SMTP_PASS, MAIL_TO…)
try { for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
const cfg = require("./config"), C = require("./lib/core"), mail = require("./lib/mail");
const MAIL_TO = process.env.MAIL_TO || cfg.contact.email;
const PORT = process.env.PORT || 3000;
const ADMIN = process.env.ADMIN_PASSWORD || "ocd2026";
const PUB = path.join(__dirname, "public"), FILE = path.join(__dirname, "data", "bookings.json");
fs.mkdirSync(path.dirname(FILE), { recursive: true });
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { return []; } };
const save = a => { const t = FILE + ".tmp"; fs.writeFileSync(t, JSON.stringify(a, null, 2)); fs.renameSync(t, FILE); };
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
const body = req => new Promise((ok, ko) => {
  let d = ""; req.on("data", c => { d += c; if (d.length > 1e5) { ko(new Error("Requête trop grande")); req.destroy(); } });
  req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { ko(e); } });
});
const isAdmin = req => { const a = Buffer.from(String(req.headers["x-admin-password"] || "")), b = Buffer.from(ADMIN); return a.length === b.length && crypto.timingSafeEqual(a, b); };
const num = v => Math.max(1, parseInt(v) || 1);

http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const u = new URL(req.url, "http://localhost"), p = decodeURIComponent(u.pathname), q = u.searchParams, now = new Date();
    if (p === "/api/config") return send(res, 200, cfg);
    if (p === "/api/availability") {
      const ym = q.get("month") || ""; if (!/^\d{4}-\d{2}$/.test(ym)) return send(res, 400, { error: "Mois invalide" });
      return send(res, 200, C.month(cfg, C.taken(load()), ym, num(q.get("duree")), now));
    }
    if (p === "/api/slots") {
      const d = q.get("date") || ""; if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return send(res, 400, { error: "Date invalide" });
      return send(res, 200, C.slots(cfg, C.taken(load()), d, num(q.get("duree")), now));
    }
    if (p === "/api/bookings" && req.method === "POST") {
      const all = load(), r = C.book(await body(req), cfg, all, now);
      if (r.error) return send(res, r.error.conflict ? 409 : 400, { error: r.error.msg });
      all.push(r.booking); save(all);
      mail.notify(r.booking, MAIL_TO).then(() => console.log("E-mail envoyé pour " + r.booking.ref), e => console.error("E-mail non envoyé pour " + r.booking.ref + " : " + e.message));
      return send(res, 201, r.booking);
    }
    if (p.startsWith("/api/admin/")) {
      if (!isAdmin(req)) return send(res, 401, { error: "Mot de passe incorrect" });
      const all = load();
      if (p === "/api/admin/bookings" && req.method === "GET") return send(res, 200, all.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure)));
      const m = p.match(/^\/api\/admin\/bookings\/(OCD-[A-Z0-9]+)$/);
      if (m && req.method === "PATCH") {
        const { status } = await body(req), b = all.find(x => x.ref === m[1]);
        if (!b || !["confirmé", "annulé", "paiement à vérifier", "à régler sur place"].includes(status)) return send(res, 400, { error: "Requête invalide" });
        b.status = status; save(all); return send(res, 200, b);
      }
      return send(res, 404, { error: "Introuvable" });
    }
    const f = p === "/" ? "/index.html" : p === "/admin" ? "/admin.html" : p, fp = path.join(PUB, path.normalize(f));
    if (!fp.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end("Interdit"); }
    fs.readFile(fp, (e, d) => {
      if (e) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Page introuvable"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d);
    });
  } catch (e) { send(res, 400, { error: "Requête invalide" }); }
}).listen(PORT, () => {
  console.log(`OCD Live : http://localhost:${PORT}   |   Administration : http://localhost:${PORT}/admin`);
  console.log(mail.conf().on ? "Notifications e-mail : activées vers " + MAIL_TO : "Notifications e-mail : non configurées (copiez .env.example en .env)");
  if (!process.env.ADMIN_PASSWORD) console.log("Attention : mot de passe admin par défaut. Définissez ADMIN_PASSWORD avant la mise en ligne.");
});
