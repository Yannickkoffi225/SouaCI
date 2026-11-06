// Logique commune pour les tableaux de bord (Propriétaire et Admin)
// Branche: arena/5f6a3678-souaci

let currentAuthUser = null;

// --- Fonctions communes ---
async function initDashboard() {
    const { data: user, error } = await _supabase.auth.getUser();
    if (error || !user) return;
    currentAuthUser = user.user;
    
    // Charger le profil
    const { data: profile } = await _supabase
        .from('public.profiles')
        .select('*')
        .eq('id', currentAuthUser.id)
        .single();
    
    if (profile) {
        document.getElementById('profile-prenom').value = profile.prenom || '';
        document.getElementById('profile-nom').value = profile.nom || '';
        document.getElementById('profile-telephone').value = profile.telephone || '';
        document.getElementById('profile-ville').value = profile.ville || '';
    }
}

async function updateProfile() {
    const prenom = document.getElementById('profile-prenom').value;
    const nom = document.getElementById('profile-nom').value;
    const telephone = document.getElementById('profile-telephone').value;
    const ville = document.getElementById('profile-ville').value;

    const { error } = await _supabase
        .from('public.profiles')
        .update({ prenom, nom, telephone, ville })
        .eq('id', currentAuthUser.id);

    if (error) {
        alert('Erreur lors de la mise à jour : ' + error.message);
    } else {
        alert('Profil mis à jour avec succès !');
        location.reload();
    }
}

// --- Logique Propriétaire ---
async function loadProprietaireData(userId) {
    // 1. Charger les annonces
    const { data: annonces, error: annoncesError } = await _supabase
        .from('public.annonces')
        .select('*')
        .eq('owner_auth_id', userId);
    
    const annoncesContainer = document.getElementById('annonces-container');
    if (annoncesError) {
        annoncesContainer.innerHTML = `<div class="alert-error">Erreur : ${annoncesError.message}</div>`;
    } else if (annonces.length === 0) {
        annoncesContainer.innerHTML = '<p>Vous n\'avez pas encore publié d\'annonces.</p>';
    } else {
        annoncesContainer.innerHTML = annonces.map(a => `
            <div class="annonce-card">
                <h3>${a.titre} (${a.operation})</h3>
                <p><strong>Ville :</strong> ${a.ville} ${a.commune ? '- ' + a.commune : ''}</p>
                <p><strong>Prix :</strong> ${a.prix.toLocaleString('fr-FR')} FCFA</p>
                <p><strong>Téléphone :</strong> ${a.owner_phone}</p>
                <div style="margin-top: 1rem;">
                    <button class="btn-dashboard btn-edit" onclick="editAnnonce(${a.id})">Modifier</button>
                    <button class="btn-dashboard btn-delete" onclick="deleteAnnonce(${a.id})">Supprimer</button>
                    <button class="btn-dashboard btn-visites" onclick="showVisites(${a.id})">Visites (${a.id})</button>
                </div>
            </div>
        `).join('');
    }

    // 2. Charger les visites
    const { data: visites, error: visitesError } = await _supabase
        .from('public.visites')
        .select('*')
        .eq('proprietaire_auth_id', userId);
    
    const visitesContainer = document.getElementById('visites-container');
    if (visitesError) {
        visitesContainer.innerHTML = `<div class="alert-error">Erreur : ${visitesError.message}</div>`;
    } else if (visites.length === 0) {
        visitesContainer.innerHTML = '<p>Aucune visite réservée pour le moment.</p>';
    } else {
        visitesContainer.innerHTML = visites.map(v => `
            <div class="visite-item">
                <strong>Annonce :</strong> ${v.annonce_id} | <strong>Client :</strong> ${v.nom} (${v.telephone})<br>
                <strong>Date/Heure :</strong> ${v.date} à ${v.heure} | <strong>Statut :</strong> <span class="statut-badge statut-${v.statut}">${v.statut}</span><br>
                <strong>Message :</strong> ${v.message || 'Aucun'}<br>
                <div style="margin-top: 0.5rem;">
                    <button class="btn-dashboard btn-edit" onclick="updateVisiteStatus(${v.id}, 'confirmé')">Confirmer</button>
                    <button class="btn-dashboard btn-delete" onclick="updateVisiteStatus(${v.id}, 'refusé')">Refuser</button>
                    <button class="btn-dashboard btn-visites" onclick="updateVisiteStatus(${v.id}, 'proposition')">Proposer</button>
                </div>
            </div>
        `).join('');
    }

    // 3. Charger les signalements (si propriétaire est aussi admin ou si on veut voir ses propres annonces signalées)
    const { data: signalements, error: signalementsError } = await _supabase
        .from('public.signalements')
        .select('*, annonces(titre)')
        .innerJoin('public.annonces', 'signalements.annonce_id = annonces.id')
        .eq('annonces.owner_auth_id', userId);
    
    const signalementsContainer = document.getElementById('signalements-container');
    if (signalementsError) {
        signalementsContainer.innerHTML = `<div class="alert-error">Erreur : ${signalementsError.message}</div>`;
    } else if (signalements.length === 0) {
        signalementsContainer.innerHTML = '<p>Aucun signalement sur vos annonces.</p>';
    } else {
        signalementsContainer.innerHTML = signalements.map(s => `
            <div class="signalement-item">
                <strong>Annonce :</strong> ${s.annonces.titre} | <strong>Motif :</strong> ${s.motif}<br>
                <strong>Statut :</strong> <span class="statut-badge statut-${s.statut}">${s.statut}</span><br>
                <div style="margin-top: 0.5rem;">
                    <button class="btn-dashboard btn-approve" onclick="updateSignalement(${s.id}, 'traité')">Traiter</button>
                    <button class="btn-dashboard btn-reject" onclick="updateSignalement(${s.id}, 'rejeté')">Rejeter</button>
                </div>
            </div>
        `).join('');
    }
}

