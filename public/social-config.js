/* RECTOY-AIRES — liens des réseaux sociaux (valeurs PAR DÉFAUT)
   ─────────────────────────────────────────────────────────────
   Le plus simple : saisissez les liens dans l'administration (/admin/social.html),
   sans modifier ce fichier ni redéployer. Les liens saisis là-bas remplacent ceux d'ici.
   Ce fichier ne sert que de valeurs de secours (et pour WhatsApp par défaut).
   Une adresse vide ("") masque le réseau sur tout le site (en-tête, accueil,
   contact, pied de page). Ajoutez-en autant que nécessaire. */
window.RECTOY_SOCIAL = {
  facebook:  "",   // ex. https://www.facebook.com/rectoyaires
  instagram: "",   // ex. https://www.instagram.com/rectoyaires
  tiktok:    "",   // ex. https://www.tiktok.com/@rectoyaires
  youtube:   "",   // ex. https://www.youtube.com/@rectoyaires
  linkedin:  "",   // ex. https://www.linkedin.com/company/rectoyaires
  x:         "",   // ex. https://x.com/rectoyaires
  threads:   "",   // ex. https://www.threads.net/@rectoyaires
  snapchat:  "",   // ex. https://www.snapchat.com/add/rectoyaires
  telegram:  "",   // ex. https://t.me/rectoyaires
  whatsapp:  "https://wa.me/2250705801517"
};

/* Liens PERSONNELS des cofondateurs (facultatif) : seuls les liens renseignés s'affichent
   sur la carte de la personne. Le bouton WhatsApp de l'entreprise reste toujours présent. */
window.RECTOY_FOUNDER_LINKS = {
  "emmanuel":    { linkedin: "", facebook: "", instagram: "" },
  "franky":      { linkedin: "", facebook: "", instagram: "" },
  "louoba":      { linkedin: "", facebook: "", instagram: "" },
  "marilyne":    { linkedin: "", facebook: "", instagram: "" },
  "odilon":      { linkedin: "", facebook: "", instagram: "" },
  "jean-daniel": { linkedin: "", facebook: "", instagram: "" },
  "kablan":      { linkedin: "", facebook: "", instagram: "" }
};
