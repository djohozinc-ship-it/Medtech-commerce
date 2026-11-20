# Processus d'achat fournisseur et d'approvisionnement

Ce processus est géré dans l'administration Payload, dans les groupes **Approvisionnement**, **Logistique** et **Finance et coûts**. Les collections sont réservées aux administrateurs.

## 1. Enregistrer et vérifier un fournisseur

Créer une fiche dans **Fournisseurs** avec les coordonnées, le pays, la ville, le type de fournisseur, le site ou profil de plateforme, les conditions de paiement et les documents de vérification.

Faire progresser le statut de vérification : non vérifié → documents reçus → vérification en cours → vérifié. Conserver les notes et preuves de contrôle.

## 2. Collecter et comparer les offres

Créer une fiche dans **Offres fournisseurs** pour chaque proposition reçue, même lorsque plusieurs fournisseurs proposent le même modèle. Renseigner au minimum le produit exact, le fabricant, le modèle/SKU, le prix et la devise, le MOQ, le stock annoncé, le poids/dimensions, le transport intérieur Chine, la date de réception et la date d'expiration.

Vérifier les spécifications, les certificats, la garantie, les délais et les conditions. Seules les offres dont le statut est **Validée** peuvent être rattachées à un bon de commande. Ne jamais déclarer une offre vérifiée sans justificatifs.

## 3. Simuler le coût rendu au Bénin

Créer une **Simulation de coût rendu** à partir de l'offre choisie. Saisir un taux de change réellement appliqué et documenter sa source, le fret, l'assurance, les droits et taxes, la manutention, la livraison locale et les autres frais. Les coûts sont calculés en XOF. La simulation doit être vérifiée et approuvée avant de confirmer le prix de vente au client.

## 4. Créer et valider le bon de commande

Créer un **Bon de commande fournisseur**. Sélectionner le fournisseur, l'offre validée et, si l'achat concerne un client, sa demande de sourcing déjà convertie en commande client. Ajouter les lignes exactes, les quantités, les prix, les exigences techniques, les frais et les conditions de paiement.

Cycle de statut :
- Brouillon → En attente de validation → Validé en interne
- Validé en interne → Envoyé au fournisseur
- Envoyé au fournisseur → Confirmé par le fournisseur
- Confirmé → Réception partielle → Réception complète

Un bon lié à une demande client ne peut être créé que lorsque le devis a été accepté et que la commande client existe. Une offre fournisseur doit être validée, non expirée, dans la même devise et appartenir au même fournisseur.

## 5. Envoyer la commande au fournisseur

Avant de passer à **Envoyé au fournisseur**, renseigner la date d'envoi. Le système envoie un e-mail récapitulatif avec les lignes, quantités, prix, frais et conditions. L'adresse e-mail du fournisseur doit être renseignée et le SMTP doit être configuré.

Le résultat de l'envoi apparaît dans les champs de suivi e-mail du bon. En cas d'échec, corriger la configuration ou l'adresse, puis cocher **Renvoyer le bon au fournisseur**.

L'e-mail récapitulatif ne constitue pas encore un PDF signé ou un document de commande exportable. Joindre la pro forma et les pièces officielles reçues du fournisseur dans les pièces jointes du bon.

## 6. Enregistrer les paiements fournisseur

Chaque acompte ou solde payé est enregistré dans **Journal financier** comme mouvement de type **Paiement à un fournisseur**, avec le fournisseur, le bon de commande, la date, la devise, le moyen de paiement et le justificatif.

Pour un paiement dans la devise du bon, le taux est automatiquement de 1. Pour une autre devise, renseigner le taux réellement appliqué vers la devise du bon. Le paiement ne réduit le solde que lorsqu'il est marqué **Confirmé / exécuté**. Les champs Montant payé et Solde restant du bon sont recalculés à partir des paiements confirmés.

Un enregistrement manuel ne déclenche pas un transfert bancaire ou Mobile Money.

## 7. Réceptionner et contrôler

Le fournisseur doit d'abord avoir confirmé le bon. Créer une **Réception fournisseur** pour chaque arrivée, sélectionner le bon et l'entrepôt, puis saisir les quantités attendues, physiquement reçues, endommagées et manquantes. Une réception partielle est possible.

Les contrôles bloquent les quantités non cohérentes et les réceptions cumulées supérieures aux quantités commandées. Après validation de la réception, les quantités réceptionnées cumulées sont mises à jour sur le bon. Son statut passe automatiquement à Réception partielle ou Réception complète.

Associer la fiche de contrôle détaillée dans **Contrôles à réception**, ajouter photos, bon de livraison et justificatifs. En cas d'écart, enregistrer le litige et sa résolution avant de considérer les marchandises conformes.

## 8. Expédier vers le Bénin

Créer une **Expédition internationale**, relier les bons de commande et l'entrepôt de départ en Chine et celui d'arrivée au Bénin. Renseigner le mode de transport, le transitaire, le numéro et le lien de suivi, les dates, poids, volume, colis, coûts de fret et documents douaniers.

Les frais réels sont ensuite enregistrés dans le journal financier et répartis sur les commandes au moyen des affectations de coûts. Les coûts prévisionnels ne remplacent pas les factures et dépenses réellement payées.

## Points de contrôle obligatoires

- Vérifier l'identité légale du fournisseur et les coordonnées bancaires par un canal indépendant avant tout transfert.
- Comparer le modèle exact et les spécifications techniques; pour le biomédical, contrôler les certificats, la conformité, la garantie, les accessoires et la disponibilité des pièces.
- Ne jamais payer sur la seule base d'une capture d'écran ou d'un message WhatsApp non vérifié.
- Garder les factures, pro forma, preuves de paiement, rapports d'inspection, documents de transport et de douane.
- Les coûts douaniers, les taux de change et les frais logistiques doivent être justifiés par des pièces réelles.

## Limites à lever avant production

Le système enregistre les opérations et calcule les soldes fournisseurs, mais les transferts bancaires, paiements de plateforme, génération d'un PDF officiel du bon de commande, inventaire quantitatif en stock et synchronisation automatique avec les fournisseurs ne sont pas intégrés. Les workflows doivent être testés avec des données de test et une configuration SMTP réelle avant utilisation opérationnelle.