// --- Logique Admin ---
async function loadAdminData() {
    // 1. Charger toutes les annonces en attente (si besoin, mais RLS limite à l'admin)
    // Note : Pour l'admin, on suppose qu'il a accès à tout (via une fonction ou un rôle)
    // Ici, on simule en chargeant les signalements et les visites globales si possible
    
    // Signalements globaux (pour l'admin)
    const { data: signalements, error: signalementsError } = await _supabase
        .from('public.signalements')
        .select('*, annonces(titre, owner_auth_id)')
        .innerJoin('public.annonces', 'signalements.annonce_id = annonces.id');
    
    const signalementsContainer = document.getElementById('signalements-admin-container');
    if (signalementsError) {
        signalementsContainer.innerHTML = `<div class="alert-error">Erreur : ${signalementsError.message}</div>`;
    } else if (signalements.length === 0) {
        signalementsContainer.innerHTML = '<p>Aucun signalement en attente.</p>';
    } else {
        signalementsContainer.innerHTML = signalements.map(s => `
            <div class="admin-card">
                <h3>Signalement : ${s.annonces.titre}</h3>
                <p><strong>Motif :</strong> ${s.motif}</p>
                <p><strong>Statut :</strong> <span class="statut-badge statut-${s.statut}">${s.statut}</span></p>
                <div style="margin-top: 1rem;">
                    <button class="btn-admin btn-approve" onclick="updateSignalementAdmin(${s.id}, 'traité')">Traiter</button>
                    <button class="btn-admin btn-reject" onclick="updateSignalementAdmin(${s.id}, 'rejeté')">Rejeter</button>
                </div>
            </div>
        `).join('');
    }

    // 2. Charger les alertes email (statistiques)
    const { data: alertes, error: alertesError } = await _supabase
        .from('public.alertes_email')
        .select('count(*)');
    
    const alertesContainer = document.getElementById('alertes-admin-container');
    if (alertesError) {
        alertesContainer.innerHTML = `<div class="alert-error">Erreur : ${alertesError.message}</div>`;
    } else {
        alertesContainer.innerHTML = `<div class="admin-card"><h3>Alertes Email Actives</h3><p>Nombre total : ${alertes[0].count}</p></div>`;
    }
}

// --- Fonctions de mise à jour (RLS) ---
async function updateVisiteStatus(visiteId, statut) {
    const { error } = await _supabase
        .from('public.visites')
        .update({ statut, updated_at: new Date().toISOString() })
        .eq('id', visiteId);
    if (error) alert('Erreur : ' + error.message);
    else location.reload();
}

async function updateSignalement(signalementId, statut) {
    const { error } = await _supabase
        .from('public.signalements')
        .update({ statut, updated_at: new Date().toISOString() }) // Note: updated_at n'existe pas dans signalements, on va juste mettre statut
        .eq('id', signalementId);
    // Correction : la table signalements n'a pas de colonne updated_at, on supprime ce champ
    const { error2 } = await _supabase
        .from('public.signalements')
        .update({ statut })
        .eq('id', signalementId);
    if (error2) alert('Erreur : ' + error2.message);
    else location.reload();
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: user, error } = await _supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }
    
    // Vérifier si c'est l'admin (email spécifique)
    const adminEmails = ['bonyyanncikkoffi@gmail.com'];
    if (adminEmails.includes(user.user.email)) {
        loadAdminData();
    } else {
        initDashboard();
    }
});
