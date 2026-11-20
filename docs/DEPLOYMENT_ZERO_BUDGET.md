# Déploiement à budget nul — Medtech-commerce

> **Statut : environnement de préproduction uniquement.** Cette architecture gratuite n'est pas homologuée pour encaisser des paiements réels ni conserver des données clients critiques.

## Architecture provisoire

- **Application Next.js + Payload CMS :** Render Web Service gratuit. Le service peut se mettre en veille et redémarre à la demande ; prévoir un démarrage lent et des indisponibilités. Aucun disque local ne doit contenir des données persistantes.
- **Base MongoDB :** MongoDB Atlas Free (M0), uniquement pour développement/préproduction. Limite documentée : 512 MB. Restreindre les IP d'accès à celles du service lorsque possible, créer un utilisateur dédié avec privilèges minimaux, utiliser un mot de passe unique et ne jamais committer l'URI.
- **Fichiers et médias :** Cloudflare R2 Standard, dans les quotas gratuits mensuels publiés (10 GB-month, 1 million d'opérations Class A et 10 millions Class B). Le bucket doit être privé ; l'accès public passe par le domaine/CDN prévu et les URLs signées quand nécessaire.
- **DNS/TLS/protection réseau :** Cloudflare Free, avec TLS strict vers l'origine si applicable.
- **CI :** GitHub Actions. Les builds, tests et audits restent bloquants avant promotion.

## Variables à configurer dans le tableau de bord Render

Configurer les secrets comme variables d'environnement, jamais dans le dépôt :

- `DATABASE_URI` : URI Atlas M0
- `PAYLOAD_SECRET` : secret aléatoire long, propre à cet environnement
- `NEXT_PUBLIC_SERVER_URL` : URL HTTPS du service Render
- `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` : identifiants R2
- `FEDAPAY_ENV=sandbox` et les clés FedaPay de test uniquement
- Toute autre variable exigée par `src/payload.config.ts` et les intégrations activées

Ne pas copier les secrets de CI ou d'un autre environnement. Ne jamais activer `FEDAPAY_ENV=live` sur cette préproduction.

## Limites et protections obligatoires

1. Les données sur le disque local Render sont éphémères : aucun upload, facture ou document client ne doit y être conservé.
2. Le M0 est plafonné à 512 MB et n'est pas une base de production commerciale. Ne pas y stocker de données réelles sensibles, de données de paiement ou de dossiers médicaux.
3. Effectuer des exports MongoDB chiffrés et tester une restauration avant toute utilisation même en préproduction. Le niveau gratuit ne doit pas être considéré comme une stratégie de sauvegarde garantie.
4. Limiter les uploads par type MIME réel, taille et droits ; servir les fichiers depuis le stockage objet.
5. Utiliser uniquement les clés FedaPay sandbox et vérifier chaque paiement auprès de l'API prestataire. Aucun webhook/retour navigateur ne doit suffire à confirmer un paiement.
6. Garder les comptes de démonstration et données fictives séparés de toute donnée commerciale.
7. Mettre en place des alertes de quotas, erreurs et disponibilité ; prévoir qu'un dépassement des quotas R2 peut être facturé.

## Passage à la vraie production

Avant ouverture aux clients et activation des paiements réels :

- financer un hébergement applicatif permanent (VPS ou service managé sans veille) ;
- passer MongoDB à un niveau avec sauvegardes gérées, restauration testée, métriques et capacité suffisante (Atlas dédié, au minimum M10/M20 pour faible trafic selon dimensionnement) ;
- activer une politique de sauvegardes quotidiennes et rétention, puis tester les restaurations ;
- définir RPO/RTO, supervision, rotation des secrets, journalisation sans données sensibles et plan de reprise ;
- terminer les tests d'intégration/E2E, les tests de concurrence stock/paiement et le test de charge ;
- réaliser une recette staging avec FedaPay sandbox, puis une validation métier avant de basculer les clés live.

**Décision actuelle :** zéro euro = préproduction technique seulement. Aucun déploiement de production commerciale ou fusion vers `main` tant que les contrôles CI, sécurité, sauvegarde/restauration et recette ne sont pas verts.
