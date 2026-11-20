import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const CashTransactions: CollectionConfig = {
  slug: "cash-transactions",
  labels: { singular: "Mouvement financier", plural: "Journal financier" },
  admin: {
    useAsTitle: "transactionReference",
    defaultColumns: ["transactionReference", "transactionType", "amount", "currency", "status", "transactionDate"],
    group: "Finance et coûts",
    description: "Journal des encaissements, paiements fournisseurs, dépenses et remboursements. Une ligne confirmée doit être justifiée.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "transactionReference", type: "text", required: true, unique: true, index: true, label: "Référence du mouvement" },
    {
      name: "transactionType",
      type: "select",
      required: true,
      options: [
        { label: "Paiement reçu d'un client", value: "customer_payment" },
        { label: "Paiement à un fournisseur", value: "supplier_payment" },
        { label: "Fret et transport", value: "freight_expense" },
        { label: "Douane et taxes", value: "customs_expense" },
        { label: "Manutention / entreposage", value: "handling_expense" },
        { label: "Livraison locale", value: "local_delivery_expense" },
        { label: "Autre dépense opérationnelle", value: "operating_expense" },
        { label: "Remboursement client", value: "customer_refund" },
        { label: "Autre mouvement", value: "other" },
      ],
      label: "Nature du mouvement",
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "En attente de confirmation", value: "pending" },
        { label: "Confirmé / exécuté", value: "confirmed" },
        { label: "Échoué", value: "failed" },
        { label: "Annulé", value: "cancelled" },
      ],
      label: "Statut",
    },
    { name: "amount", type: "number", required: true, min: 0.01, label: "Montant" },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: "XOF",
      options: [
        { label: "Franc CFA BCEAO (XOF)", value: "XOF" },
        { label: "Yuan chinois (CNY)", value: "CNY" },
        { label: "Dollar américain (USD)", value: "USD" },
        { label: "Euro (EUR)", value: "EUR" },
      ],
      label: "Devise",
    },
    { name: "transactionDate", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date du mouvement" },
    {
      name: "paymentMethod",
      type: "select",
      options: [
        { label: "Espèces", value: "cash" },
        { label: "Virement bancaire", value: "bank_transfer" },
        { label: "Mobile Money — saisie manuelle", value: "mobile_money_manual" },
        { label: "Mobile Money — passerelle FedaPay", value: "mobile_money_gateway" },
        { label: "Carte — saisie manuelle", value: "card_manual" },
        { label: "Paiement via plateforme fournisseur", value: "supplier_platform" },
        { label: "Autre / à préciser", value: "other" },
      ],
      label: "Moyen de paiement",
      admin: { description: "La sélection Mobile Money permet uniquement d'enregistrer un paiement vérifié manuellement. Elle ne déclenche aucun paiement opérateur." },
    },
    { name: "paymentProvider", type: "text", label: "Opérateur / banque / plateforme" },
    { name: "providerTransactionId", type: "text", label: "Référence de transaction opérateur" },
    { name: "customer", type: "relationship", relationTo: "customers", label: "Client concerné" },
    { name: "order", type: "relationship", relationTo: "orders", label: "Commande concernée" },
    { name: "supplier", type: "relationship", relationTo: "suppliers", label: "Fournisseur concerné" },
    { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", label: "Offre fournisseur concernée" },
    { name: "shipment", type: "relationship", relationTo: "inbound-shipments", label: "Expédition concernée" },
    {
      name: "expenseCategory",
      type: "select",
      options: [
        { label: "Achat de marchandises", value: "goods_purchase" },
        { label: "Transport intérieur Chine", value: "china_transport" },
        { label: "Fret international", value: "international_freight" },
        { label: "Assurance", value: "insurance" },
        { label: "Douane et taxes", value: "customs" },
        { label: "Stockage et manutention", value: "warehousing" },
        { label: "Livraison locale", value: "last_mile" },
        { label: "Frais bancaires / paiement", value: "payment_fees" },
        { label: "Marketing", value: "marketing" },
        { label: "Autre", value: "other" },
      ],
      label: "Catégorie de dépense",
    },
    { name: "proofDocuments", type: "relationship", relationTo: "media", hasMany: true, label: "Reçus, factures et justificatifs" },
    { name: "confirmedBy", type: "text", label: "Confirmé par" },
    { name: "confirmationNotes", type: "textarea", label: "Notes de vérification" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data;
        if (operation === "create" && !data.transactionReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.transactionReference = `FIN-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
