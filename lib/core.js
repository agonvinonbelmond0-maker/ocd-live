// Logique de réservation partagée (serveur Node + version démo navigateur)
(function (g) {
  const pad = n => String(n).padStart(2, "0");
  const iso = t => t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
  const key = (d, h) => d + "|" + h;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, TEL = /^\d{8,15}$/;
  // heures consécutives nécessaires à partir de h (ex. live de 2 h)
  const mins = h => +h.slice(0, 2) * 60 + +h.slice(3, 5), hm = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  function span(cfg, h, dur) {
    const n = Math.ceil(dur / cfg.pas), i = cfg.heures.indexOf(h); if (i < 0) return null;
    const a = cfg.heures.slice(i, i + n);
    return a.length === n && a.every((x, j) => !j || mins(x) === mins(a[j - 1]) + cfg.pas) ? a : null;
  }
  const isPast = (d, h, now) => { const t = new Date(now), T = iso(t); return d < T || (d === T && mins(h) <= t.getHours() * 60 + t.getMinutes()); };
  const closed = (cfg, d) => cfg.joursFermes.includes(new Date(d + "T12:00").getDay());
  const taken = list => { const s = new Set(); list.forEach(b => b.status !== "annulé" && b.slots.forEach(k => s.add(k))); return s; };
  function slots(cfg, tk, d, n, now) {
    return cfg.heures.map(h => {
      const sp = span(cfg, h, n); let st = "free";
      if (isPast(d, h, now)) st = "past";
      else if (closed(cfg, d) || !sp || sp.some(x => tk.has(key(d, x)))) st = "busy";
      return { h, st };
    });
  }
  function month(cfg, tk, ym, n, now) {
    const [y, m] = ym.split("-").map(Number), days = {}, N = new Date(y, m, 0).getDate();
    for (let i = 1; i <= N; i++) {
      const d = ym + "-" + pad(i), s = slots(cfg, tk, d, n, now), f = s.filter(x => x.st === "free").length;
      days[d] = s.every(x => x.st === "past") ? { st: "past" } : { st: f ? "free" : "full", free: f };
    }
    return { days };
  }
  function book(p, cfg, list, now) {
    const E = (msg, conflict) => ({ error: { msg, conflict: !!conflict } });
    const pack = (cfg.packs[p.mode] || []).find(x => x.id === p.packId);
    if (!pack) return E("Package invalide.");
    const nom = String(p.nom || "").trim().slice(0, 80), email = String(p.email || "").trim().slice(0, 120);
    if (nom.length < 2) return E("Nom invalide.");
    if (!TEL.test(String(p.tel || ""))) return E("Téléphone invalide : chiffres uniquement.");
    if (!EMAIL.test(email)) return E("Adresse e-mail invalide.");
    const pays = String(p.pays || "").trim().slice(0, 60);
    if (p.mode === "distance" && !pays) return E("Pays requis.");
    const pay = cfg.paiements.find(x => x.id === p.payId && x.modes.includes(p.mode));
    if (!pay) return E("Moyen de paiement invalide.");
    const payRef = String(p.payRef || "").trim().slice(0, 60);
    if (pay.type === "mobile" && (!TEL.test(String(p.payTel || "")) || payRef.length < 4)) return E("Renseignez le numéro payeur et la référence de la transaction.");
    const sp = span(cfg, p.heure, pack.duree);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || "") || !sp) return E("Créneau invalide.");
    const tk = taken(list);
    if (isPast(p.date, p.heure, now) || closed(cfg, p.date) || sp.some(x => tk.has(key(p.date, x)))) return E("Ce créneau vient d’être pris. Choisissez-en un autre.", true);
    let ref; do ref = "OCD-" + Math.random().toString(36).slice(2, 8).toUpperCase(); while (list.some(b => b.ref === ref));
    return { booking: {
      ref, createdAt: new Date(now).toISOString(), mode: p.mode, nom, tel: p.tel, email, pays,
      pers: String(p.pers || "").slice(0, 30), packId: pack.id, pack: pack.nom, resume: pack.resume, prix: pack.prix,
      date: p.date, heure: p.heure, duree: pack.duree, fin: hm(mins(p.heure) + pack.duree), slots: sp.map(x => key(p.date, x)),
      paiement: pay.nom, payTel: String(p.payTel || ""), payRef,
      status: pay.type === "place" ? "à régler sur place" : "paiement à vérifier"
    } };
  }
  const C = { iso, key, slots, month, taken, book };
  if (typeof module !== "undefined") module.exports = C; else g.OCDCore = C;
})(this);
