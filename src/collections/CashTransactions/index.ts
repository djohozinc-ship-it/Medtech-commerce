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
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: "Bon de commande fournisseur concerné" },
    { name: "purchasePaymentStage", type: "select", options: [{ label: "Acompte", value: "deposit" }, { label: "Paiement intermédiaire", value: "installment" }, { label: "Solde", value: "balance" }, { label: "Paiement intégral", value: "full" }], label: "Étape du paiement fournisseur" },
    { name: "purchaseOrderExchangeRate", type: "number", min: 0.000001, label: "Taux vers la devise du bon de commande" },
    { name: "amountInPurchaseOrderCurrency", type: "number", admin: { readOnly: true }, label: "Montant converti dans la devise du bon" },
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
      async ({ data, originalDoc, operation, req }) => {
        if (!data) return data;
        if (operation === "create" && !data.transactionReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.transactionReference = `FIN-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        const transactionType = data.transactionType ?? originalDoc?.transactionType;
        const purchaseOrderValue = data.purchaseOrder ?? originalDoc?.purchaseOrder;
        const purchaseOrderId = typeof purchaseOrderValue === "object" ? purchaseOrderValue?.id : purchaseOrderValue;
        if (transactionType === "supplier_payment" && !purchaseOrderId) throw new Error("Un paiement fournisseur doit être lié à un bon de commande.");
        if (transactionType === "supplier_payment" && (data.status ?? originalDoc?.status) === "confirmed") {
          const proof = data.proofDocuments ?? originalDoc?.proofDocuments;
          const providerReference = data.providerTransactionId ?? originalDoc?.providerTransactionId;
          const confirmedBy = data.confirmedBy ?? originalDoc?.confirmedBy;
          if ((!Array.isArray(proof) || proof.length === 0) && !providerReference) {
            throw new Error("Joignez un justificatif de paiement ou renseignez la référence bancaire / opérateur avant confirmation.");
          }
          if (!confirmedBy) throw new Error("Indiquez la personne qui a vérifié le paiement fournisseur.");
        }
        if (transactionType === "supplier_payment" && purchaseOrderId) {
          const payload = req.payload as any;
          const purchaseOrder = await payload.findByID({
            collection: "purchase-orders",
            id: purchaseOrderId,
            depth: 0,
            overrideAccess: true,
          });
          const paymentCurrency = data.currency ?? originalDoc?.currency;
          const amount = Number(data.amount ?? originalDoc?.amount);
          const suppliedRate = Number(data.purchaseOrderExchangeRate ?? originalDoc?.purchaseOrderExchangeRate);
          const rate = paymentCurrency === purchaseOrder.currency ? 1 : suppliedRate;
          if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(rate) || rate <= 0) {
            throw new Error("Pour un paiement fournisseur lié à un bon, indiquez un montant valide et un taux de change si les devises diffèrent.");
          }
          data.purchaseOrderExchangeRate = rate;
          data.amountInPurchaseOrderCurrency = Math.round(amount * rate * 100) / 100;
          if ((data.status ?? originalDoc?.status) === "confirmed") {
            const existing = await payload.find({
              collection: "cash-transactions",
              where: { and: [
                { purchaseOrder: { equals: purchaseOrderId } },
                { transactionType: { equals: "supplier_payment" } },
                { status: { equals: "confirmed" } },
              ] },
              limit: 10000, depth: 0, overrideAccess: true,
            });
            const currentId = originalDoc?.id ? String(originalDoc.id) : "";
            const alreadyPaid = existing.docs.reduce((sum: number, item: Record<string, unknown>) =>
              String(item.id) === currentId ? sum : sum + Number(item.amountInPurchaseOrderCurrency ?? 0), 0);
            if (alreadyPaid + Number(data.amountInPurchaseOrderCurrency) > Number(purchaseOrder.totalAmount ?? 0) + 0.01) {
              throw new Error("Ce paiement dépasserait le montant total du bon de commande. Vérifiez les paiements déjà confirmés.");
            }
          }
        } else {
          delete data.amountInPurchaseOrderCurrency;
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const payload = req.payload as any;
        const relationId = (value: unknown) =>
          typeof value === "object" && value !== null ? String((value as { id?: string | number }).id ?? "") : String(value ?? "");
        const ids = [...new Set([relationId(doc.purchaseOrder), relationId(previousDoc?.purchaseOrder)].filter(Boolean))];
        for (const purchaseOrderId of ids) {
          const purchaseOrder = await payload.findByID({
            collection: "purchase-orders",
            id: purchaseOrderId,
            depth: 0,
            overrideAccess: true,
          });
          const payments = await payload.find({
            collection: "cash-transactions",
            where: {
              and: [
                { purchaseOrder: { equals: purchaseOrderId } },
                { transactionType: { equals: "supplier_payment" } },
                { status: { equals: "confirmed" } },
              ],
            },
            limit: 10000,
            depth: 0,
            overrideAccess: true,
          });
          const paid = payments.docs.reduce((sum: number, payment: Record<string, unknown>) =>
            sum + Number(payment.amountInPurchaseOrderCurrency ?? 0), 0);
          const total = Number(purchaseOrder.totalAmount ?? 0);
          await payload.update({
            collection: "purchase-orders",
            id: purchaseOrderId,
            overrideAccess: true,
            data: {
              amountPaid: Math.round(paid * 100) / 100,
              balanceDue: Math.max(0, Math.round((total - paid) * 100) / 100),
              paymentStatus: paid <= 0 ? "unpaid" : paid + 0.01 >= total ? "paid" : "partially_paid",
            },
          });
        }
        return doc;
      },
    ],
  },
  timestamps: true,
};
