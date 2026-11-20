import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const OrderPaymentAllocations: CollectionConfig = {
  slug: "order-payment-allocations",
  labels: { singular: "Affectation de paiement", plural: "Rapprochements de paiements" },
  admin: {
    useAsTitle: "allocationReference",
    defaultColumns: ["allocationReference", "order", "cashTransaction", "allocatedAmount", "currency", "status"],
    group: "Finance et coûts",
    description: "Rapproche chaque encaissement confirmé avec la commande correspondante. Les montants sont exprimés dans la devise de la commande.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "allocationReference", type: "text", required: true, unique: true, label: "Référence de rapprochement" },
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: "Commande" },
    { name: "cashTransaction", type: "relationship", relationTo: "cash-transactions", required: true, label: "Mouvement financier source" },
    { name: "allocatedAmount", type: "number", required: true, min: 0.01, label: "Montant affecté" },
    {
      name: "currency",
      type: "select",
      required: true,
      options: [
        { label: "XOF — Franc CFA BCEAO", value: "XOF" },
        { label: "CNY — Yuan chinois", value: "CNY" },
        { label: "USD — Dollar américain", value: "USD" },
        { label: "EUR — Euro", value: "EUR" },
        { label: "PLN — Zloty polonais", value: "PLN" },
        { label: "GBP — Livre sterling", value: "GBP" },
      ],
      label: "Devise de la commande",
    },
    { name: "exchangeRateToOrderCurrency", type: "number", min: 0.000001, label: "Taux de conversion vers la devise de commande" },
    { name: "amountInOrderCurrency", type: "number", admin: { readOnly: true }, label: "Montant converti dans la devise de commande" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "En attente de vérification", value: "pending" },
        { label: "Rapproché / confirmé", value: "confirmed" },
        { label: "Rejeté", value: "rejected" },
        { label: "Annulé", value: "cancelled" },
      ],
      label: "Statut du rapprochement",
    },
    { name: "providerReference", type: "text", label: "Référence opérateur / banque" },
    { name: "proofDocuments", type: "relationship", relationTo: "media", hasMany: true, label: "Preuves de paiement" },
    { name: "verifiedBy", type: "text", label: "Vérifié par" },
    { name: "verifiedAt", type: "date", label: "Date de vérification" },
    { name: "notes", type: "textarea", label: "Notes de rapprochement" },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data;
        if (operation === "create" && !data.allocationReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.allocationReference = `PAY-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        const amount = typeof data.allocatedAmount === "number" ? data.allocatedAmount : undefined;
        const rate = typeof data.exchangeRateToOrderCurrency === "number" ? data.exchangeRateToOrderCurrency : undefined;
        if (amount !== undefined && rate !== undefined && rate > 0) {
          data.amountInOrderCurrency = Math.round(amount * rate * 100) / 100;
        } else {
          delete data.amountInOrderCurrency;
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
