/* Identity comes from Supabase Auth; legacy localStorage IDs are never trusted. */
let currentAuthUser = null;
function authError(message) {
    document.getElementById('auth-error').textContent = message;
}
async function handleRegister(event) {
    event.preventDefault();
    const inputs = event.target.querySelectorAll('input');
    const button = event.target.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        if (!_supabase) throw new Error('Connexion au service indisponible.');
        const { error } = await _supabase.auth.signUp({
            email: inputs[2].value.trim(), password: inputs[5].value,
            options: {
                emailRedirectTo: `${location.origin}/auth-callback.html`,
                data: { prenom: inputs[0].value.trim(), nom: inputs[1].value.trim(), telephone: inputs[3].value.trim(), ville: inputs[4].value.trim() }
            }
        });
        if (error) throw error;
        authError('Si l’inscription est possible pour cette adresse, un e-mail de confirmation vous sera envoyé. Consultez aussi les courriers indésirables.');
    } catch (error) { authError(error.message || 'Inscription impossible. Réessayez plus tard.'); }
    finally { button.disabled = false; }
}
async function handleLogin(event) {
    event.preventDefault();
    const button = event.target.querySelector('[type="submit"]');
    button.disabled = true;
    try {
        if (!_supabase) throw new Error();
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: event.target.querySelector('[type="email"]').value.trim(),
            password: event.target.querySelector('[type="password"]').value
        });
        if (error) throw error;
        applyAuthUser(data.user);
        closeAuthModal();
        await loadCloudProperties();
    } catch { authError('Connexion impossible. Vérifiez vos identifiants et la confirmation de votre e-mail. Les anciens comptes doivent être migrés.'); }
    finally { button.disabled = false; }
}
async function requestPasswordReset() {
    const email = document.querySelector('#auth-form input[type="email"]');
    if (!email?.value || !email.reportValidity()) { authError('Renseignez votre adresse e-mail dans le formulaire.'); return; }
    try {
        if (!_supabase) throw new Error();
        const { error } = await _supabase.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: `${location.origin}/auth-callback.html?mode=recovery` });
        if (error) throw error;
        authError('Si un compte existe, un lien de récupération vous sera envoyé.');
    } catch { authError('L’envoi est momentanément indisponible. Réessayez plus tard.'); }
}
function applyAuthUser(user) {
    currentAuthUser = user || null;
    isLoggedIn = Boolean(user);
    if (user) updateNavForLoggedInUser();
    else renderGuestNav();
}
async function logout() {
    try {
        if (!_supabase) throw new Error();
        const { error } = await _supabase.auth.signOut();
        if (error) throw error;
        applyAuthUser(null);
        await loadCloudProperties();
    } catch { showNotification('Déconnexion impossible. Réessayez.', 'error'); }
}
document.addEventListener('DOMContentLoaded', async () => {
    ['user_id', 'user_prenom', 'user_nom'].forEach(key => localStorage.removeItem(key));
    if (!_supabase) return;
    _supabase.auth.onAuthStateChange((_event, session) => {
        applyAuthUser(session?.user);
        // No awaited Supabase calls inside the auth listener.
        setTimeout(() => loadCloudProperties(), 0);
    });
    const { data, error } = await _supabase.auth.getUser();
    applyAuthUser(error ? null : data.user);
});
