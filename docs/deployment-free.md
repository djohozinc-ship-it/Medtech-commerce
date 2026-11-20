# Déploiement de test (gratuit) — Medtech Commerce

Ce déploiement est un environnement de préproduction pour vérifier le site en ligne. Les services gratuits peuvent dormir, être limités et ne constituent pas une infrastructure de production commerciale fiable.

## Architecture

- Render Free (service Docker) pour Next.js + Payload.
- MongoDB Atlas Free pour la base de données.
- Cloudflare R2 pour les images/documents (stockage externe persistant).
- FedaPay reste en sandbox. Ne pas activer de paiement réel avant les tests et la validation du compte marchand.

## Étapes

1. Créer un cluster MongoDB Atlas Free. Créer un utilisateur DB dédié avec un mot de passe robuste et ajouter l'accès réseau nécessaire pour Render (Atlas peut nécessiter une règle réseau; si `0.0.0.0/0` est utilisée, garder un mot de passe très fort et ne jamais réutiliser un compte).
2. Créer un bucket Cloudflare R2 et une clé API limitée à ce bucket. Récupérer l'endpoint S3, le bucket, l'access key et la secret key.
3. Ouvrir Render et choisir **New → Blueprint** (ou Deploy Blueprint), puis connecter ce dépôt GitHub et sélectionner la branche `main`. Render lit `render.yaml`.
4. Renseigner les valeurs demandées:
   - `DATABASE_URI`: URI Atlas avec le nom de base `medtech-commerce`.
   - `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`: valeurs R2.
   - `FEDAPAY_SECRET_KEY`: clé sandbox uniquement (laisser vide si non configurée; si Render exige une valeur, ne pas mettre une clé live).
   - `STRIPE_SECRET_KEY`: laisser vide si Stripe n'est pas utilisé.
   - `PAYLOAD_SECRET`: généré automatiquement par Render.
5. Vérifier que `NEXT_PUBLIC_SERVER_URL` correspond exactement au domaine Render attribué. Si le nom de service/domaine change, corriger cette variable puis redéployer.
6. Attendre le build, ouvrir le domaine Render, puis vérifier la page d'accueil, `/admin`, inscription, connexion, catalogue, demande de devis, commande, suivi, admin et upload de médias.
7. Créer le premier administrateur Payload depuis `/admin`. Utiliser un mot de passe unique et le conserver dans un gestionnaire de mots de passe.

## Limites et précautions

- Render Free se met en veille après inactivité et le système de fichiers est éphémère: ne stocker aucun upload local.
- MongoDB Atlas Free est limité (512 Mo) et destiné surtout aux petits projets/essais.
- Ne pas traiter de données de patients ni stocker de documents sensibles pendant les essais.
- Ne pas annoncer le site comme prêt pour des ventes réelles avant validation des sauvegardes, paiements/webhooks, email, sécurité, tests fonctionnels et conditions des fournisseurs gratuits.
- Aucun secret ne doit être commit dans Git.
