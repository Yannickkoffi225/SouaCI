/* Requests are handed to WhatsApp, not stored or confirmed automatically. */
(() => {
    const adminPhone = '2250789948925';
    const modal = document.getElementById('visit-modal');
    const form = document.getElementById('visit-form');
    const date = document.getElementById('visit-date');
    const time = document.getElementById('visit-time');
    const phone = document.getElementById('visit-phone');
    const error = document.getElementById('visit-error');
    let selectedProperty = null;
    let trigger = null;

    function today() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Abidjan', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }

    function normalizePhone(value) {
        let digits = String(value || '').replace(/[^0-9]/g, '');
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.length === 10) digits = '225' + digits;
        return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
    }

    function close() {
        modal.classList.remove('active');
        modal.hidden = true;
        selectedProperty = null;
        trigger?.focus();
    }

    window.openVisitModal = (button, index) => {
        const property = properties[index];
        if (!property) return;
        selectedProperty = property;
        trigger = button;
        form.reset();
        error.textContent = '';
        date.min = today();
        document.getElementById('visit-property').textContent = `${property.title} · ${[property.commune, property.city].filter(Boolean).join(', ')} · ${formatPrice(property.price)}${property.status === 'À louer' ? ' / mois' : ''}`;
        modal.hidden = false;
        modal.classList.add('active');
        document.getElementById('visit-name').focus();
    };

    document.getElementById('visit-close').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key !== 'Tab') return;
        const controls = [...modal.querySelectorAll('button, input, textarea')];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!selectedProperty || !form.reportValidity()) return;
        error.textContent = '';
        const name = document.getElementById('visit-name').value.trim();
        if (!name || !normalizePhone(phone.value)) {
            error.textContent = 'Veuillez renseigner votre nom et un numéro de téléphone valide, avec l’indicatif pour un numéro hors Côte d’Ivoire.';
            return;
        }
        const appointment = new Date(`${date.value}T${time.value}:00Z`);
        if (!Number.isFinite(appointment.getTime()) || appointment <= new Date()) {
            error.textContent = 'Choisissez une date et une heure à venir (heure de Côte d’Ivoire).';
            return;
        }
        const property = selectedProperty;
        const recipient = normalizePhone(property.ownerPhone) || adminPhone;
        const details = [
            'Bonjour, je souhaite réserver une visite pour ce bien :',
            `Bien : ${property.title}`,
            `Référence : ${property.id}`,
            `Localisation : ${[property.commune, property.city].filter(Boolean).join(', ')}`,
            `Type : ${property.type || 'Non précisé'} — ${property.status}`,
            `Prix : ${formatPrice(property.price)}${property.status === 'À louer' ? ' / mois' : ''}`,
            property.surface ? `Surface : ${property.surface} m²` : '',
            `Date souhaitée : ${appointment.toLocaleDateString('fr-FR', { timeZone: 'Africa/Abidjan' })}`,
            `Heure souhaitée : ${time.value} (Côte d’Ivoire, UTC+0)`,
            `Nom : ${name}`,
            `Téléphone : ${phone.value.trim()}`,
            document.getElementById('visit-message').value.trim() ? `Précisions : ${document.getElementById('visit-message').value.trim()}` : '',
            `Site : ${location.origin}${location.pathname}`,
            'Merci de me confirmer la disponibilité pour cette visite.'
        ].filter(Boolean).join('\n');
        const opened = window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(details)}`, '_blank');
        if (opened) opened.opener = null;
        error.textContent = 'Votre demande est prête. Confirmez son envoi dans WhatsApp. Si aucun onglet ne s’ouvre, autorisez les fenêtres pop-up puis réessayez.';
    });
})();
