/* Progressive enhancement: works with the existing property feed, no new database required. */
(() => {
    const dialog = document.getElementById('property-dialog');
    const content = document.getElementById('property-details');
    let opener;
    function node(tag, text, className) {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (className) el.className = className;
        return el;
    }
    function safeImage(value) {
        try { const url = new URL(value, location.origin); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
    }
    window.openPropertyDetails = (index, button) => {
        const p = properties[index];
        if (!p) return;
        opener = button;
        content.replaceChildren();
        content.append(node('h2', p.title));
        const gallery = node('div', undefined, 'detail-gallery');
        [...new Set([p.image, ...(p.allPhotos || [])])].filter(Boolean).forEach(src => {
            const url = safeImage(src);
            if (!url) return;
            const image = node('img'); image.src = url; image.alt = p.title; image.loading = 'lazy'; gallery.append(image);
        });
        content.append(gallery, node('h3', `${formatPrice(p.price)}${p.status === 'À louer' ? ' / mois' : ''}`),
            node('p', `${p.type} · ${p.status} · ${[p.commune, p.city].filter(Boolean).join(', ')}`),
            node('p', `${p.surface || '—'} m² · ${p.rooms || '—'} pièces · ${p.bathrooms || '—'} salles de bain`),
            node('p', p.description || 'Description non renseignée.', 'detail-description'));
        const actions = node('div', undefined, 'property-actions');
        const visit = node('button', 'Réserver une visite', 'visit-button');
        visit.onclick = () => { dialog.close(); openVisitModal(button, index); };
        const share = node('button', 'Copier le lien du bien', 'visit-button');
        share.onclick = async () => {
            try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}?bien=${encodeURIComponent(p.id)}`); share.textContent = 'Lien copié'; }
            catch { share.textContent = 'Copiez le lien dans la barre d’adresse'; }
        };
        const report = node('a', 'Signaler cette annonce', 'direct-contact');
        report.href = `https://wa.me/2250789948925?text=${encodeURIComponent(`Bonjour, je souhaite signaler l’annonce n° ${p.id} : ${p.title}.\nMotif du signalement :\n`)}`;
        report.target = '_blank'; report.rel = 'noopener noreferrer';
        actions.append(visit, share, report); content.append(actions,
            node('p', 'Le signalement est envoyé à l’administrateur via WhatsApp. Précisez le motif avant de l’envoyer.', 'visit-note'));
        const url = new URL(location.href); url.searchParams.set('bien', p.id); history.replaceState(null, '', url);
        dialog.showModal();
    };
    document.getElementById('property-close').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
        const url = new URL(location.href); url.searchParams.delete('bien'); history.replaceState(null, '', url);
        opener?.focus();
    });
    let openedLink = false;
    window.openLinkedProperty = () => {
        if (openedLink) return;
        const id = new URL(location.href).searchParams.get('bien');
        const index = properties.findIndex(p => String(p.id) === id);
        if (index >= 0) { openedLink = true; openPropertyDetails(index, null); }
    };
    const search = document.querySelector('.search-bar');
    const advanced = node('fieldset', undefined, 'advanced-search');
    advanced.innerHTML = `<legend>Affiner votre recherche</legend><label>Pièces minimum<input id="filter-rooms" type="number" min="0" step="1" placeholder="Indifférent"></label><label>Surface minimum (m²)<input id="filter-surface" type="number" min="0" placeholder="Indifférent"></label><label>Trier par<select id="filter-sort"><option value="recent">Plus récentes</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="surface">Plus grande surface</option></select></label>`;
    search.append(advanced);
    document.getElementById('filter-sort').onchange = performSearch;
    openLinkedProperty();
})();
