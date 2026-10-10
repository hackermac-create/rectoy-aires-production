/**
 * Base de connaissances de l'assistant RECTOY-AIRES.
 * Pour enrichir l'assistant : ajoutez une entrée à ENTRIES (mots-clés + réponse).
 * Seules des informations officielles du site doivent figurer ici : tout ce qui
 * n'est pas couvert est transmis à un conseiller (jamais inventé).
 */

const CONTACT = {
    whatsapp: process.env.ADVISOR_WHATSAPP || "2250705801517",
    email: process.env.ADVISOR_EMAIL || "rectoyaires@gmail.com",
    phone: process.env.ADVISOR_PHONE || "+225 0705801517"
};

const A = {
    contact: { label: "Page contact", href: "/#contact" },
    projets: { label: "Voir les projets", href: "/#projets" },
    magazine: { label: "Lire le magazine", href: "/magazine.html" },
    equipe: { label: "Rencontrer l'équipe", href: "/#fondateurs" },
    expertises: { label: "Nos expertises", href: "/#services" },
    actus: { label: "Actualités", href: "/#actualites" },
    videos: { label: "Voir les vidéos", href: "/videos.html" },
    visite: { label: "Lancer la visite guidée", tour: true },
    conseiller: { label: "Parler à un conseiller", handoff: true }
};

