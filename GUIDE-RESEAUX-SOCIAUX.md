# Réseaux sociaux — comment ça marche

## Le plus simple : l'administration (aucun code, aucun redéploiement)

1. Ouvrez `/admin/` → **🔗 Réseaux**.
2. Le premier bloc **RECTOY-AIRES** contient les liens de l'entreprise ; ensuite un bloc par **cofondateur**.
3. Pour chaque réseau, collez le **lien** de la page ou juste le **@pseudo** (ex. `@rectoyaires`) ; pour WhatsApp, le **numéro** avec l'indicatif (ex. `+225 07 05 80 15 17`). Cliquez sur **Enregistrer**.
4. C'est en ligne en moins d'une minute.

Réseaux disponibles : Facebook, Instagram, TikTok, WhatsApp, YouTube, LinkedIn, X, Threads, Snapchat, Telegram.

- Un champ **vide** masque le réseau (rien ne s'affiche à la place).
- Chaque lien est contrôlé : un lien « Facebook » doit vraiment mener à Facebook (protection contre les erreurs et les liens piégés).
- Les liens de l'entreprise apparaissent dans l'en-tête (4 premiers), la page d'accueil, la section Contact et le pied de page de **toutes** les pages.
- Les liens d'un cofondateur apparaissent sur **sa carte** ; si son WhatsApp personnel n'est pas renseigné, le bouton WhatsApp de l'entreprise est utilisé.
- Chaque cofondateur peut vous envoyer ses liens : vous les collez dans son bloc.

## Valeurs par défaut (facultatif)

`public/social-config.js` ne sert plus que de valeurs de secours (WhatsApp de l'entreprise par défaut). Les liens saisis dans l'administration les remplacent.

---

# Réseaux sociaux — guide rapide

## 1. Afficher vos pages sur le site (2 minutes)
Ouvrez `public/social-config.js` et collez l'adresse de chaque page (Facebook, Instagram, LinkedIn, TikTok, YouTube, X).
Un champ vide = le réseau n'apparaît pas. Les icônes s'affichent automatiquement dans :
l'en-tête, le menu mobile, la page d'accueil, la section Contact, le pied de page, et (liens personnels, facultatif)
sur la carte de chaque cofondateur (`RECTOY_FOUNDER_LINKS`).

## 2. Bouton « Partager » pour les visiteurs
Chaque actualité et chaque article du magazine a une barre Facebook · WhatsApp · LinkedIn · X · Copier le lien.
Le lien partagé (`/share/...`) affiche une belle carte (titre, texte, image) sur les réseaux.
Réglez `SITE_URL` (voir plus bas) pour que les liens utilisent votre vrai nom de domaine.

## 3. Publier automatiquement depuis l'administration
Dans /admin/ (publications et magazine), cochez « Facebook » et/ou « Instagram » avant d'enregistrer (statut « Publié »).
Pour activer l'envoi, ajoutez ces variables sur Render (onglet Environment) :

| Variable | Valeur |
|---|---|
| `SITE_URL` | adresse publique du site, ex. `https://www.rectoyaires.com` |
| `FACEBOOK_PAGE_ID` | identifiant numérique de la Page Facebook |
| `FACEBOOK_PAGE_TOKEN` | jeton d'accès de Page **de longue durée** |
| `INSTAGRAM_ACCOUNT_ID` | identifiant du compte Instagram professionnel lié à la Page |

Comment les obtenir : créer une application sur developers.facebook.com, ajouter le produit « Facebook Login »/Graph API,
autoriser `pages_manage_posts`, `pages_read_engagement` (et `instagram_basic`, `instagram_content_publish` pour Instagram),
générer le jeton de Page puis le convertir en jeton longue durée. L'application doit être passée en mode « Live »
(vérification Meta nécessaire pour publier sur une Page dont vous n'êtes pas simple testeur).
Instagram exige une image JPG et un compte professionnel relié à la Page.
Tant que ces variables manquent, les cases sont grisées et le site fonctionne normalement.

Si l'envoi échoue (jeton expiré, droit manquant…), la publication reste bien enregistrée sur le site et le message d'erreur de Meta s'affiche.
LinkedIn, TikTok, YouTube et X ne sont pas publiés automatiquement (leurs API demandent des accès payants ou une validation spécifique) :
utilisez les boutons de partage ou publiez-y manuellement.
