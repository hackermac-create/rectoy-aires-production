// En développement le back-end tourne sur le port 4000 ;
// en production, adaptez cette valeur (ou servez le front derrière
// le même domaine que l'API et utilisez simplement "/api").
// Même domaine que le serveur en production ; en local avec Live Server (port 5500),
// l'API tourne sur le port 4000.
const API_ORIGIN = window.location.port === "5500" ? "http://localhost:4000" : "";
const API_URL = API_ORIGIN + "/api";

let publications = [];
let currentFilter = "all";


// ======================================
// APPEL API AVEC SESSION (cookie httpOnly)
// ======================================

async function apiFetch(url, options = {}) {

    return fetch(url, {
        ...options,
        credentials: "include"
    });

}


// ======================================
// AUTHENTIFICATION
// ======================================

const loginScreen = document.getElementById("loginScreen");
const adminLayout = document.querySelector(".admin-layout");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");


function showAdmin() {

    if (loginScreen) loginScreen.style.display = "none";

    if (adminLayout) adminLayout.style.display = "flex";

    loadPublications();

}


function showLogin() {

    if (loginScreen) loginScreen.style.display = "flex";

    if (adminLayout) adminLayout.style.display = "none";

}


async function checkSession() {

    try {

        const response = await apiFetch(`${API_URL}/admin/session`);

        const data = await response.json();

        if (data.authenticated) {

            showAdmin();

        } else {

            showLogin();

        }

    } catch (error) {

        showLogin();

    }

}


