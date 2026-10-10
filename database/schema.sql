-- =========================================================
-- RECTOY-AIRES — schéma complet (peut être rejoué sans risque)
-- =========================================================

-- Sessions de l'administration (compatible connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Publications du site (annonces, événements, publicités).
-- Les images sont stockées dans la base (pas besoin de disque persistant).
-- Nom "site_publications" pour ne pas entrer en conflit avec d'éventuelles
-- tables créées auparavant à la main.
CREATE TABLE IF NOT EXISTS site_publications (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('annonce', 'evenement', 'publicite')),
    description TEXT         NOT NULL,
    event_date  DATE,
    location    VARCHAR(150),
    link        TEXT,
    status      VARCHAR(10)  NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
    image_data  BYTEA,
    image_mime  VARCHAR(30),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_publications_status_created
    ON site_publications(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_site_publications_updated_at ON site_publications;
CREATE TRIGGER trg_site_publications_updated_at
BEFORE UPDATE ON site_publications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- RECTOY MAGAZINE : articles (portraits, reportages, publicités...)
-- Les images sont stockées dans la base.
-- =========================================================
CREATE TABLE IF NOT EXISTS magazine_articles (
    id           BIGSERIAL PRIMARY KEY,
    title        VARCHAR(180) NOT NULL,
    category     VARCHAR(20)  NOT NULL CHECK (category IN
                 ('portrait','reportage','entreprise','investisseur','produit','activite','publicite')),
    summary      VARCHAR(400) NOT NULL,
    content      TEXT         NOT NULL,
    author       VARCHAR(100),
    subject_name VARCHAR(150),
    image_data   BYTEA,
    image_mime   VARCHAR(30),
    is_featured  BOOLEAN      NOT NULL DEFAULT FALSE,
    status       VARCHAR(10)  NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
    published_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magazine_status_published
    ON magazine_articles(status, published_at DESC);

DROP TRIGGER IF EXISTS trg_magazine_articles_updated_at ON magazine_articles;
CREATE TRIGGER trg_magazine_articles_updated_at
BEFORE UPDATE ON magazine_articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- ASSISTANT : demandes transmises à un conseiller
-- =========================================================
CREATE TABLE IF NOT EXISTS assistant_requests (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    contact     VARCHAR(120) NOT NULL,
    message     TEXT         NOT NULL,
    transcript  JSONB        NOT NULL DEFAULT '[]'::jsonb,
    page        VARCHAR(200),
    status      VARCHAR(10)  NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    handled_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_requests_status_created
    ON assistant_requests(status, created_at DESC);


-- =========================================================
-- RÉSEAUX SOCIAUX : résultat des envois automatiques (Facebook, Instagram)
-- =========================================================
ALTER TABLE site_publications ADD COLUMN IF NOT EXISTS social_posts JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE magazine_articles ADD COLUMN IF NOT EXISTS social_posts JSONB NOT NULL DEFAULT '{}'::jsonb;


-- =========================================================
-- VIDÉOS : publicités, reportages du magazine, présentation
-- Deux sources : fichier envoyé (stocké dans la base, lecture progressive)
-- ou lien YouTube / Vimeo (recommandé pour les longues vidéos).
-- =========================================================
CREATE TABLE IF NOT EXISTS site_videos (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    kind        VARCHAR(12)  NOT NULL CHECK (kind IN ('publicite', 'reportage', 'presentation')),
    source      VARCHAR(8)   NOT NULL CHECK (source IN ('upload', 'embed')),
    embed_url   TEXT,
    video_data  BYTEA,
    video_mime  VARCHAR(30),
    video_size  BIGINT,
    poster_data BYTEA,
    poster_mime VARCHAR(30),
    cta_label   VARCHAR(40),
    cta_link    TEXT,
    article_id  BIGINT REFERENCES magazine_articles(id) ON DELETE SET NULL,
    is_featured BOOLEAN      NOT NULL DEFAULT FALSE,
    status      VARCHAR(10)  NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Les vidéos sont déjà compressées : stockage « externe » = lecture par tranches rapide.
ALTER TABLE site_videos ALTER COLUMN video_data SET STORAGE EXTERNAL;

CREATE INDEX IF NOT EXISTS idx_site_videos_status_created
    ON site_videos(status, is_featured DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_videos_article ON site_videos(article_id);

DROP TRIGGER IF EXISTS trg_site_videos_updated_at ON site_videos;
CREATE TRIGGER trg_site_videos_updated_at
BEFORE UPDATE ON site_videos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- =========================================================
-- RÉSEAUX SOCIAUX : liens de l'entreprise (owner = 'company')
-- et de chaque cofondateur (owner = identifiant du cofondateur).
-- Modifiables depuis /admin/social.html, sans redéploiement.
-- =========================================================
CREATE TABLE IF NOT EXISTS social_links (
    owner      VARCHAR(40)  NOT NULL,
    network    VARCHAR(20)  NOT NULL,
    url        TEXT         NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner, network)
);
