// Communication avec le serveur Node.js
const API = {
  async j(u, o) {
    const r = await fetch(u, o), d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || "Erreur"), { status: r.status });
    return d;
  },
  config: () => API.j("/api/config"),
  month: (ym, h) => API.j(`/api/availability?month=${ym}&duree=${h}`),
  slots: (d, h) => API.j(`/api/slots?date=${d}&duree=${h}`),
  book: p => API.j("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) })
};
