let parsedFiles = [];

// 1. Henter XML-filen fra disken/serveren
async function loadXMLData() {
    try {
        const response = await fetch('data.xml');
        if (!response.ok) {
            throw new Error(`Kunne ikke laste XML-data: ${response.statusText}`);
        }
        const xmlText = await response.text();
        initializeData(xmlText);
    } catch (error) {
        console.error("Feil under lasting av data:", error);
        document.getElementById("resultsContainer").innerHTML = 
            `<p class="no-results" style="color: red;">Feil: Kunne ikke laste databasen (data.xml). Er du sikker på at du kjører en lokal server?</p>`;
    }
}

// 2. Parser tekstinnholdet om til strukturerte objekter
function initializeData(xmlDataString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlDataString, "text/xml");
    const fileElements = xmlDoc.getElementsByTagName("file");

    for (let fileTag of fileElements) {
        const path = fileTag.getAttribute("path");
        const rawText = fileTag.textContent.trim();

        const yamlRegex = /^---([\s\(\S\)]*?)---([\s\(\S\)]*)\$/;
        const match = rawText.match(yamlRegex);

        let yamlRaw = "";
        let bodyContent = rawText;

        if (match) { 
            yamlRaw = match.trim(); 
            bodyContent = match.trim(); 
        }

        const metadata = {};
        yamlRaw.split("\n").forEach(line => {
            const parts = line.split(":");
            if (parts.length >= 2) {
                metadata[parts.trim()] = parts.slice(1).join(":").trim().replace(/^["']|["']\$/g, '');
            }
        });

        parsedFiles.push({
            path: path,
            title: metadata.title || "Uten tittel",
            tags: metadata.tags || "",
            metadataObj: metadata,
            content: bodyContent
        });
    }
    
    renderResults(parsedFiles);
    setupLinkInterception();
}

// 3. Genererer HTML-kortene for hvert dokument
function renderResults(files) {
    const container = document.getElementById("resultsContainer");
    container.innerHTML = "";

    if (files.length === 0) {
        container.innerHTML = '<p class="no-results">Ingen dokumenter funnet.</p>';
        return;
    }

    files.forEach(file => {
        const card = document.createElement("div");
        card.className = "file-card";
        card.id = file.path; // Brukes som anker for internlenker

        let metaHtml = "";
        for (const [key, val] of Object.entries(file.metadataObj)) {
            metaHtml += `<div class="meta-key">${key}:</div><div>${val}</div>`;
        }

        // Konverterer Markdown til HTML ved hjelp av Marked.js
        const htmlContent = marked.parse(file.content);

        card.innerHTML = `
            <span class="file-path">${file.path}</span>
            <div class="meta-container"><div class="meta-grid">${metaHtml}</div></div>
            <div class="markdown-body">${htmlContent}</div>
        `;
        container.appendChild(card);
    });
}

// 4. Avskjærer klikk på interne lenker for myk scrolling
function setupLinkInterception() {
    document.addEventListener('click', function(e) {
        const targetLink = e.target.closest('.markdown-body a');
        if (!targetLink) return;

        const href = targetLink.getAttribute('href');
        const targetElement = document.getElementById(href);

        if (targetElement) {
            e.preventDefault(); // Stopper standard side-navigasjon
            window.location.hash = href; // Oppdaterer adressefeltet for CSS-trigger
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// 5. Søkefunksjon
document.getElementById("searchInput").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = query ? parsedFiles.filter(f => 
        f.path.toLowerCase().includes(query) || 
        f.title.toLowerCase().includes(query) || 
        f.content.toLowerCase().includes(query)
    ) : parsedFiles;
    renderResults(filtered);
});

// Start programmet ved å laste XML-filen
loadXMLData();
