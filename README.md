# Medtech Commerce

Plateforme de commerce et d'approvisionnement de matériel biomédical, équipements hospitaliers, pièces détachées, outils de maintenance et produits technologiques, avec sourcing fournisseur et acheminement vers le Bénin.

## Périmètre fonctionnel

- Catalogue produits avec caractéristiques techniques, fabricant, modèle, garantie, disponibilité et mode de vente direct ou sur devis.
- Demandes d'approvisionnement pour les produits absents du catalogue.
- Référentiel privé des fournisseurs, offres, prix, délais et documents.
- Simulations du coût rendu au Bénin : achat, transport intérieur Chine, fret international, assurance, douane, manutention et livraison locale.
- Gestion des entrepôts, expéditions, contrôles à réception et événements de suivi client.
- Comptes clients, commandes et journal financier.
- Rapprochement des encaissements et calcul du solde des commandes.
- Tableau de bord financier avec distinction entre encaissements, coûts affectés et indicateurs incomplets.
- Préparation de l'intégration FedaPay pour les paiements XOF. Le mode live ne doit être activé qu'après validation du compte marchand, des clés et des tests de bout en bout.

## Stack

- Next.js 15
- Payload CMS 3
- MongoDB
- Stockage média compatible S3

## Configuration

1. Utiliser Node.js 20.9+ et pnpm.
2. Copier `.env.example` vers `.env`.
3. Renseigner une base MongoDB dédiée, un secret Payload fort et les identifiants du stockage média.
4. Laisser FedaPay en sandbox tant que le compte marchand n'est pas activé.
5. Installer les dépendances avec `pnpm install`.
6. Générer les types Payload si nécessaire : `pnpm payload generate:types`.
7. Lancer localement : `pnpm dev`.
8. Vérifier la compilation de production : `pnpm build`.

## Variables sensibles

Ne jamais committer `.env`, les clés privées, les mots de passe, les tokens ni les documents d'identité. Les secrets de production doivent être enregistrés dans le gestionnaire de secrets de l'hébergeur.

## Règles métier importantes

- Un prix fournisseur ou un coût logistique estimé n'est pas un coût réel payé : conserver les justificatifs et confirmer les mouvements.
- Une commande sur devis ne doit pas être présentée comme disponible en stock sans confirmation.
- Le bénéfice net ne peut être certifié que si tous les coûts, frais, remboursements, conversions de devises et charges pertinentes sont correctement enregistrés.
- Les événements de suivi visibles au client doivent correspondre à des étapes réellement confirmées.
- Les paiements ne sont confirmés qu'après vérification serveur auprès du prestataire.

## État de préparation

Le dépôt contient les modules métier décrits ci-dessus, mais leur présence dans le code ne constitue pas une validation de production. La compilation, les tests automatisés, les tests d'intégration, la configuration des secrets, la vérification des webhooks et les essais réels en environnement sandbox doivent être effectués avant ouverture commerciale.

## Branche de travail

Les adaptations métier sont développées sur `feature/benin-commerce-adaptation`. Ne pas fusionner dans `main` avant revue et validation.
