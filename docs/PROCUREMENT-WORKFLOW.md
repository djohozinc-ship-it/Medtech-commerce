# Procédure d'approvisionnement — Medtech Commerce

Ce document décrit le circuit à suivre dans l'administration. Les validations techniques automatiques complètent le contrôle humain ; elles ne remplacent ni la vérification bancaire, ni le contrôle physique des marchandises.

## 1. Vérifier le fournisseur

1. Créer la fiche dans **Approvisionnement → Fournisseurs**.
2. Enregistrer l'entreprise, le contact, l'e-mail, le téléphone, le pays et les coordonnées commerciales.
3. Joindre les documents d'identification et de vérification.
4. Passer le fournisseur à **Vérifié** uniquement après contrôle réel.
5. Vérifier les coordonnées bancaires par un canal indépendant avant tout virement. La case « coordonnées de paiement vérifiées » est une trace interne, pas une vérification automatique.

## 2. Enregistrer et comparer les offres

1. Créer une offre par fournisseur et par référence exacte.
2. Saisir le prix unitaire, la devise, le MOQ, le stock annoncé, le délai, le transport intérieur Chine et la validité.
3. Utiliser la même quantité de comparaison pour toutes les offres.
4. Comparer le total indicatif calculé (prix × quantité + transport Chine), sans oublier les différences de garantie, conformité, délai et disponibilité.
5. Marquer **Validée** uniquement si le fournisseur est vérifié et l'offre encore valable.

Le total comparatif n'est pas un coût rendu au Bénin : le fret international, l'assurance, les taxes, la manutention et la livraison locale doivent encore être évalués.

## 3. Établir et approuver le bon de commande

1. Créer un bon de commande fournisseur et rattacher le devis fournisseur validé.
2. Saisir les lignes exactes, références, quantités entières, prix et exigences techniques.
3. Lier la demande client d'origine lorsqu'il s'agit d'une commande issue du parcours de sourcing.
4. Vérifier le total, les conditions, l'acompte, le délai et les documents pro forma.
5. Passer le bon en attente de validation, puis le faire approuver par un administrateur.
6. Après approbation, l'envoyer au fournisseur. L'e-mail contient les lignes et conditions du bon ; vérifier le journal d'envoi et utiliser l'option de renvoi en cas d'échec.
7. Enregistrer la confirmation du fournisseur et sa référence de commande.

Un bon approuvé ne doit pas être envoyé avant validation du fournisseur et de l'offre.

## 4. Enregistrer les paiements fournisseur

1. Créer un mouvement financier de type **Paiement à un fournisseur**.
2. Le rattacher obligatoirement au bon de commande et au fournisseur correspondant.
3. Saisir la devise réellement payée et le taux vers la devise du bon si les devises diffèrent.
4. Choisir l'étape : acompte, paiement intermédiaire, solde ou paiement intégral.
5. Joindre le justificatif ou la référence bancaire/opérateur et indiquer le vérificateur.
6. Passer le mouvement à **Confirmé** seulement après vérification effective.

Le total payé, le solde restant et le statut de paiement du bon sont recalculés à partir des mouvements confirmés. Les paiements au-delà du montant du bon sont bloqués. Aucun virement fournisseur n'est déclenché automatiquement par l'application.

## 5. Préparer et recevoir les marchandises

1. Suivre la date de disponibilité annoncée et la confirmation du fournisseur.
2. À la livraison, créer une réception liée au bon de commande et à l'entrepôt réel.
3. Enregistrer, ligne par ligne, les quantités attendues, reçues, endommagées et manquantes.
4. Joindre le bon de livraison et les photos.
5. Une réception partielle peut être enregistrée ; les quantités cumulées ne peuvent pas dépasser les quantités commandées.

## 6. Contrôler la qualité

1. Créer une fiche de contrôle liée à la réception et à l'entrepôt.
2. Contrôler les quantités, références, modèles, état, accessoires et exigences techniques.
3. Joindre les photos et documents de contrôle.
4. Choisir conforme, conforme avec réserves ou non conforme.
5. Le résultat de l'inspection met à jour le statut de la réception. Une réception acceptée doit posséder une fiche d'inspection cohérente.

## 7. Gérer les écarts et litiges

1. Pour un manque, dommage ou défaut, ouvrir un litige sur la réception.
2. Enregistrer la référence de réclamation, les preuves et la communication fournisseur.
3. Suivre l'état : à transmettre, en cours, compensation promise, résolu ou rejeté.
4. Documenter l'avoir, le remplacement ou la compensation effectivement obtenu.
5. Ne pas traiter une promesse de compensation comme un encaissement tant que le justificatif n'est pas reçu.

## 8. Préparer le regroupement en Chine

1. Enregistrer les réceptions acceptées dans l'entrepôt chinois.
2. Vérifier que tous les bons rattachés à l'expédition sont entièrement réceptionnés et contrôlés.
3. Créer l'expédition internationale, rattacher les bons de commande et les commandes clients.
4. Renseigner la liste de colisage, le nombre de colis, le poids, le volume et les documents.
5. La transition vers « Prêt à expédier » est bloquée si les bons fournisseurs liés ne sont pas tous réceptionnés.

## 9. Expédier et suivre le fret international

1. Choisir le mode réel : aérien, maritime, routier ou express.
2. Enregistrer le transitaire, le contact, le numéro et le lien de suivi.
3. Saisir la date de départ et l'arrivée estimée.
4. Au départ, à l'arrivée au Bénin et au dédouanement, mettre à jour le statut avec les dates réelles.
5. Les étapes principales sont répercutées dans le suivi des commandes clients liées à l'expédition.
6. Pour un incident visible par le client, renseigner le message client séparément des notes internes.

## 10. Dédouaner, réceptionner au Bénin et calculer le coût rendu

1. Enregistrer le numéro de dossier douanier, la déclaration, les factures, l'assurance et les coûts réels.
2. À l'arrivée au Bénin, enregistrer la date réelle et la réception à l'entrepôt de destination.
3. Clôturer l'expédition uniquement après renseignement de la référence et de la déclaration douanière.
4. Mettre à jour l'estimation de coût rendu avec les coûts réels, les taux documentés et les justificatifs.
5. Affecter les dépenses aux commandes concernées dans **Finance et coûts** afin de calculer les coûts de revient et marges.

## Limites à connaître

- Les paiements fournisseurs sont enregistrés et rapprochés, mais ne sont pas exécutés automatiquement par une banque ou une plateforme chinoise.
- Les offres Alibaba, 1688 et autres plateformes ne sont pas importées automatiquement.
- La validation d'un fournisseur et le contrôle qualité restent des opérations humaines documentées.
- Le suivi automatique de l'expédition crée des événements pour les commandes rattachées directement ou via une demande client convertie. Les commandes doivent donc être liées correctement.
- La gestion du stock disponible par SKU et la répartition automatique de tous les frais communs entre plusieurs commandes nécessitent encore un module d'inventaire et une règle d'allocation contrôlée.
- Les flux doivent passer les tests d'intégration et le build CI avant toute utilisation en production.
