// ============================================================
//  CONFIGURATION OCD – c'est ici que vous modifiez le contenu
// ============================================================
const toM = h => +h.slice(0, 2) * 60 + +h.slice(3, 5), hm = m => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const OUVERTURE = "09:00", FERMETURE = "20:00", PAS = 30;   // créneaux de 30 minutes
const heures = []; for (let m = toM(OUVERTURE); m < toM(FERMETURE); m += PAS) heures.push(hm(m));

const PACKS = [
  { id:"p-flash", cat:"heure", nom:"Pack OCD Flash", prix:15000, duree:90, resume:"1 live de 1h30",
    avantages:["1 live de 1h30","Visuel d’annonce","Annonce en story"] },
  { id:"p-marathon", cat:"heure", nom:"Pack OCD Marathon", prix:35000, duree:240, resume:"1 live de 4 h",
    avantages:["1 live de 4 h","Visuel d’annonce","Annonce en story"] },
  { id:"p-essentiel", cat:"semaine", nom:"Pack OCD Essentiel", prix:75000, duree:90, resume:"3 lives de 1h30 sur la semaine",
    avantages:["3 lives de 1h30","Annonce en statut","Visuel personnalisé"] },
  { id:"p-premium", cat:"semaine", nom:"Pack OCD Premium", prix:125000, duree:180, prestige:true, resume:"3 lives de 3 h sur la semaine",
    avantages:["3 lives de 3 h","Annonce en statut","Visuel personnalisé","Publication en story par Bovann"] },
  { id:"p-pro", cat:"mois", nom:"Pack OCD Pro", prix:250000, duree:90, resume:"12 lives de 1h30 sur le mois",
    avantages:["12 lives de 1h30","Une vidéo de Bovann","Annonce de chaque live en stories","Affiche officielle publiée avant chaque live"] },
  { id:"p-prestige", cat:"mois", nom:"Pack OCD Prestige", prix:450000, duree:180, prestige:true, resume:"12 lives de 3 h sur le mois",
    avantages:["12 lives de 3 h","Présence de Bovann dans un live","Publication de Bovann en story et une vidéo","Annonce de chaque live en stories","Affiche officielle publiée avant chaque live"] }
];

module.exports = {
  pas: PAS, heures,
  nom: "OCD – Les Opportunités c’est dehors",
  lieu: "Le lieu du live est défini par OCD. L’adresse exacte vous est communiquée après confirmation.",
  joursFermes: [],        // 0 = dimanche, 1 = lundi ... 6 = samedi. Ex. [0] pour fermer le dimanche
  moisAVenir: 3,          // nombre de mois réservables à l'avance
  contact: {
    telephones: ["+228 70 25 65 65", "+228 79 79 02 29", "+228 97 19 65 65"],
    email: "contact@bovanngroup.com",
    adresse: "Hedzranawoe / Kegué, Lomé, Togo"
  },
  paiements: [
    { id: "mtn",     nom: "MTN Mobile Money", type: "mobile", num: "+229 00 00 00 10", titulaire: "OCD", modes: ["presentiel","distance"] },
    { id: "moov",    nom: "Moov Money",       type: "mobile", num: "+229 00 00 00 11", titulaire: "OCD", modes: ["presentiel","distance"] },
    { id: "celtiis", nom: "Celtiis Cash",     type: "mobile", num: "+229 00 00 00 12", titulaire: "OCD", modes: ["presentiel","distance"] },
    { id: "place",   nom: "Paiement sur place", type: "place", modes: ["presentiel"] }
  ],
  cats: { heure: "À l’heure", semaine: "À la semaine", mois: "Au mois" },
  // Mêmes packs en présentiel et à distance. Pour les différencier, créez une 2e liste.
  packs: { presentiel: PACKS, distance: PACKS }
};
