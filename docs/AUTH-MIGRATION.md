# Migration Supabase Auth — procédure opérateur

État : code préparé, pas de migration distante exécutée par l’agent. Sauvegarde des données et règles requise avant exécution. Ne pas remettre les anciennes policies publiques sur utilisateurs.

## Ordre de mise en service

1. Sauvegarder `utilisateurs`, `annonces`, leurs schémas/policies et la configuration Storage dans un emplacement privé. Les anciens mots de passe hachés restent sensibles.
2. Dans SQL Editor, ouvrir et exécuter **supabase/migrations/001_auth.sql** intégralement. Une seule fois. Le script est transactionnel : s’il existe encore des policies sur les deux tables, il s’arrête au lieu de les contourner. En cas d’erreur, ne pas contourner la protection ; transmettre seulement le message d’erreur.
3. Intégrer/déployer le code de cette branche sur Vercel. Ne pas restaurer l’ancien code ensuite : il n’est pas compatible avec ces protections.
4. Dans Authentication → URL Configuration : Site URL `https://souaci.vercel.app`. Ajouter les deux redirections exactes :
   - `https://souaci.vercel.app/auth-callback.html`
   - `https://souaci.vercel.app/auth-callback.html?mode=recovery`
5. Dans Providers : conserver Email et Confirm email activés, connexion anonyme désactivée. Configurer une longueur minimale de 12 caractères et un SMTP de production. Ne partager aucun secret SMTP dans le chat ou Git.
6. Créer un compte de test via le nouveau formulaire du site. Confirmer l’e-mail. Tester connexion, actualisation de page, déconnexion, récupération et changement de mot de passe. Les anciens mots de passe ne fonctionnent pas dans Auth.
7. Avant de publier de nouvelles photos : auditer les policies Storage avec la requête ci-dessous. Le script indépendant **002_storage.sql** s’arrête volontairement si des policies existent. Ne pas les effacer à l’aveugle. S’il n’en existe aucune, il ajoute l’écriture dans le dossier UUID de l’utilisateur, limite PNG/JPEG à 5 Mo et conserve le bucket existant. Vérifier que `images-annonces` existe et est public si ses photos doivent être publiques. Tester A contre B (y compris accès API direct).

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
```

## Effets exacts du script 001

- Anciennes tables et données conservées ; aucun rattachement automatique par e-mail.
- `utilisateurs` reste fermé à anon/authenticated : pas de lecture de mots de passe ni coordonnées privées.
- `profiles` lié à Auth : lecture et modification du seul profil propre, sans rôle administrateur.
- `annonces` : lecture publique rétablie, insertion/suppression réservées au propriétaire Auth. Aucun droit UPDATE livré dans cette étape.
- `owner_phone` est un nouveau champ explicitement public par annonce. Les anciens biens gardent un champ vide et utilisent l’administrateur comme contact de secours tant que le numéro public n’est pas renseigné après accord.
- Le formulaire ne consulte plus `utilisateurs` et supprime les vieux identifiants localStorage.
- Les anciennes annonces restent publiques mais ne peuvent pas être revendiquées ou supprimées par un nouveau compte.
- Aucun espace admin, badge vérifié, modération, calendrier enregistré ou alerte e-mail n’est prétendu opérationnel.

## Rattacher les anciens biens (opération administrative ultérieure)

Après confirmation e-mail du nouveau compte, vérifier indépendamment l’identité et la propriété. L’administrateur attribue ensuite `annonces.owner_auth_id` au UUID confirmé pour les annonces validées. Conserver `user_id` historique. Ne pas exposer de route publique qui revendique un ancien compte par son e-mail ou son identifiant. Les hachages historiques seront supprimés après validation et archivage sécurisé, pas pendant cette étape.

## Validation des droits

- Sans session : annonces lisibles ; utilisateurs/profiles non lisibles ; écriture refusée.
- A connecté : lecture/modification du profil A autorisée, profil B refusé.
- Insertion annonce owner_auth_id=B par A : refusée.
- Suppression annonce B par A : refusée, même avec son identifiant.
- Anciennes annonces sans propriétaire Auth : aucune suppression par un compte normal.
- Champ owner_phone uniquement pour le numéro que le propriétaire accepte de publier.
- Après récupération : nouveau mot de passe fonctionnel, ancien mot de passe refusé.

Ne pas annoncer « sécurisé en production » avant ces tests réels. Les tests locaux ne valident pas les permissions du projet distant.
