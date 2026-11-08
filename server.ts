
// @ts-nocheck
// Serveur OCD Live – Adapté pour Vercel et le développement local

import { createRequire } from "node:module";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

// Racine du projet
const ROOT = process.cwd();

// Compatibilité avec les modules CommonJS existants
const require = createRequire(path.join(ROOT, "package.json"));

// Fuseau horaire
process.env.TZ = process.env.TZ || "Africa/Lome";

// Lecture du fichier .env en local
// Sur Vercel, configure les variables dans le tableau de bord.
try {
  const envFile = path.join(ROOT, ".env");

  for (const l of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);

    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {}

// Importation des modules du projet
const cfg = require("./config");
const C = require("./lib/core");
const mail = require("./lib/mail");

// Configuration générale
const MAIL_TO = process.env.MAIL_TO || cfg.contact.email;
const PORT = process.env.PORT || 3000;

const IS_VERCEL = Boolean(process.env.VERCEL);

// Mot de passe administrateur
const ADMIN = process.env.ADMIN_PASSWORD || (IS_VERCEL ? "" : "ocd2026");

// Dossier public
const PUB = path.join(ROOT, "public");

// Stockage des réservations
// En local : data/bookings.json
// Sur Vercel : /tmp/bookings.json (stockage temporaire uniquement)
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(ROOT, "data");
const FILE = path.join(DATA_DIR, "bookings.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

// Chargement des réservations
const load = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
};

// Enregistrement des réservations
const save = a => {
  const t = FILE + ".tmp";
  fs.writeFileSync(t, JSON.stringify(a, null, 2));
  fs.renameSync(t, FILE);
};

// Types MIME
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

// Réponse JSON
const send = (res, code, obj) => {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(obj));
};

// Lecture du corps des requêtes
const body = req => new Promise((ok, ko) => {
  let d = "";

  req.on("data", c => {
    d += c;

    if (d.length > 1e5) {
      ko(new Error("Requête trop grande"));
      req.destroy();
    }
  });

  req.on("end", () => {
    try {
      ok(JSON.parse(d || "{}"));
    } catch (e) {
      ko(e);
    }
  });

  req.on("error", ko);
});

// Vérification du mot de passe administrateur
const isAdmin = req => {
  if (!ADMIN) return false;

  const a = Buffer.from(
    String(req.headers["x-admin-password"] || "")
  );

  const b = Buffer.from(ADMIN);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Conversion numérique
const num = v => Math.max(1, parseInt(v) || 1);

// Création du serveur
http.createServer(async (req, res) => {

  res.setHeader("X-Content-Type-Options", "nosniff");

  try {

    const u = new URL(req.url, "http://localhost");
    const p = decodeURIComponent(u.pathname);
    const q = u.searchParams;
    const now = new Date();

    // CONFIGURATION PUBLIQUE
    if (p === "/api/config") {
      return send(res, 200, cfg);
    }

    // DISPONIBILITÉS DU MOIS
    if (p === "/api/availability") {

      const ym = q.get("month") || "";

      if (!/^\d{4}-\d{2}$/.test(ym)) {
        return send(res, 400, { error: "Mois invalide" });
      }

      return send(
        res,
        200,
        C.month(cfg, C.taken(load()), ym, num(q.get("duree")), now)
      );
    }

    // CRÉNEAUX HORAIRES
    if (p === "/api/slots") {

      const d = q.get("date") || "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        return send(res, 400, { error: "Date invalide" });
      }

      return send(
        res,
        200,
        C.slots(cfg, C.taken(load()), d, num(q.get("duree")), now)
      );
    }

    // CRÉATION D'UNE RÉSERVATION
    if (p === "/api/bookings" && req.method === "POST") {

      const all = load();

      const r = C.book(
        await body(req),
        cfg,
        all,
        now
      );

      if (r.error) {
        return send(
          res,
          r.error.conflict ? 409 : 400,
          { error: r.error.msg }
        );
      }

      all.push(r.booking);

      save(all);

      // Notification par e-mail
      mail.notify(r.booking, MAIL_TO).then(
        () => console.log("E-mail envoyé pour " + r.booking.ref),
        e => console.error(
          "E-mail non envoyé pour " + r.booking.ref + " : " + e.message
        )
      );

      return send(res, 201, r.booking);
    }

    // ADMINISTRATION
    if (p.startsWith("/api/admin/")) {

      if (!isAdmin(req)) {
        return send(res, 401, {
          error: "Mot de passe incorrect"
        });
      }

      const all = load();

      // Liste des réservations
      if (
        p === "/api/admin/bookings" &&
        req.method === "GET"
      ) {
        return send(
          res,
          200,
          all.sort((a, b) =>
            (a.date + a.heure).localeCompare(b.date + b.heure)
          )
        );
      }

      // Modification du statut d'une réservation
      const m = p.match(/^\/api\/admin\/bookings\/(OCD-[A-Z0-9]+)$/);

      if (m && req.method === "PATCH") {

        const { status } = await body(req);

        const b = all.find(x => x.ref === m[1]);

        if (
          !b ||
          ![
            "confirmé",
            "annulé",
            "paiement à vérifier",
            "à régler sur place"
          ].includes(status)
        ) {
          return send(res, 400, {
            error: "Requête invalide"
          });
        }

        b.status = status;

        save(all);

        return send(res, 200, b);
      }

      return send(res, 404, {
        error: "Introuvable"
      });
    }

    // AFFICHAGE DES PAGES HTML
    const f =
      p === "/"
        ? "index.html"
        : p === "/admin"
          ? "admin.html"
          : p.replace(/^\/+/, "");

    const fp = path.resolve(PUB, path.normalize(f));

    // Protection contre les chemins hors du dossier public
    if (!fp.startsWith(PUB + path.sep)) {
      res.writeHead(403);
      return res.end("Interdit");
    }

    // Lecture du fichier demandé
    fs.readFile(fp, (e, d) => {

      if (e) {
        res.writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8"
        });

        return res.end("Page introuvable");
      }

      res.writeHead(200, {
        "Content-Type":
          MIME[path.extname(fp)] || "application/octet-stream"
      });

      res.end(d);
    });

  } catch (e) {

    console.error("Erreur serveur :", e);

    if (!res.headersSent) {
      send(res, 400, {
        error: "Requête invalide"
      });
    } else {
      res.end();
    }
  }

}).listen(PORT, () => {

  console.log(
    `OCD Live : ${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:" + PORT}`
  );

  console.log(
    mail.conf().on
      ? "Notifications e-mail : activées vers " + MAIL_TO
      : "Notifications e-mail : non configurées"
  );

  if (!ADMIN) {
    console.log("ATTENTION : ADMIN_PASSWORD doit être configuré sur Vercel.");
  } else if (!process.env.ADMIN_PASSWORD) {
    console.log("Attention : mot de passe administrateur local par défaut.");
  }

});
