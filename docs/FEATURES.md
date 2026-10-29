# Fonctionnalités : état et déploiement

## Implémenté dans cette livraison

- Fiche détaillée accessible depuis chaque annonce : galerie, description, caractéristiques, prix.
- Liens partageables `/?bien=ID`, ouverts après le chargement des annonces.
- Réservation depuis la fiche et signalement à l’administrateur via WhatsApp.
- Filtres combinés : nombre de pièces minimum et surface minimum.
- Tri par prix ou surface ; ordre récent conservé par défaut.
- Types Bureau et Local commercial dans la publication et la recherche ; Terrain et Duplex dans la recherche.

Le signalement est un message WhatsApp, pas un dossier enregistré dans une base.
La fiche est une fenêtre HTML accessible par URL, pas une page rendue côté serveur : le référencement individuel reste à développer.

## Non implémenté — prérequis de sécurité

Le système existant compare un hachage SHA-256 de mot de passe dans une table publique et mémorise un identifiant utilisateur dans localStorage. Ce mécanisme n’est pas une authentification Supabase et ne permet pas de faire respecter des droits propriétaire/admin côté serveur.

Ne pas construire un panneau administrateur en se basant sur cet identifiant : il peut être modifié par le visiteur.

Avant de livrer les fonctionnalités suivantes :

1. Migrer les comptes vers Supabase Auth, avec parcours de récupération du mot de passe ; ne pas convertir automatiquement les comptes à partir d’un identifiant ou d’un e-mail fourni par le navigateur.
2. Auditer le schéma réel et les politiques RLS de `annonces`, `utilisateurs` et du bucket `images-annonces`.
3. Rattacher les annonces existantes aux identités Auth après vérification des propriétaires.
4. Donner le rôle administrateur exclusivement côté serveur. Protéger les mises à jour par RLS, pas seulement par masquage des boutons.
5. Ensuite développer le tableau de bord propriétaire (modification et disponibilité) et la modération (approbation et signalements stockés).
6. Ajouter une table de rendez-vous protégée par RLS : accès du client et du propriétaire, statuts demandé/confirmé/refusé/proposition. Conserver le message WhatsApp comme option, pas comme preuve de réservation.
7. Pour les alertes e-mail : consentement, préférences enregistrées, désabonnement signé, tâche planifiée et service d’envoi côté serveur. Aucune clé d’envoi dans le JavaScript public.

Ces opérations nécessitent la configuration du projet Supabase et un service d’e-mails. Cette livraison ne les active pas et ne modifie pas la base distante.

## Vérifications

`node --test tests/*.test.cjs`

Le déploiement est statique : inclure `property-tools.js` en plus des fichiers existants. Après intégration dans main, vérifier le déploiement Vercel et tester un lien réel `?bien=ID` avec une annonce de la base.
