// Envoi d'e-mails par SMTP, sans dépendance. Gmail : port 465 + mot de passe d'application.
const net = require("net"), tls = require("tls"), crypto = require("crypto");
const b64 = s => Buffer.from(s, "utf8").toString("base64");
const enc = s => /^[\x20-\x7e]*$/.test(s) ? s : "=?UTF-8?B?" + b64(s) + "?=";
const money = n => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ") + " FCFA";

function conf() {
  const e = process.env, user = e.SMTP_USER || "", pass = (e.SMTP_PASS || "").replace(/\s/g, ""), port = +e.SMTP_PORT || 465;
  return { on: !!(e.SMTP_HOST || (user && pass)), host: e.SMTP_HOST || "smtp.gmail.com", port, user, pass,
    secure: e.SMTP_SECURE ? e.SMTP_SECURE !== "false" : port === 465, from: e.MAIL_FROM || user || "ocd@localhost" };
}

function smtp(o, message) {
  return new Promise((resolve, reject) => {
    const sock = o.secure ? tls.connect({ host: o.host, port: o.port, servername: o.host }) : net.connect({ host: o.host, port: o.port });
    sock.setEncoding("utf8"); sock.setTimeout(20000, () => sock.destroy(new Error("délai SMTP dépassé")));
    let buf = "", cur = [], queue = [], waiters = [];
    sock.on("data", d => {
      buf += d; let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2); cur.push(line);
        if (/^\d{3}( |$)/.test(line)) { const r = { code: +line.slice(0, 3), text: cur.join(" ") }; cur = []; const w = waiters.shift(); w ? w(r) : queue.push(r); }
      }
    });
    sock.on("error", reject);
    const read = () => queue.length ? Promise.resolve(queue.shift()) : new Promise(r => waiters.push(r));
    const cmd = async (line, ok) => { if (line !== null) sock.write(line + "\r\n"); const r = await read(); if (!ok.includes(r.code)) throw new Error("SMTP " + r.text); };
    (async () => {
      await cmd(null, [220]); await cmd("EHLO ocd-live", [250]);
      if (o.user) { await cmd("AUTH LOGIN", [334]); await cmd(b64(o.user), [334]); await cmd(b64(o.pass), [235]); }
      await cmd("MAIL FROM:<" + o.from + ">", [250]); await cmd("RCPT TO:<" + o.to + ">", [250, 251]); await cmd("DATA", [354]);
      sock.write(message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..") + "\r\n.\r\n"); await cmd(null, [250]);
      sock.write("QUIT\r\n"); sock.end(); resolve();
    })().catch(e => { sock.destroy(); reject(e); });
  });
}

async function notify(b, to) {
  const c = conf(); if (!c.on) throw new Error("e-mail non configuré (voir le fichier .env)");
  const date = new Date(b.date + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const text = [
    "Nouvelle réservation OCD", "",
    "Référence : " + b.ref, "Statut : " + b.status, "",
    "CLIENT", "Nom : " + b.nom, "Téléphone : " + b.tel, "E-mail : " + b.email,
    b.mode === "presentiel" ? "Personnes présentes : " + b.pers : "Pays : " + b.pays, "",
    "LIVE", "Type : " + (b.mode === "presentiel" ? "Live présentiel" : "Live à distance"),
    "Package : " + b.pack + " (" + b.resume + ")", "Date : " + date, "Heure : " + b.heure + " – " + b.fin, "Montant : " + money(b.prix), "",
    "PAIEMENT", "Moyen : " + b.paiement, b.payTel ? "Numéro payeur : " + b.payTel : "", b.payRef ? "Référence de la transaction : " + b.payRef : "", "",
    process.env.PUBLIC_URL ? "Gérer la réservation : " + process.env.PUBLIC_URL.replace(/\/$/, "") + "/admin" : ""
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  const reply = /^[^\s@<>",]+@[^\s@<>",]+\.[^\s@<>",]{2,}$/.test(b.email) ? ["Reply-To: <" + b.email + ">"] : [];
  const msg = ["From: " + enc("OCD Réservations") + " <" + c.from + ">", "To: <" + to + ">", ...reply,
    "Subject: " + enc("Nouvelle réservation OCD – " + b.ref), "Date: " + new Date().toUTCString(),
    "Message-ID: <" + crypto.randomBytes(8).toString("hex") + "@ocd-live>", "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(text).replace(/(.{76})/g, "$1\n")].join("\n");
  await smtp({ ...c, to }, msg);
}
module.exports = { notify, conf };
