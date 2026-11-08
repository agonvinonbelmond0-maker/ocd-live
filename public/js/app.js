const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00a0") + "\u00a0FCFA";
const pad = n => String(n).padStart(2, "0");
const iso = t => t.getFullYear() + "-" + pad(t.getMonth() + 1) + "-" + pad(t.getDate());
const dateFr = d => new Date(d + "T12:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"], JRS = ["lun","mar","mer","jeu","ven","sam","dim"];
const STEPS = ["Informations", "Package", "Date et heure", "Paiement", "Confirmation"];
const endT = (h, d) => { const m = +h.slice(0, 2) * 60 + +h.slice(3, 5) + d; return pad(Math.floor(m / 60)) + ":" + pad(m % 60); };
let CFG, S = {};

async function init() {
  try {
    CFG = await API.config();
    ["presentiel", "distance"].forEach(m => $("#from-" + m).textContent = fmt(Math.min(...CFG.packs[m].map(p => p.prix))));
    $("#tarifs").innerHTML = CFG.packs.presentiel.map(p => `<article class="tc ${p.prestige ? "pres" : ""}">${p.prestige ? '<span class="tag">Prestige</span>' : ""}<small>${esc(CFG.cats[p.cat])}</small><h3>${esc(p.nom)}</h3><div class="price">${fmt(p.prix)}</div><div class="mut">${esc(p.resume)}</div><ul>${p.avantages.map(a => `<li>${esc(a)}</li>`).join("")}</ul></article>`).join("");
    const k = CFG.contact;
    $("#contacts").innerHTML = `<div><small>Téléphones</small>${k.telephones.map(n => `<a href="tel:${n.replace(/[^\d+]/g, "")}">${esc(n)}</a>`).join("")}</div>
      <div><small>Adresse e-mail</small><a href="mailto:${esc(k.email)}">${esc(k.email)}</a></div><div><small>Adresse physique</small><b>${esc(k.adresse)}</b></div>`;
  } catch (e) { $("#offline").classList.remove("hid"); }
}
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 4000); }
const fld = (id, label, input, hint) => `<div class="f"><label for="${id}">${label}</label>${input}${hint ? `<small>${hint}</small>` : ""}<span class="err" id="e-${id}"></span></div>`;

// ---------- Popup ----------
function openM(mode) {
  if (!CFG) return toast("Le serveur ne répond pas.");
  S = { mode, step: 1 }; $("#modal").classList.remove("hid"); document.body.classList.add("lock"); render();
}
function closeM() { $("#modal").classList.add("hid"); document.body.classList.remove("lock"); }
function go(n) { S.step = n; render(); }
function render() {
  const s = S.step;
  $("#mt").textContent = S.mode === "presentiel" ? "Live présentiel" : "Live à distance";
  $("#sn").textContent = `Étape ${s} sur 5 · ${STEPS[s - 1]}`;
  $("#bar").style.width = s * 20 + "%";
  [null, r1, r2, r3, r4, r5][s]();
  $("#prev").classList.toggle("hid", s === 1 || s === 5);
  $("#next").textContent = s === 4 ? "Confirmer la réservation" : s === 5 ? "Terminer" : "Continuer";
  $("#mb").scrollTop = 0;
}