if (loginForm) {

    loginForm.addEventListener("submit", async event => {

        event.preventDefault();

        loginError.textContent = "";

        const username = document.getElementById("loginUsername").value;

        const password = document.getElementById("loginPassword").value;

        try {

            const response = await apiFetch(`${API_URL}/admin/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ username, password })

            });

            const data = await response.json();

            if (!data.success) {

                loginError.textContent = data.message || "Connexion impossible.";

                return;

            }

            loginForm.reset();

            showAdmin();

        } catch (error) {

            loginError.textContent = "Impossible de contacter le serveur.";

        }

    });

}


if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        await apiFetch(`${API_URL}/admin/logout`, { method: "POST" });

        showLogin();

    });

}


checkSession();


// ======================================
// NAVIGATION
// ======================================

const navItems =
    document.querySelectorAll(".nav-item");

const sections =
    document.querySelectorAll(".admin-section");

const pageTitle =
    document.getElementById("pageTitle");


function showSection(sectionName) {

    sections.forEach(section => {

        section.classList.remove("active");

    });


    const target =
        document.getElementById(sectionName);

    if (target) {

        target.classList.add("active");

    }


    navItems.forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.section === sectionName
        );

    });


    const titles = {

        dashboard:
            "Tableau de bord",

        publications:
            "Publications",

        create:
            "Nouvelle publication"

    };


    pageTitle.textContent =
        titles[sectionName] ||
        "Administration";

}


navItems.forEach(item => {

    item.addEventListener("click", () => {

        showSection(
            item.dataset.section
        );

    });

});


// ======================================
// CHARGER LES PUBLICATIONS
// ======================================

async function loadPublications() {

    try {

        const response =
            await apiFetch(
                `${API_URL}/admin/publications`
            );

        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                "Impossible de charger les publications."
            );

        }


        publications =
            data.publications || [];


        updateDashboard();

        renderPosts();

        renderRecentPosts();


    } catch (error) {

        console.error(error);

        showToast(
            "Impossible de contacter le serveur."
        );

    }

}


// ======================================
// DASHBOARD
// ======================================

function updateDashboard() {

    document.getElementById(
        "totalPosts"
    ).textContent =
        publications.length;


    document.getElementById(
        "totalAnnouncements"
    ).textContent =
        publications.filter(
            p => p.type === "annonce"
        ).length;


    document.getElementById(
        "totalEvents"
    ).textContent =
        publications.filter(
            p => p.type === "evenement"
        ).length;


    document.getElementById(
        "totalAds"
    ).textContent =
        publications.filter(
            p => p.type === "publicite"
        ).length;

}


// ======================================
// PUBLICATIONS
// ======================================

function renderPosts() {

    const container =
        document.getElementById(
            "postsTable"
        );


    let filtered =
        publications;


    if (currentFilter !== "all") {

        filtered =
            publications.filter(
                p =>
                    p.type === currentFilter
            );

    }


    if (!filtered.length) {

        container.innerHTML = `
            <div style="padding:30px;text-align:center;color:#8995a4">
                Aucune publication trouvée.
            </div>
        `;

        return;

    }


    container.innerHTML =
        filtered.map(publication => {

            const image =
                publication.image
                    ? `${API_ORIGIN}${publication.image}`
                    : "";


            return `

                <div class="post-row">

                    ${
                        image
                        ?
                        `<img
                            class="post-thumb"
                            src="${image}"
                            alt=""
                        >`
                        :
                        `<div class="post-thumb"></div>`
                    }


                    <div class="post-info">

                        <strong>
                            ${escapeHtml(
                                publication.title
                            )}
                        </strong>

                        <small>
                            ${
                                publication.date ||
                                "Sans date"
                            }
                        </small>

                    </div>


                    <div>

                        <span
                            class="badge ${publication.type}"
                        >
                            ${typeLabel(
                                publication.type
                            )}
                        </span>

                    </div>


                    <div>

                        <span
                            class="badge ${publication.status}"
                        >
                            ${
                                publication.status ===
                                "published"
                                    ? "Publié"
                                    : "Brouillon"
                            }
                        </span>

                    </div>


                    <div class="row-actions">

                        <button
                            onclick="editPublication('${publication.id}')"
                            title="Modifier"
                        >
                            ✏️
                        </button>

                        <button
                            onclick="toggleStatus('${publication.id}')"
                            title="Publier / masquer"
                        >
                            👁️
                        </button>

                        <button
                            onclick="deletePublication('${publication.id}')"
                            title="Supprimer"
                        >
                            🗑️
                        </button>

                    </div>

                </div>

            `;

        }).join("");

}


// ======================================
// PUBLICATIONS RECENTES
// ======================================

function renderRecentPosts() {

    const container =
        document.getElementById(
            "recentPosts"
        );


    const recent =
        publications.slice(0, 5);


    if (!recent.length) {

        container.innerHTML = `
            <p style="color:#8995a4">
                Aucune publication pour le moment.
            </p>
        `;

        return;

    }


    container.innerHTML =
        recent.map(publication => `

            <div class="recent-item">

                <div>

                    <strong>
                        ${escapeHtml(
                            publication.title
                        )}
                    </strong>

                    <small>
                        ${typeLabel(
                            publication.type
                        )}
                    </small>

                </div>

                <span
                    class="badge ${publication.status}"
                >
                    ${
                        publication.status ===
                        "published"
                            ? "Publié"
                            : "Brouillon"
                    }
                </span>

            </div>

        `).join("");

}


// ======================================
// FILTRES
// ======================================

document
    .querySelectorAll(".post-filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".post-filter"
                    )
                    .forEach(btn =>
                        btn.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                currentFilter =
                    button.dataset.filter;


                renderPosts();

            }
        );

    });


// ======================================
// NOUVELLE PUBLICATION
// ======================================

function openCreate(type = "annonce") {

    showSection("create");

    resetForm();

    document.getElementById(
        "type"
    ).value = type;

}


document
    .getElementById("goCreate")
    .addEventListener(
        "click",
        () => openCreate()
    );


document
    .getElementById("goCreate2")
    .addEventListener(
        "click",
        () => openCreate()
    );


document
    .querySelectorAll(
        "[data-create-type]"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                openCreate(
                    button.dataset.createType
                );

            }
        );

    });


// ======================================
// FORMULAIRE
// ======================================

const form =
    document.getElementById(
        "publicationForm"
    );


form.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const editId =
            document.getElementById(
                "editId"
            ).value;


        const formData =
            new FormData(form);


        try {

            let response;


            if (editId) {

                response =
                    await apiFetch(
                        `${API_URL}/admin/publications/${editId}`,
                        {
                            method: "PUT",
                            body: formData
                        }
                    );

            } else {

                response =
                    await apiFetch(
                        `${API_URL}/admin/publications`,
                        {
                            method: "POST",
                            body: formData
                        }
                    );

            }


            const data =
                await response.json();


            if (!data.success) {

                throw new Error(
                    data.message
                );

            }


            showToast(
                (editId
                    ? "Publication modifiée."
                    : "Publication créée.") + socialSummary(data.social)
            );


            resetForm();

            await loadPublications();

            showSection(
                "publications"
            );


        } catch (error) {

            console.error(error);

            showToast(
                error.message ||
                "Une erreur est survenue."
            );

        }

    }
);


// ======================================
// MODIFIER
// ======================================

window.editPublication =
    function(id) {

        const publication =
            publications.find(
                p => p.id === id
            );


        if (!publication) {
            return;
        }


        showSection("create");


        document.getElementById(
            "formTitle"
        ).textContent =
            "Modifier la publication";


        document.getElementById(
            "editId"
        ).value =
            publication.id;


        document.getElementById(
            "title"
        ).value =
            publication.title;


        document.getElementById(
            "type"
        ).value =
            publication.type;


        document.getElementById(
            "description"
        ).value =
            publication.description;


        document.getElementById(
            "date"
        ).value =
            publication.date || "";


        document.getElementById(
            "location"
        ).value =
            publication.location || "";


        document.getElementById(
            "link"
        ).value =
            publication.link || "";


        document.getElementById(
            "status"
        ).value =
            publication.status;

    };


// ======================================
// STATUT
// ======================================

window.toggleStatus =
    async function(id) {

        const publication =
            publications.find(
                p => p.id === id
            );


        if (!publication) {
            return;
        }


        const formData =
            new FormData();


        formData.append(
            "status",
            publication.status ===
            "published"
                ? "draft"
                : "published"
        );


        try {

            const response =
                await apiFetch(
                    `${API_URL}/admin/publications/${id}`,
                    {
                        method: "PUT",
                        body: formData
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                throw new Error(
                    data.message
                );

            }


            await loadPublications();

            showToast(
                "Statut mis à jour."
            );


        } catch (error) {

            showToast(
                error.message
            );

        }

    };


// ======================================
// SUPPRIMER
// ======================================

window.deletePublication =
    async function(id) {

        const confirmation =
            confirm(
                "Voulez-vous vraiment supprimer cette publication ?"
            );


        if (!confirmation) {
            return;
        }


        try {

            const response =
                await apiFetch(
                    `${API_URL}/admin/publications/${id}`,
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json();


            if (!data.success) {

                throw new Error(
                    data.message
                );

            }


            await loadPublications();

            showToast(
                "Publication supprimée."
            );


        } catch (error) {

            showToast(
                error.message
            );

        }

    };


// ======================================
// ANNULER
// ======================================

document
    .getElementById("cancelForm")
    .addEventListener(
        "click",
        () => {

            resetForm();

            showSection(
                "publications"
            );

        }
    );


// ======================================
// RESET
// ======================================

function resetForm() {

    form.reset();

    document.getElementById(
        "editId"
    ).value = "";

    document.getElementById(
        "formTitle"
    ).textContent =
        "Nouvelle publication";

    document.getElementById(
        "type"
    ).value =
        "annonce";

    document.getElementById(
        "status"
    ).value =
        "published";

}


// ======================================
// OUTILS
// ======================================

function typeLabel(type) {

    const labels = {

        annonce: "Annonce",

        evenement: "Événement",

        publicite: "Publicité"

    };


    return labels[type] || type;

}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );

        },
        3000
    );

}


// ======================================
// DEMARRAGE
// ======================================
// Le chargement des publications est déclenché par checkSession()
// une fois la session admin confirmée (voir showAdmin() plus haut).

// Résumé de l'envoi vers les réseaux sociaux
function socialSummary(result) {
    if (!result) return "";
    const names = { facebook: "Facebook", instagram: "Instagram" };
    return " " + Object.entries(result).map(([k, v]) =>
        v.ok ? `✓ ${names[k]} publié.` : `⚠ ${names[k]} : ${v.error}`).join(" ");
}

// Grise les réseaux non configurés sur le serveur
(async function checkSocial() {
    try {
        const r = await fetch(`${API_URL}/admin/social/status`, { credentials: "include" });
        const d = await r.json();
        if (!d.success) return;
        [["shareFacebook", "facebook"], ["shareInstagram", "instagram"]].forEach(([id, key]) => {
            const box = document.getElementById(id);
            if (box && !d.networks[key]) {
                box.disabled = true;
                box.parentElement.classList.add("is-off");
                box.parentElement.title = "Non configuré : voir GUIDE-RESEAUX-SOCIAUX.md";
            }
        });
    } catch (e) { /* hors connexion : on laisse les cases actives */ }
})();
