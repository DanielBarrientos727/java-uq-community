
"use strict";

/* =========================================================
   JAVA UQ COMMUNITY
   Catálogo, búsqueda y filtros
   ========================================================= */

const MATERIALS_URL = "./data/materials.json";

const elements = {
    search: document.querySelector("#searchInput"),
    subject: document.querySelector("#subjectFilter"),
    type: document.querySelector("#typeFilter"),
    grid: document.querySelector("#resourceGrid"),
    count: document.querySelector("#resultCount"),
    activeLabel: document.querySelector("#activeFilterLabel"),
    emptyState: document.querySelector("#emptyState"),
    clearFilters: document.querySelector("#clearFilters"),
    emptyClearFilters: document.querySelector("#emptyClearFilters")
};

let materials = [];

const FILE_ICONS = {
    "Documentación": "DOC",
    "Curso": "LEARN",
    "Guía": "GUIDE",
    "Taller": "WORK",
    "Diapositivas": "SLIDES",
    "Apuntes": "NOTES",
    "Libro": "BOOK"
};

/* ==================== UTILIDADES ==================== */

/**
 * Normaliza el texto para que las búsquedas no distingan
 * entre mayúsculas, minúsculas ni tildes.
 */
function normalizeText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es");
}

/**
 * Crea un elemento HTML y asigna texto sin interpretar
 * el contenido como HTML.
 */
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

/**
 * Acepta únicamente enlaces HTTP y HTTPS.
 * Devuelve null si la URL no es válida.
 */
function getSafeUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    try {
        const url = new URL(value);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            return null;
        }

        return url.href;
    } catch {
        return null;
    }
}

/**
 * Evita que las etiquetas de tipo se construyan con
 * nombres de archivo o formatos no previstos.
 */
function getFileIcon(type) {
    return FILE_ICONS[type] ?? "FILE";
}

/* ==================== CARGA DEL CATÁLOGO ==================== */

async function loadMaterials() {
    elements.grid.setAttribute("aria-busy", "true");

    try {
        const response = await fetch(MATERIALS_URL, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `No se pudo cargar el catálogo (${response.status}).`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("El catálogo debe ser una lista de recursos.");
        }

        materials = data.filter(isValidMaterial);

        populateFilters();
        renderMaterials();
    } catch (error) {
        console.error("Error al cargar los recursos:", error);

        elements.grid.replaceChildren();

        const message = createElement(
            "p",
            "error-message",
            "No fue posible cargar los recursos. Comprueba que el portal se esté ejecutando mediante un servidor web y que data/materials.json exista y sea válido."
        );

        elements.grid.append(message);
        elements.count.textContent = "Catálogo no disponible";
        elements.activeLabel.textContent = "Error de carga";
        elements.emptyState.hidden = true;
    } finally {
        elements.grid.setAttribute("aria-busy", "false");
    }
}

/**
 * Comprueba los campos mínimos necesarios para mostrar
 * una entrada del catálogo.
 */
function isValidMaterial(item) {
    return Boolean(
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.description === "string" &&
        typeof item.subject === "string" &&
        typeof item.type === "string" &&
        typeof item.source === "string"
    );
}

/* ==================== FILTROS ==================== */

function populateFilters() {
    const subjects = [
        ...new Set(materials.map(item => item.subject))
    ].sort((a, b) => a.localeCompare(b, "es"));

    const types = [
        ...new Set(materials.map(item => item.type))
    ].sort((a, b) => a.localeCompare(b, "es"));

    addOptions(elements.subject, subjects);
    addOptions(elements.type, types);
}

function addOptions(select, values) {
    const fragment = document.createDocumentFragment();

    for (const value of values) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        fragment.append(option);
    }

    select.append(fragment);
}

/**
 * Aplica todos los filtros simultáneamente.
 */
function getFilteredMaterials() {
    const query = normalizeText(elements.search.value.trim());
    const subject = elements.subject.value;
    const type = elements.type.value;

    return materials.filter(item => {
        const searchableText = normalizeText([
            item.title,
            item.description,
            item.subject,
            item.type,
            item.format ?? "",
            item.source,
            item.license ?? ""
        ].join(" "));

        const matchesSearch =
            !query || searchableText.includes(query);

        const matchesSubject =
            subject === "all" || item.subject === subject;

        const matchesType =
            type === "all" || item.type === type;

        return matchesSearch && matchesSubject && matchesType;
    });
}

/* ==================== TARJETAS ==================== */

function createResourceCard(item) {
    const article = createElement("article", "resource-card");
    const top = createElement("div", "card-top");

    const icon = createElement(
        "span",
        "file-icon",
        getFileIcon(item.type)
    );

    icon.setAttribute("aria-hidden", "true");

    const type = createElement(
        "span",
        "resource-type",
        item.type
    );

    type.dataset.type = item.type;

    top.append(icon, type);

    const title = createElement("h4", "", item.title);

    const description = createElement(
        "p",
        "",
        item.description
    );

    const meta = createElement("div", "card-meta");

    meta.append(
        createElement("span", "meta-tag", item.subject)
    );

    if (item.format) {
        meta.append(
            createElement("span", "meta-tag", item.format)
        );
    }

    const footer = createElement("div", "card-footer");

    const source = createElement(
        "span",
        "source-label",
        item.source
    );

    source.title = item.source;

    const safeUrl = getSafeUrl(item.url);
    let action;

    if (safeUrl) {
        action = createElement("a", "resource-link", "Abrir recurso ↗");
        action.href = safeUrl;
        action.target = "_blank";
        action.rel = "noopener noreferrer";
        action.setAttribute(
            "aria-label",
            `Abrir ${item.title} en una pestaña nueva`
        );
    } else {
        action = createElement(
            "span",
            "source-label",
            "Enlace no disponible"
        );
    }

    footer.append(source, action);
    article.append(top, title, description, meta, footer);

    return article;
}

/* ==================== RENDERIZADO ==================== */

function renderMaterials() {
    const filteredMaterials = getFilteredMaterials();
    const fragment = document.createDocumentFragment();

    for (const item of filteredMaterials) {
        fragment.append(createResourceCard(item));
    }

    elements.grid.replaceChildren(fragment);

    const total = filteredMaterials.length;
    const totalLabel = total === 1 ? "recurso" : "recursos";

    elements.count.textContent = `${total} ${totalLabel}`;
    elements.emptyState.hidden = total !== 0;
    elements.grid.hidden = total === 0;

    updateActiveFilterLabel();
}

function updateActiveFilterLabel() {
    const labels = [];

    if (elements.subject.value !== "all") {
        labels.push(elements.subject.value);
    }

    if (elements.type.value !== "all") {
        labels.push(elements.type.value);
    }

    if (elements.search.value.trim()) {
        labels.push(`Búsqueda: "${elements.search.value.trim()}"`);
    }

    elements.activeLabel.textContent =
        labels.length > 0
            ? labels.join(" · ")
            : "Todos los recursos";
}

/* ==================== INTERACCIONES ==================== */

function clearFilters() {
    elements.search.value = "";
    elements.subject.value = "all";
    elements.type.value = "all";

    renderMaterials();
    elements.search.focus();
}

elements.search.addEventListener("input", renderMaterials);
elements.subject.addEventListener("change", renderMaterials);
elements.type.addEventListener("change", renderMaterials);

elements.clearFilters.addEventListener("click", clearFilters);
elements.emptyClearFilters.addEventListener("click", clearFilters);

/* ==================== INICIALIZACIÓN ==================== */

loadMaterials();
