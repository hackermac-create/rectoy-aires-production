# RECTOY-AIRES — guide de mise en ligne

## 1. Préparer en local
1. Placez toutes les images dans `public/src/` (liste : `public/src/LISEZMOI-IMAGES.txt`).
2. Copiez `.env.example` en `.env` et remplissez-le :
   - SESSION_SECRET : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - ADMIN_USERNAME et ADMIN_PASSWORD_HASH : `node hash-password.js "VotreMotDePasseSolide"`
   - DB_* : votre PostgreSQL local
3. Dans PowerShell :
       npm install
       npm run test:db        (doit afficher CONNEXION OK)
       npm run db:import      (optionnel : importe l'ancien publications.json + image dans uploads/)
       npm start
4. Testez : http://localhost:4000 et http://localhost:4000/admin/
   (connexion, création avec image, modification, brouillon, suppression, affichage sur le site)

## 2. Base PostgreSQL en ligne
Choisissez un hébergeur et copiez l'adresse de connexion (DATABASE_URL) :
- Render Postgres payant : le plus simple pour la durée.
- Render Postgres gratuit : expire 30 jours après sa création, puis suppression
  après 14 jours de grâce sans passage à un plan payant.
- Neon / Supabase / Aiven : offres gratuites (vérifiez leurs limites actuelles).

## 3. GitHub (dépôt PRIVÉ)
    git init
    git add .
    git commit -m "RECTOY-AIRES production"
    git branch -M main
    git remote add origin https://github.com/VOTRE_COMPTE/rectoy-aires.git
    git push -u origin main
Vérifiez que `.env` n'apparaît pas sur GitHub.

## 4. Render
1. render.com > New > Blueprint > votre dépôt (render.yaml est lu automatiquement).
2. Saisissez : DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD_HASH, SITE_URL.
   Le hash se génère en local : `node hash-password.js "VotreMotDePasseSolide"` (copiez la ligne obtenue).
   DATABASE_SSL = true pour une base externe ; false pour l'adresse INTERNE d'une base Render.
3. Une fois déployé : /healthz doit afficher "ok", puis testez le site et /admin/.
   Ensuite, dans l'admin : ajoutez vos liens (🔗 Réseaux) et vos vidéos (🎬 Vidéos).
4. Les tables sont créées automatiquement au premier démarrage.

## 5. Nom de domaine
Render > Settings > Custom Domains, puis l'enregistrement DNS demandé (HTTPS automatique).
Ensuite, dans `public/index.html`, ajoutez des adresses complètes pour l'aperçu de partage (og:image).

## 6. Sécurité — vérifications
- `.env` jamais sur GitHub ; mots de passe partagés dans un chat = à changer.
- Mot de passe admin solide et unique. 5 essais ratés = blocage 15 minutes.
- Cookies de session sécurisés (HTTPS, HttpOnly, SameSite) en production.
- En-têtes de sécurité et politique CSP actifs sur le site public.
  Si un élément du site ne s'affiche plus, ajoutez CSP_DISABLED=true pour diagnostiquer.
- Sauvegardez la base régulièrement (pg_dump).
- Service Render gratuit : mise en veille après 15 min sans visite (premier chargement d'environ une minute) et la documentation de Render le déconseille pour la production : passez au plan Starter (`plan: starter` dans render.yaml, ou Settings > Instance Type).
- Les fichiers écrits sur le disque de Render disparaissent à chaque redéploiement : ici, images et vidéos sont stockées dans PostgreSQL, donc rien n'est perdu ; les sessions admin sont aussi en base.


## 7. RECTOY MAGAZINE
- Lien public : `/magazine.html` (menu du site, pied de page et bandeau sur l'accueil).
- Gestion : connectez-vous sur `/admin/`, puis cliquez sur « 📖 Magazine » (barre latérale)
  ou ouvrez `/admin/magazine.html`.
- Rubriques : Portraits, Reportages, Entreprises & PME, Investisseurs, Produits, Activités, Publicités.
- « ⭐ À la une » : l'article mis à la une s'affiche en grand en haut de la page, comme dans un journal.
- Contenu : paragraphes séparés par une ligne vide ; une ligne commençant par « ## » devient un intertitre.
  Le HTML n'est pas interprété (sécurité).
- Chaque article a son lien partageable : `/magazine.html?article=NUMERO` (bouton WhatsApp inclus).
- Les articles et leurs images sont dans PostgreSQL (table `magazine_articles`, créée automatiquement).

## Vidéos et assistant vocal — points d'attention en production

- **Base de données** : le schéma est appliqué automatiquement au démarrage (`site_videos`). Une vidéo envoyée en fichier est stockée dans PostgreSQL : surveillez la taille de votre base (offre gratuite souvent limitée à 256 Mo – 1 Go). Pour les vidéos longues ou nombreuses, collez un lien **YouTube / Vimeo** : aucun poids pour la base et lecture plus rapide.
- **Variable optionnelle** : `VIDEO_MAX_MB` (40 par défaut).
- **Format conseillé des fichiers** : MP4 (H.264 + AAC), 720p, moins de 2 minutes. Les iPhone enregistrent parfois en HEVC/MOV : exportez en MP4 H.264 avant l'envoi.
- **Sécurité** : le site autorise désormais la lecture de ses propres vidéos, les lecteurs YouTube (mode sans cookies) et Vimeo, ainsi que le micro (dictée) ; rien d'autre n'a été ouvert.
- **Voix** : la qualité dépend de l'appareil du visiteur ; sur certains téléphones Android, la voix française doit être installée dans les réglages système.
