import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";
const numberOrUndefined = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const OrderCostAllocations: CollectionConfig<"order-cost-allocations"> = {
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
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: "Bon de commande fournisseur source" },
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
      async ({ data, originalDoc, req }) => {
        if (!data) return data;
        const amount = numberOrUndefined(data.allocatedSourceAmount ?? originalDoc?.allocatedSourceAmount);
        const rate = numberOrUndefined(data.exchangeRateToXOF ?? originalDoc?.exchangeRateToXOF);
        if (amount === undefined || rate === undefined || amount < 0 || rate <= 0) {
          delete data.allocatedCostXOF;
          if ((data.status ?? originalDoc?.status) === "approved") throw new Error("Un coût approuvé exige un montant et un taux valides.");
          return data;
        }
        data.allocatedCostXOF = Math.round(amount * rate);
        if ((data.status ?? originalDoc?.status) !== "approved") return data;
        if (amount <= 0 || data.allocatedCostXOF <= 0) throw new Error("Un coût approuvé doit être strictement positif.");
        const idOf = (value: unknown): string | undefined => {
          if (typeof value === "string" || typeof value === "number") return String(value);
          if (value && typeof value === "object" && "id" in value) return String((value as { id?: string | number }).id ?? "");
          return undefined;
        };
        const sourceId = idOf(data.cashTransaction ?? originalDoc?.cashTransaction);
        const evidence = data.allocationEvidence ?? originalDoc?.allocationEvidence;
        const notes = data.calculationNotes ?? originalDoc?.calculationNotes;
        if (!sourceId && (!Array.isArray(evidence) || evidence.length === 0) && !String(notes ?? "").trim()) throw new Error("Justificatif, dépense source ou détail de calcul requis pour approuver le coût.");
        if (sourceId) {
          const source = await req.payload.findByID({ collection: "cash-transactions", id: sourceId, depth: 0, overrideAccess: true });
          if (source.status !== "confirmed" || ["customer_payment", "customer_refund"].includes(String(source.transactionType))) throw new Error("La dépense source doit être confirmée.");
          if (source.currency !== (data.sourceCurrency ?? originalDoc?.sourceCurrency)) throw new Error("La devise de la dépense source et de l'affectation doit correspondre.");
          const allocations = await req.payload.find({ collection: "order-cost-allocations", where: { cashTransaction: { equals: sourceId } }, limit: 10000, pagination: false, depth: 0, overrideAccess: true });
          const currentId = originalDoc?.id ? String(originalDoc.id) : "";
          const totalAllocated = allocations.docs.reduce((sum, item) => String(item.id) === currentId || item.status !== "approved" ? sum : sum + Number(item.allocatedSourceAmount ?? 0), 0);
          if (totalAllocated + amount > Number(source.amount ?? 0) + 0.01) throw new Error("Les coûts affectés dépassent le montant de la dépense source.");
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
