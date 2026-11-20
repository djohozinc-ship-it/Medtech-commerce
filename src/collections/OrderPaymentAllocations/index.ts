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
        const amount = Number(data.allocatedAmount ?? originalDoc?.allocatedAmount);
        const rate = Number(data.exchangeRateToOrderCurrency ?? originalDoc?.exchangeRateToOrderCurrency);
        if (Number.isFinite(amount) && amount > 0 && Number.isFinite(rate) && rate > 0) {
          data.amountInOrderCurrency = Math.round(amount * rate * 100) / 100;
        } else {
          delete data.amountInOrderCurrency;
        }
        if ((data.status ?? originalDoc?.status) === "confirmed") {
          const relationId = (value: unknown): string | undefined => {
            if (typeof value === "string" || typeof value === "number") return String(value);
            if (value && typeof value === "object" && "id" in value) return String((value as { id?: string | number }).id ?? "");
            return undefined;
          };
          const cashId = relationId(data.cashTransaction ?? originalDoc?.cashTransaction);
          const orderId = relationId(data.order ?? originalDoc?.order);
          if (!cashId || !orderId || !Number.isFinite(amount) || amount <= 0) throw new Error("Rapprochement confirmé incomplet.");
          const cash = await req.payload.findByID({ collection: "cash-transactions", id: cashId, depth: 0, overrideAccess: true });
          const order = await req.payload.findByID({ collection: "orders", id: orderId, depth: 0, overrideAccess: true }) as unknown as Record<string, unknown>;
          if (cash.status !== "confirmed" || cash.transactionType !== "customer_payment") throw new Error("Seul un encaissement client confirmé peut être rapproché.");
          const details = (order.orderDetails ?? {}) as Record<string, unknown>;
          const orderCurrency = String(details.currency ?? "");
          const customerId = relationId(order.customer);
          if (String(data.currency ?? originalDoc?.currency) !== orderCurrency || cash.currency !== orderCurrency) throw new Error("La devise du paiement, de la commande et du rapprochement doit être identique.");
          if (rate !== 1) throw new Error("Le taux doit être 1 pour des devises identiques.");
          if (relationId(cash.customer) && relationId(cash.customer) !== customerId) throw new Error("Le client du mouvement financier ne correspond pas à celui de la commande.");
          if (relationId(cash.order) && relationId(cash.order) !== orderId) throw new Error("Le mouvement financier est lié à une autre commande.");
          const existing = await req.payload.find({ collection: "order-payment-allocations", where: { cashTransaction: { equals: cashId } }, limit: 10000, pagination: false, depth: 0, overrideAccess: true });
          const currentId = originalDoc?.id ? String(originalDoc.id) : "";
          const allocatedFromSource = existing.docs.reduce((sum, item) => String(item.id) === currentId || item.status !== "confirmed" ? sum : sum + Number(item.allocatedAmount ?? 0), 0);
          if (allocatedFromSource + amount > Number(cash.amount ?? 0) + 0.01) throw new Error("Le montant rapproché dépasse l'encaissement source.");
          const forOrder = await req.payload.find({ collection: "order-payment-allocations", where: { order: { equals: orderId } }, limit: 10000, pagination: false, depth: 0, overrideAccess: true });
          const allocatedForOrder = forOrder.docs.reduce((sum, item) => String(item.id) === currentId || item.status !== "confirmed" ? sum : sum + Number(item.amountInOrderCurrency ?? 0), 0);
          const priorConfirmed = forOrder.docs.some(item => item.status === "confirmed" && String(item.id) !== currentId);
          const legacy = Number(details.amountPaid ?? 0);
          if (!priorConfirmed && legacy > 0) throw new Error("Cette commande contient un ancien montant payé sans rapprochement. Enregistrez-le d'abord dans le journal financier et rapprochez-le avant de confirmer un nouveau paiement.");
          if (allocatedForOrder + amount > Number(details.totalWithShipping ?? 0) + 0.01) throw new Error("Le rapprochement dépasse le total de la commande.");
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