const ENTRIES = [
    {
        id: "presentation",
        keywords: ["rectoy", "rectoy-aires", "entreprise", "qui etes", "qui etes vous", "qui sommes", "presentation", "presenter", "a propos", "c est quoi", "que faites", "activite", "societe"],
        answer: "RECTOY-AIRES est une entreprise technologique africaine orientée vers la création de solutions numériques, informatiques et innovantes pour les entreprises, les professionnels et les populations. Sa signature : Technologie • Innovation • Impact.",
        actions: [A.projets, A.expertises]
    },
    {
        id: "expertises",
        keywords: ["service", "services", "expertise", "expertises", "domaine", "domaines", "offre", "offres", "proposez", "propose", "solution", "solutions", "competence"],
        answer: "RECTOY-AIRES intervient dans huit domaines : développement informatique, digitalisation, cybersécurité, audiovisuel, communication numérique, innovation technologique, solutions mobiles, et électronique & technologie.",
        actions: [A.expertises, A.conseiller]
    },
    {
        id: "dev",
        keywords: ["site web", "application", "applications", "app", "developpement", "developper", "plateforme", "logiciel", "programmation", "creer un site", "site internet"],
        answer: "Le développement informatique est l'un de nos huit domaines : création de sites web, d'applications, de plateformes et de solutions métiers. Pour cadrer votre besoin précis, un conseiller est le plus adapté.",
        actions: [A.conseiller, A.expertises]
    },
    {
        id: "cyber",
        keywords: ["cybersecurite", "securite", "piratage", "protection des donnees", "securiser", "donnees"],
        answer: "La cybersécurité couvre la protection des données, des systèmes informatiques et des infrastructures numériques. Pour évaluer votre situation, un conseiller peut échanger avec vous.",
        actions: [A.conseiller]
    },
    {
        id: "audiovisuel",
        keywords: ["audiovisuel", "video", "videos", "film", "photo", "production", "communication visuelle", "contenu", "contenus"],
        answer: "Notre pôle audiovisuel couvre la création de contenus audiovisuels, la communication visuelle et la production numérique. Pour un projet précis, un conseiller pourra vous répondre.",
        actions: [A.conseiller]
    },
    {
        id: "business",
        keywords: ["rectoy business", "business", "gestion", "stock", "stocks", "facture", "factures", "commande", "commandes", "projet phare", "gerer mon entreprise"],
        answer: "RECTOY BUSINESS est notre projet phare : une solution conçue pour accompagner les entreprises dans leur gestion, leur organisation et leur transformation numérique.",
        actions: [A.projets, A.conseiller]
    },
    {
        id: "virtual-commerce",
        keywords: ["virtual commerce", "commerce", "commercant", "commercants", "vendre", "vente en ligne", "boutique", "marketplace", "e-commerce"],
        answer: "VIRTUAL COMMERCE est une solution orientée vers le commerce numérique : elle permet aux entreprises et aux commerçants de développer leurs activités dans l'univers digital.",
        actions: [A.projets, A.conseiller]
    },
    {
        id: "plateforme-numerique",
        keywords: ["plateforme numerique", "services numeriques", "digitalisation", "digitaliser", "transformation numerique"],
        answer: "La PLATEFORME NUMÉRIQUE est pensée pour faciliter l'accès aux services numériques, favoriser la digitalisation et créer de nouvelles possibilités de connexion entre les acteurs.",
        actions: [A.projets, A.conseiller]
    },
    {
        id: "magazine",
        keywords: ["magazine", "journal", "article", "articles", "portrait", "reportage", "publier", "passer dans le magazine", "paraitre"],
        answer: "RECTOY MAGAZINE est le journal en ligne des entrepreneurs, des PME et des investisseurs : portraits, reportages, produits et activités, réalisés par la direction de la communication de RECTOY-AIRES. Pour proposer un sujet ou apparaître dans le magazine, un conseiller vous orientera.",
        actions: [A.magazine, A.conseiller]
    },
    {
        id: "reseaux",
        keywords: ["facebook", "instagram", "tiktok", "reseaux", "reseau social", "reseaux sociaux", "suivre", "linkedin", "snapchat", "telegram", "youtube", "page facebook"],
        answer: "Retrouvez RECTOY-AIRES sur ses réseaux sociaux : les liens se trouvent en haut du site, dans la section Contact et en bas de page. Chaque cofondateur affiche aussi ses propres réseaux sur sa carte. Pour une réponse rapide, écrivez-nous sur WhatsApp.",
        actions: [A.contact, A.conseiller]
    },
    {
        id: "videos",
        keywords: ["video", "videos", "videos publicitaires", "publicite en video", "publicite video", "publicites", "spot", "clip", "film", "reportage video", "regarder"],
        answer: "Retrouvez les publicités et les reportages de RECTOY MAGAZINE en vidéo sur la page Vidéos, ainsi que sur l'accueil du site. Vous pouvez aussi demander à un conseiller comment diffuser votre publicité vidéo.",
        actions: [A.videos, A.magazine, A.conseiller]
    },
    {
        id: "visite",
        keywords: ["visite", "visite guidee", "guide", "presentation vocale", "voix", "vocal", "parler", "ecouter", "audio", "lire a voix haute"],
        answer: "Je peux vous présenter RECTOY-AIRES à voix haute : la visite guidée parcourt le site section par section. Vous pouvez aussi activer la lecture vocale de mes réponses avec l'icône haut-parleur, ou me parler avec le micro (selon votre navigateur).",
        actions: [A.visite, A.conseiller]
    },
    {
        id: "equipe",
        keywords: ["equipe", "fondateur", "fondateurs", "cofondateur", "cofondateurs", "dirigeant", "directeur", "qui dirige", "biographie", "emmanuel", "franck", "traore", "mary", "josephine", "marilyne", "louoba", "jean-daniel", "odilon", "kablan"],
        answer: "RECTOY-AIRES est portée par sept cofondateurs aux profils complémentaires : Emmanuel Yann Ako (Fondateur et Directeur Général), Traoré Franck (marketing et affaires), Louoba Demene Carelle Emmanuella Aleba (communication visuelle), Mary Josephine (architecture et projets), Odilon Silyverter N'Guessan (design et infographie), Jean-Daniel Ehiman (organisation et événementiel) et Kablan Raymond (technique et maintenance). Chaque fiche dispose d'une biographie.",
        actions: [A.equipe]
    },
    {
        id: "contact",
        keywords: ["contact", "contacter", "joindre", "telephone", "numero", "email", "mail", "whatsapp", "adresse", "ou etes vous", "localisation", "ou se trouve", "siege"],
        answer: `Vous pouvez nous joindre par email (${CONTACT.email}), par téléphone ou WhatsApp (${CONTACT.phone}), ou via le formulaire de contact. Nous sommes basés en Côte d'Ivoire.`,
        actions: [A.contact, A.conseiller]
    },
    {
        id: "actualites",
        keywords: ["actualite", "actualites", "annonce", "annonces", "evenement", "evenements", "nouveaute", "nouveautes", "news"],
        answer: "Les annonces, événements, nouveautés et offres de RECTOY-AIRES sont publiés dans la section Actualités du site.",
        actions: [A.actus]
    },
    {
        id: "vision",
        keywords: ["vision", "mission", "valeurs", "objectif", "ambition", "afrique"],
        answer: "Notre mission : concevoir et développer des technologies capables de résoudre des problèmes réels et contribuer à un écosystème technologique africain fort. Notre vision : aller de l'Afrique vers le monde, avec une technologie utile, accessible et fiable.",
        actions: [A.expertises]
    },
    {
        id: "partenariat",
        keywords: ["partenaire", "partenariat", "collaborer", "collaboration", "investir", "investisseur", "investissement", "sponsor", "sponsoring", "financement"],
        answer: "Les partenariats, collaborations et opportunités d'investissement sont étudiés au cas par cas : un conseiller est la bonne personne pour en discuter avec vous.",
        actions: [A.conseiller],
        handoff: true
    },
    {
        id: "emploi",
        keywords: ["emploi", "recrutement", "recrute", "stage", "stagiaire", "carriere", "carrieres", "travailler", "candidature", "cv"],
        answer: "RECTOY-AIRES a vocation à réunir progressivement des profils complémentaires (informatique, ingénierie, audiovisuel, communication, commerce…). Pour une candidature ou un stage, un conseiller vous indiquera la marche à suivre.",
        actions: [A.conseiller],
        handoff: true
    },
    {
        id: "prix",
        keywords: ["prix", "tarif", "tarifs", "cout", "coute", "couter", "coutent", "combien", "devis", "budget", "payer", "paiement", "gratuit", "abonnement"],
        answer: "Les tarifs dépendent de votre besoin : nous ne communiquons pas de prix fixes sur le site. Un conseiller peut étudier votre projet et vous orienter vers un devis.",
        actions: [A.conseiller],
        handoff: true
    },
    {
        id: "rdv",
        keywords: ["rendez-vous", "rdv", "reunion", "appel", "rappeler", "rappel", "disponible", "disponibilite"],
        answer: "Pour convenir d'un rendez-vous ou d'un appel, laissez-nous vos coordonnées : un conseiller reviendra vers vous.",
        actions: [A.conseiller],
        handoff: true
    }
];

