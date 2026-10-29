(async () => {
    const status = document.getElementById('callback-status');
    const form = document.getElementById('new-password-form');
    // Capture recovery intent before the SDK clears the URL fragment.
    const fragment = new URLSearchParams(location.hash.slice(1));
    const recovery = new URLSearchParams(location.search).get('mode') === 'recovery' || fragment.get('type') === 'recovery';
    const failed = fragment.has('error') || new URLSearchParams(location.search).has('error');
    try {
        if (!_supabase || failed) throw new Error();
        const { data, error } = await _supabase.auth.getUser();
        if (error || !data.user) throw new Error();
        history.replaceState(null, '', location.pathname);
        if (recovery) {
            form.hidden = false;
            status.textContent = 'Choisissez votre nouveau mot de passe.';
        } else status.textContent = 'Votre session est active. Vous pouvez revenir au site. La confirmation de l’adresse dépend du lien reçu.';
    } catch {
        history.replaceState(null, '', location.pathname);
        status.textContent = 'Ce lien est invalide ou expiré. Retournez au site pour demander un nouveau lien.';
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const password = document.getElementById('new-password').value;
        if (password !== document.getElementById('confirm-password').value) { status.textContent = 'Les mots de passe doivent être identiques.'; return; }
        const button = form.querySelector('button'); button.disabled = true;
        try {
            const { error } = await _supabase.auth.updateUser({ password });
            if (error) throw error;
            await _supabase.auth.signOut({ scope: 'global' });
            form.hidden = true;
            status.textContent = 'Mot de passe modifié. Retournez au site pour vous reconnecter.';
        } catch { status.textContent = 'Modification impossible. Vérifiez le mot de passe ou demandez un nouveau lien.'; }
        finally { button.disabled = false; }
    });
})();