// ---------- 1. Informations ----------
function r1() {
  const p = S.mode === "presentiel", opts = ["Moi seul(e)", "2 personnes", "3 à 5 personnes", "Plus de 5 personnes"];
  $("#mb").innerHTML = `<h2>Vos informations</h2><p class="mut">Quelques informations pour préparer votre passage en live.</p>
  <div class="grid2">
   ${fld("nom", "Nom et prénoms", `<input id="nom" autocomplete="name" value="${esc(S.nom)}">`)}
   ${fld("tel", "Téléphone WhatsApp", `<input id="tel" type="number" inputmode="numeric" min="0" placeholder="Ex. 22997000000" value="${esc(S.tel)}">`, "Chiffres uniquement, avec l’indicatif du pays, sans le signe +.")}
   ${fld("email", "Adresse e-mail", `<input id="email" type="email" autocomplete="email" value="${esc(S.email)}">`)}
   ${p ? fld("pers", "Personnes présentes", `<select id="pers">${opts.map(o => `<option ${S.pers === o ? "selected" : ""}>${o}</option>`).join("")}</select>`)
       : fld("pays", "Pays", `<input id="pays" autocomplete="country-name" value="${esc(S.pays)}">`)}
  </div>
  ${p ? "" : '<div class="info">Vous participez depuis chez vous. Le lien d’accès vous est envoyé avant le live.</div>'}`;
  $("#nom").focus();
}
function v1() {
  const g = id => ($("#" + id)?.value || "").trim(); let ok = true;
  document.querySelectorAll(".err").forEach(x => x.textContent = "");
  const e = (id, m) => { $("#e-" + id).textContent = m; ok = false; };
  if (g("nom").length < 2) e("nom", "Indiquez votre nom et prénoms.");
  if (!/^\d{8,15}$/.test(g("tel"))) e("tel", "Numéro invalide : 8 à 15 chiffres, sans espace ni lettre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(g("email"))) e("email", "Adresse e-mail invalide : elle doit contenir @ et un domaine.");
  if (S.mode === "distance" && !g("pays")) e("pays", "Indiquez votre pays.");
  if (ok) Object.assign(S, { nom: g("nom"), tel: g("tel"), email: g("email"), pays: g("pays"), pers: g("pers") });
  return ok;
}

// ---------- 2. Package ----------
function r2() {
  const L = CFG.packs[S.mode], cats = [...new Set(L.map(p => p.cat))];
  S.cat = S.cat || (S.pack ? S.pack.cat : cats[0]);
  $("#mb").innerHTML = `<h2>Choisissez votre package</h2><p class="mut">Sélectionnez l’offre qui correspond à votre besoin.</p>
  <div class="tabs">${cats.map(c => `<button data-cat="${c}" class="${c === S.cat ? "on" : ""}">${esc(CFG.cats[c])}</button>`).join("")}</div>
  <div class="packs">${L.filter(p => p.cat === S.cat).map(p => `<button class="pack ${S.pack?.id === p.id ? "sel" : ""} ${p.prestige ? "pres" : ""}" data-id="${p.id}">
    ${p.prestige ? '<span class="tag">Prestige</span>' : ""}<h3>${esc(p.nom)}</h3><div class="price">${fmt(p.prix)}</div><div class="mut">${esc(p.resume)}</div>
    <ul>${p.avantages.map(a => `<li>${esc(a)}</li>`).join("")}</ul></button>`).join("")}</div><span class="err" id="e-pack"></span>`;
}

// ---------- 3. Date et heure ----------
function r3() {
  S.cal = S.cal || { ym: iso(new Date()).slice(0, 7) };
  $("#mb").innerHTML = `<h2>Date et heure</h2><p class="mut">${S.pack.cat === "heure" ? `Choisissez l’heure de début (durée : ${S.pack.resume.replace("1 live de ", "")}).` : "Choisissez la date de votre premier live. Les suivants sont planifiés avec l’équipe OCD."}</p>
  <div class="legend"><span><i class="lg free"></i>Libre</span><span><i class="lg full"></i>Occupé</span></div>
  <div id="cal"></div><div id="sl"></div><span class="err" id="e-slot"></span>`;
  cal(); slotsView();
}
async function cal() {
  const [y, m] = S.cal.ym.split("-").map(Number); let d = {};
  try { d = (await API.month(S.cal.ym, S.pack.duree)).days; } catch (e) { toast("Calendrier indisponible."); }
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7, N = new Date(y, m, 0).getDate();
  const cur = iso(new Date()).slice(0, 7), max = iso(new Date(new Date().getFullYear(), new Date().getMonth() + CFG.moisAVenir, 1)).slice(0, 7);
  let cells = "<i></i>".repeat(first);
  for (let i = 1; i <= N; i++) {
    const k = S.cal.ym + "-" + pad(i), x = d[k] || { st: "past" };
    cells += `<button class="day ${x.st} ${S.date === k ? "on" : ""}" data-d="${k}" ${x.st === "free" ? "" : "disabled"}>${i}${x.st === "free" ? `<small>Libre</small>` : x.st === "full" ? "<small>Occupé</small>" : ""}</button>`;
  }
  const el = $("#cal"); if (!el) return;
  el.innerHTML = `<div class="calh"><button data-nav="-1" ${S.cal.ym <= cur ? "disabled" : ""} aria-label="Mois précédent">‹</button><b>${MOIS[m - 1]} ${y}</b><button data-nav="1" ${S.cal.ym >= max ? "disabled" : ""} aria-label="Mois suivant">›</button></div>
  <div class="dow">${JRS.map(x => `<span>${x}</span>`).join("")}</div><div class="days">${cells}</div>`;
}
async function slotsView() {
  const el = $("#sl"); if (!el) return;
  if (!S.date) { el.innerHTML = `<div class="info">Sélectionnez un jour disponible (en vert).</div>`; return; }
  let s = []; try { s = await API.slots(S.date, S.pack.duree); } catch (e) { toast("Créneaux indisponibles."); }
  if (!$("#sl")) return;
  el.innerHTML = `<h3>${dateFr(S.date)}</h3><div class="slots">${s.filter(x => x.st !== "past").map(x => `<button class="slot ${x.st} ${S.hour === x.h ? "on" : ""}" data-h="${x.h}" ${x.st === "free" ? "" : "disabled"}>${x.h}<small>${x.st === "free" ? "jusqu’à " + endT(x.h, S.pack.duree) : "Occupé"}</small></button>`).join("")}</div>`;
}

// ---------- 4. Paiement ----------
function r4() {
  const L = CFG.paiements.filter(p => p.modes.includes(S.mode));
  S.pay = S.pay && L.find(p => p.id === S.pay.id) || null;
  $("#mb").innerHTML = `<h2>Paiement</h2>
  <div class="sum"><div><small>Package</small><b>${esc(S.pack.nom)}</b></div><div><small>Créneau</small><b>${dateFr(S.date)}, ${S.hour}</b></div><div><small>Total à payer</small><b class="tot">${fmt(S.pack.prix)}</b></div></div>
  <p class="mut" style="margin-bottom:12px">Choisissez votre moyen de paiement.</p>
  <div class="pays">${L.map(p => `<label class="pm ${S.pay?.id === p.id ? "sel" : ""}"><input type="radio" name="pm" value="${p.id}" ${S.pay?.id === p.id ? "checked" : ""}>${esc(p.nom)}</label>`).join("")}</div>
  <span class="err" id="e-pay"></span><div id="pi"></div>`;
  payInfo();
}
function payInfo() {
  const p = S.pay, el = $("#pi"); if (!p) { el.innerHTML = ""; return; }
  el.innerHTML = p.type === "place"
    ? `<div class="info">Vous réglez ${fmt(S.pack.prix)} sur place, avant le début du live. Votre créneau est bloqué dès la confirmation.</div>`
    : `<div class="info"><b>1.</b> Envoyez ${fmt(S.pack.prix)} par ${esc(p.nom)} au <b>${esc(p.num)}</b> (${esc(p.titulaire)}).<br><b>2.</b> Renseignez ensuite les informations de votre transaction.</div>
       <div class="grid2" style="margin-top:16px">${fld("payTel", "Numéro utilisé pour payer", `<input id="payTel" type="number" inputmode="numeric" min="0" value="${esc(S.payTel || S.tel)}">`)}
       ${fld("payRef", "Référence de la transaction", `<input id="payRef" value="${esc(S.payRef)}">`, "Reçue par SMS après le paiement.")}</div>`;
}
async function submit() {
  const p = S.pay; if (!p) { $("#e-pay").textContent = "Choisissez un moyen de paiement."; return; }
  if (p.type === "mobile") {
    S.payTel = $("#payTel").value.trim(); S.payRef = $("#payRef").value.trim(); let ok = true;
    if (!/^\d{8,15}$/.test(S.payTel)) { $("#e-payTel").textContent = "Numéro invalide."; ok = false; }
    if (S.payRef.length < 4) { $("#e-payRef").textContent = "Indiquez la référence de la transaction."; ok = false; }
    if (!ok) return;
  }
  $("#next").disabled = true;
  try {
    S.res = await API.book({ mode: S.mode, packId: S.pack.id, date: S.date, heure: S.hour, nom: S.nom, tel: S.tel, email: S.email, pays: S.pays, pers: S.pers, payId: p.id, payTel: S.payTel, payRef: S.payRef });
    go(5);
  } catch (e) {
    if (e.status === 409) { S.hour = null; go(3); }
    toast(e.message || "Une erreur est survenue. Réessayez.");
  }
  $("#next").disabled = false;
}

// ---------- 5. Confirmation ----------
const rows = b => [["Référence", b.ref], ["Type de live", b.mode === "presentiel" ? "Live présentiel" : "Live à distance"], ["Nom", b.nom], ["Téléphone", b.tel], ["E-mail", b.email],
  b.mode === "presentiel" ? ["Personnes présentes", b.pers] : ["Pays", b.pays], ["Package", b.pack + " (" + b.resume + ")"], ["Date", dateFr(b.date)],
  ["Heure", b.heure + " – " + b.fin + " (heure de Lomé)"], ["Lieu", b.mode === "presentiel" ? "Défini par OCD, communiqué après confirmation" : "En ligne, lien envoyé avant le live"],
  ["Montant", fmt(b.prix)], ["Paiement", b.paiement], ["Statut", b.status]];
function r5() {
  const b = S.res, place = b.status === "à régler sur place";
  $("#mb").innerHTML = `<div class="ok"><span class="check"></span><h2>Réservation enregistrée</h2>
  <p class="mut">Merci ${esc(b.nom.split(" ")[0])}. Votre créneau est bloqué. ${place ? "Vous réglez sur place avant le live." : "L’équipe OCD vérifie votre paiement et vous confirme par WhatsApp."}</p></div>
  <div class="ticket" id="ticket"><div class="th"><div><small>OCD · Confirmation de réservation</small><b>${esc(b.ref)}</b></div><span class="st">${esc(b.status)}</span></div>
  <dl>${rows(b).filter(r => r[0] !== "Référence" && r[0] !== "Statut").map(([a, v]) => `<dt>${a}</dt><dd>${esc(v)}</dd>`).join("")}</dl></div>
  <div class="acts no-print"><button class="btn" data-act="pdf">Télécharger en PDF</button><button class="btn ghost" data-act="copy">Copier le récapitulatif</button></div>
  <p class="mut no-print" style="font-size:.9rem">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».</p>`;
}

// ---------- Événements ----------
document.querySelectorAll(".choice").forEach(b => b.onclick = () => openM(b.dataset.mode));
$("#x").onclick = closeM;
$("#modal").onclick = e => { if (e.target.id === "modal") closeM(); };
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#modal").classList.contains("hid")) closeM(); });
$("#prev").onclick = () => { if (S.step === 1) return; if (S.step === 1 + 0) return; go(S.step - 1); };
$("#next").onclick = () => {
  const s = S.step;
  if (s === 1) { if (v1()) go(2); }
  else if (s === 2) { if (!S.pack) { $("#e-pack").textContent = "Sélectionnez un package pour continuer."; return; } go(3); }
  else if (s === 3) { if (!S.date || !S.hour) { $("#e-slot").textContent = "Choisissez un jour puis une heure disponibles."; return; } go(4); }
  else if (s === 4) submit(); else closeM();
};
$("#mb").onclick = e => {
  const t = e.target.closest("[data-cat],[data-id],[data-nav],[data-d],[data-h],[data-act]"); if (!t) return; const d = t.dataset;
  if (d.cat) { S.cat = d.cat; r2(); }
  else if (d.id) { const p = CFG.packs[S.mode].find(x => x.id === d.id); if (S.pack?.id !== p.id) S.hour = null; S.pack = p; S.cat = p.cat; r2(); }
  else if (d.nav) { const [y, m] = S.cal.ym.split("-").map(Number); S.cal.ym = iso(new Date(y, m - 1 + +d.nav, 1)).slice(0, 7); cal(); }
  else if (d.d) { S.date = d.d; S.hour = null; cal(); slotsView(); }
  else if (d.h) { S.hour = d.h; $("#e-slot").textContent = ""; slotsView(); }
  else if (d.act === "pdf") window.print();
  else if (d.act === "copy") navigator.clipboard.writeText("OCD – Récapitulatif de réservation\n" + rows(S.res).map(r => r.join(" : ")).join("\n")).then(() => toast("Récapitulatif copié."), () => toast("Copie impossible."));
};
$("#mb").onchange = e => {
  if (e.target.name !== "pm") return;
  S.pay = CFG.paiements.find(x => x.id === e.target.value);
  document.querySelectorAll(".pm").forEach(l => l.classList.toggle("sel", l.contains(e.target))); payInfo();
};
init();