const SMALLTALK = [
    { id: "hello", test: /^(bonjour|bonsoir|salut|hello|coucou|hey|bonne journee)\b/, answer: "Bonjour ! Je suis l'assistant virtuel de RECTOY-AIRES. Je peux vous renseigner sur nos projets, nos expertises, l'équipe, le magazine ou le contact. Si je ne peux pas vous aider, un conseiller prendra le relais." },
    { id: "thanks", test: /\b(merci|thanks|parfait|super|genial|top)\b/, answer: "Avec plaisir ! Avez-vous une autre question ? Un conseiller reste disponible si vous souhaitez un échange personnalisé." },
    { id: "bye", test: /^(au revoir|bye|a bientot|a plus|bonne soiree)\b/, answer: "Au revoir et merci de votre visite sur RECTOY-AIRES !" }
];

// Demande explicite d'un humain / situation sensible : passage direct à un conseiller.
const HUMAN_REQUEST = /(conseiller|humain|une personne|quelqu un|agent|responsable|parler a|parler avec|vrai personne|vraie personne|service client|reclamation|plainte|probleme urgent|urgent|urgence|arnaque|remboursement)/;

const SUGGESTIONS = [
    "Que fait RECTOY-AIRES ?",
    "Parlez-moi de RECTOY BUSINESS",
    "Qui sont les cofondateurs ?",
    "Comment vous contacter ?"
];

function normalize(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Score d'une entrée : les expressions complètes pèsent plus que les mots seuls.
function scoreEntry(entry, text, tokens) {
    let score = 0;
    for (const raw of entry.keywords) {
        const kw = normalize(raw);
        if (!kw) continue;
        if (kw.includes(" ") || kw.includes("-")) {
            if (text.includes(kw)) score += 3;
        } else if (tokens.has(kw)) {
            score += 2;
        } else if (kw.length >= 6 && [...tokens].some(t => t.length >= 6 && (t.startsWith(kw) || kw.startsWith(t)))) {
            score += 1;
        }
    }
    return score;
}

function findAnswer(message) {
    const text = normalize(message);
    const tokens = new Set(text.split(" ").filter(Boolean));

    if (!text) return { type: "empty" };
    if (HUMAN_REQUEST.test(text)) return { type: "human" };

    for (const s of SMALLTALK) if (s.test.test(text) && tokens.size <= 6) return { type: "smalltalk", entry: s };

    const ranked = ENTRIES
        .map(entry => ({ entry, score: scoreEntry(entry, text, tokens) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score);

    if (!ranked.length || ranked[0].score < 2) return { type: "unknown" };
    return { type: "answer", entry: ranked[0].entry, score: ranked[0].score };
}

// Contexte transmis au modèle (si ANTHROPIC_API_KEY est défini).
function knowledgeAsText() {
    return ENTRIES.map(e => `- ${e.answer}`).join("\n") +
        `\n- Contact : email ${CONTACT.email}, téléphone/WhatsApp ${CONTACT.phone}, Côte d'Ivoire.`;
}

module.exports = { CONTACT, ENTRIES, SUGGESTIONS, A, findAnswer, knowledgeAsText, normalize };
