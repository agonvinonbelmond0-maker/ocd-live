# OCD Live – Site de réservation (Node.js)

Serveur Node.js **sans aucune dépendance** : pas besoin de `npm install`.

## Lancer
1. Installez Node.js 18 ou plus (https://nodejs.org).
2. Dans le dossier du projet : `npm start`
3. Ouvrez http://localhost:3000 (administration : http://localhost:3000/admin)

Mot de passe admin (à changer avant la mise en ligne) :
- PowerShell : `$env:ADMIN_PASSWORD="votre_mot_de_passe"; npm start`
- CMD : `set ADMIN_PASSWORD=votre_mot_de_passe && npm start`

Par défaut il vaut `ocd2026`.

## Structure
```
config.js         Packs, prix, heures, paiements, contacts, lieu  <-- le fichier à modifier
server.js         Serveur HTTP et API
lib/core.js       Règles de réservation (créneaux, conflits, validation)
data/bookings.json  Réservations (créé automatiquement : sauvegardez-le)
public/           Site (index.html, admin.html, css/, js/, assets/)
```

## API
- `GET /api/config`  `GET /api/availability?month=2026-11&duree=90`  `GET /api/slots?date=2026-11-09&duree=240` (durée en minutes)
- `POST /api/bookings`  : refuse (409) si le créneau est déjà pris, même si deux personnes valident en même temps.
- `GET /api/admin/bookings` et `PATCH /api/admin/bookings/:ref` (en-tête `x-admin-password`).

## Ce que vous modifiez le plus
| Besoin | Où |
|---|---|
| Packs, prix, durées (en minutes), avantages | `config.js`, tableau `PACKS` (6 packs, mêmes en présentiel et à distance) |
| Numéros Mobile Money | `config.js`, `paiements` |
| Horaires, jours fermés | `config.js`, `OUVERTURE`, `FERMETURE`, `joursFermes` (créneaux de 30 min) |
| Téléphones, e-mail, adresse | `config.js`, `contact` |
| Couleurs | `public/css/style.css`, bloc `:root` |
| Photos | déposez-les dans `public/assets/` puis ajoutez-les dans `index.html` |

## Paiement
Le paiement est manuel : le client envoie l'argent par Mobile Money, saisit sa référence, et vous confirmez dans `/admin`. Pour un paiement automatique, branchez Kkiapay ou FedaPay dans `POST /api/bookings` (`server.js`).

## Mise en ligne
Hébergez le dossier sur un serveur Node (Render, Railway, VPS avec pm2). Gardez `data/` sur un disque persistant.

## Notifications e-mail (Gmail)
À chaque réservation, un e-mail récapitulatif est envoyé à `agonvinonbelmond0@gmail.com` (le client est en « Répondre à »).
1. Sur le compte Gmail : Compte Google > Sécurité > activez la *Validation en deux étapes*.
2. Même page : *Mots de passe des applications* > créez-en un (nom : OCD). Google affiche 16 caractères.
3. Copiez `.env.example` en `.env`, collez ces 16 caractères dans `SMTP_PASS`, puis relancez `npm start`.
Le terminal affiche « Notifications e-mail : activées ». Si l'envoi échoue, la réservation est quand même enregistrée et l'erreur s'affiche dans le terminal.
