import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";
const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const OrderCostAllocations: CollectionConfig = {
  slug: "order-cost-allocations",
  labels: { singular: "Affectation de coût", plural: "Affectations de coûts" },
  admin: {
    useAsTitle: "allocationReference",
    defaultColumns: ["allocationReference", "order", "shipment", "costCategory", "allocatedCostXOF", "status"],
    group: "Finance et coûts",
    description: "Répartition documentée des coûts logistiques et opérationnels entre les commandes.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "allocationReference", type: "text", required: true, unique: true, label: "Référence d'affectation" },
    { name: "order", type: "relationship", relationTo: "orders", required: true, label: "Commande bénéficiaire" },
    { name: "shipment", type: "relationship", relationTo: "inbound-shipments", label: "Expédition d'origine" },
    { name: "cashTransaction", type: "relationship", relationTo: "cash-transactions", label: "Dépense source enregistrée" },
    {
      name: "costCategory",
      type: "select",
      required: true,
      options: [
        { label: "Achat marchandise", value: "goods_purchase" },
        { label: "Transport Chine", value: "china_transport" },
        { label: "Fret international", value: "international_freight" },
        { label: "Assurance", value: "insurance" },
        { label: "Douane et taxes", value: "customs" },
        { label: "Stockage et manutention", value: "handling" },
        { label: "Livraison locale", value: "last_mile" },
        { label: "Autre", value: "other" },
      ],
      label: "Catégorie de coût",
    },
    {
      name: "allocationMethod",
      type: "select",
      required: true,
      defaultValue: "manual",
      options: [
        { label: "Montant affecté manuellement", value: "manual" },
        { label: "Répartition égale", value: "equal" },
        { label: "Selon le poids", value: "weight" },
        { label: "Selon le volume", value: "volume" },
        { label: "Selon la valeur des marchandises", value: "goods_value" },
      ],
      label: "Méthode de répartition",
      admin: { description: "La méthode décrit la règle utilisée. Le montant affecté doit être calculé et vérifié par l'équipe avant validation." },
    },
    { name: "sourceAmount", type: "number", required: true, min: 0, label: "Montant source total ou base de calcul" },
    {
      name: "sourceCurrency",
      type: "select",
      required: true,
      options: [
        { label: "XOF", value: "XOF" },
        { label: "CNY", value: "CNY" },
        { label: "USD", value: "USD" },
        { label: "EUR", value: "EUR" },
      ],
      label: "Devise source",
    },
    { name: "exchangeRateToXOF", type: "number", required: true, min: 0.000001, label: "Taux appliqué vers XOF" },
    { name: "allocatedSourceAmount", type: "number", required: true, min: 0, label: "Part affectée dans la devise source" },
    { name: "allocatedCostXOF", type: "number", admin: { readOnly: true }, label: "Coût affecté en XOF" },
    { name: "allocationEvidence", type: "relationship", relationTo: "media", hasMany: true, label: "Justificatifs et calcul de répartition" },
    { name: "calculationNotes", type: "textarea", label: "Détail de la règle et des hypothèses" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Brouillon", value: "draft" },
        { label: "À vérifier", value: "review" },
        { label: "Validée", value: "approved" },
        { label: "Annulée", value: "cancelled" },
      ],
      label: "Statut de validation",
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        const amount = numberOrUndefined(data.allocatedSourceAmount);
        const rate = numberOrUndefined(data.exchangeRateToXOF);
        if (amount === undefined || rate === undefined || rate <= 0) {
          delete data.allocatedCostXOF;
          return data;
        }
        data.allocatedCostXOF = Math.round(amount * rate);
        return data;
      },
    ],
  },
  timestamps: true,
};
