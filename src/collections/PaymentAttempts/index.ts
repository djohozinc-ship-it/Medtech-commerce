import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const PaymentAttempts: CollectionConfig = {
  slug: "payment-attempts",
  labels: { singular: "Tentative de paiement", plural: "Tentatives de paiement" },
  admin: {
    useAsTitle: "paymentReference",
    defaultColumns: ["paymentReference", "order", "provider", "amount", "currency", "status"],
    group: "Finance et coûts",
    description: "Journal des tentatives de paiement en ligne. Seul un retour serveur vérifié du prestataire pourra confirmer un paiement.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "paymentReference", type: "text", required: true, unique: true, index: true, label: "Référence interne" },
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: "Commande" },
    { name: "customer", type: "relationship", relationTo: "customers", label: "Client" },
    { name: "provider", type: "select", required: true, defaultValue: "fedapay", options: [
      { label: "FedaPay", value: "fedapay" },
    ], label: "Prestataire" },
    { name: "providerTransactionId", type: "text", index: true, label: "Identifiant transaction prestataire" },
    { name: "amount", type: "number", required: true, min: 1, label: "Montant demandé" },
    { name: "currency", type: "select", required: true, defaultValue: "XOF", options: [
      { label: "Franc CFA BCEAO (XOF)", value: "XOF" },
    ], label: "Devise" },
    { name: "paymentUrl", type: "text", label: "Lien de paiement hébergé" },
    { name: "status", type: "select", required: true, defaultValue: "created", options: [
      { label: "Créée", value: "created" },
      { label: "En attente du client", value: "pending" },
      { label: "Payée — webhook vérifié", value: "paid" },
      { label: "Échouée", value: "failed" },
      { label: "Expirée", value: "expired" },
      { label: "Annulée", value: "cancelled" },
    ], label: "Statut" },
    { name: "expiresAt", type: "date", label: "Expiration" },
    { name: "verifiedAt", type: "date", label: "Date de confirmation serveur" },
    { name: "providerPayload", type: "json", admin: { readOnly: true }, label: "Réponse technique du prestataire" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  timestamps: true,
};
