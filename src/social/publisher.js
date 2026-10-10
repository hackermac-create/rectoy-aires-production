/**
 * Publication automatique vers les pages réseaux sociaux de RECTOY-AIRES.
 *
 * Facebook (Page)  : FACEBOOK_PAGE_ID + FACEBOOK_PAGE_TOKEN
 * Instagram (Pro)  : INSTAGRAM_ACCOUNT_ID + FACEBOOK_PAGE_TOKEN (même jeton) — une image est obligatoire
 * Adresse publique : SITE_URL (ex. https://rectoy-aires.onrender.com)
 *
 * Les erreurs ne bloquent jamais la publication sur le site : elles sont renvoyées
 * dans le résultat pour être affichées à l'administrateur.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

const siteUrl = req => {
    const fixed = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
    return fixed || `${req.protocol}://${req.get("host")}`;
};

function configured() {
    const token = !!process.env.FACEBOOK_PAGE_TOKEN;
    return {
        facebook: token && !!process.env.FACEBOOK_PAGE_ID,
        instagram: token && !!process.env.INSTAGRAM_ACCOUNT_ID
    };
}

async function graph(path, params, fetchImpl = fetch) {
    const body = new URLSearchParams({ ...params, access_token: process.env.FACEBOOK_PAGE_TOKEN });
    const res = await fetchImpl(`${GRAPH}/${path}`, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
        throw new Error((data.error && data.error.message) || `Erreur ${res.status}`);
    }
    return data;
}

/**
 * post = { message, shareUrl, imageUrl|null }
 * networks = ["facebook", "instagram"]
 * Renvoie { facebook: {ok, id|error}, instagram: {...} }
 */
async function publish(networks, post, fetchImpl = fetch) {
    const cfg = configured();
    const out = {};

    for (const network of networks) {
        if (!["facebook", "instagram"].includes(network)) continue;
        if (!cfg[network]) {
            out[network] = { ok: false, error: "Non configuré (variables d'environnement manquantes)." };
            continue;
        }
        try {
            if (network === "facebook") {
                const data = await graph(`${process.env.FACEBOOK_PAGE_ID}/feed`,
                    { message: post.message, link: post.shareUrl }, fetchImpl);
                out.facebook = { ok: true, id: data.id };
            } else {
                if (!post.imageUrl) throw new Error("Instagram exige une image.");
                const container = await graph(`${process.env.INSTAGRAM_ACCOUNT_ID}/media`,
                    { image_url: post.imageUrl, caption: `${post.message}\n\n${post.shareUrl}` }, fetchImpl);
                const done = await graph(`${process.env.INSTAGRAM_ACCOUNT_ID}/media_publish`,
                    { creation_id: container.id }, fetchImpl);
                out.instagram = { ok: true, id: done.id };
            }
        } catch (error) {
            out[network] = { ok: false, error: error.message };
        }
    }
    return out;
}

// Texte de la publication à partir d'un titre et d'une description
function buildMessage(title, text, max = 600) {
    const body = String(text || "").trim();
    const short = body.length > max ? body.slice(0, max).replace(/\s+\S*$/, "") + "…" : body;
    return `${title}\n\n${short}`.trim();
}

module.exports = { publish, configured, siteUrl, buildMessage };
