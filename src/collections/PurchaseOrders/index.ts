import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

type PurchaseLine = {
  productName?: string | null;
  supplierSKU?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  notes?: string | null;
};

const numeric = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const PurchaseOrders: CollectionConfig = {
  slug: "purchase-orders",
  labels: { singular: "Bon de commande fournisseur", plural: "Bons de commande fournisseurs" },
  admin: {
    useAsTitle: "purchaseOrderReference",
    defaultColumns: ["purchaseOrderReference", "supplier", "status", "currency", "totalAmount", "orderDate"],
    group: "Approvisionnement",
    description: "Commandes d'achat adressées aux fournisseurs. Un bon approuvé et envoyé constitue la référence de l'achat.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "purchaseOrderReference", type: "text", required: true, unique: true, index: true, label: "Référence du bon de commande" },
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: "Fournisseur" },
    { name: "sourcingRequest", type: "relationship", relationTo: "sourcing-requests", label: "Demande client à l'origine de l'achat" },
    { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", label: "Offre fournisseur retenue" },
    { name: "orderDate", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date du bon de commande" },
    { name: "expectedReadyDate", type: "date", label: "Date prévue de disponibilité chez le fournisseur" },
    { name: "expectedDeliveryDate", type: "date", label: "Date prévisionnelle de réception" },
    { name: "supplierReference", type: "text", label: "Référence / numéro de commande du fournisseur" },
    {
      name: "currency",
      type: "select",
      required: true,
      defaultValue: "CNY",
      options: [
        { label: "CNY — Yuan chinois", value: "CNY" },
        { label: "USD — Dollar américain", value: "USD" },
        { label: "EUR — Euro", value: "EUR" },
      ],
      label: "Devise du bon de commande",
    },
    {
      name: "items",
      type: "array",
      minRows: 1,
      required: true,
      label: "Lignes d'achat",
      labels: { singular: "Article", plural: "Articles" },
      fields: [
        { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", label: "Offre fournisseur" },
        { name: "product", type: "relationship", relationTo: "products", label: "Produit du catalogue (si existant)" },
        { name: "productName", type: "text", required: true, label: "Désignation exacte" },
        { name: "brand", type: "text", label: "Marque" },
        { name: "model", type: "text", label: "Modèle / référence" },
        { name: "supplierSKU", type: "text", label: "SKU fournisseur" },
        { name: "quantity", type: "number", required: true, min: 1, label: "Quantité commandée" },
        { name: "unitPrice", type: "number", required: true, min: 0, label: "Prix unitaire dans la devise du bon" },
        { name: "lineTotal", type: "number", admin: { readOnly: true }, label: "Total de la ligne" },
        { name: "technicalRequirements", type: "textarea", label: "Spécifications et exigences qualité" },
        { name: "notes", type: "textarea", label: "Instructions particulières au fournisseur" },
      ],
    },
    { name: "goodsSubtotal", type: "number", admin: { readOnly: true }, label: "Sous-total marchandises" },
    { name: "chinaDomesticShipping", type: "number", min: 0, defaultValue: 0, label: "Transport intérieur Chine" },
    { name: "otherSupplierCharges", type: "number", min: 0, defaultValue: 0, label: "Autres frais facturés par le fournisseur" },
    { name: "totalAmount", type: "number", admin: { readOnly: true }, label: "Total du bon de commande" },
    { name: "paymentTerms", type: "textarea", label: "Conditions de paiement convenues" },
    { name: "depositPercentage", type: "number", min: 0, max: 100, label: "Acompte demandé par le fournisseur (%)" },
    { name: "supplierInvoiceNumber", type: "text", label: "Numéro de facture / pro forma fournisseur" },
    { name: "supplierInvoice", type: "relationship", relationTo: "media", label: "Facture pro forma / facture fournisseur" },
    { name: "approvalName", type: "text", admin: { readOnly: true }, label: "Validé par" },
    { name: "approvedAt", type: "date", admin: { readOnly: true }, label: "Date de validation interne" },
    { name: "sentAt", type: "date", label: "Date d'envoi au fournisseur" },
    { name: "acknowledgedAt", type: "date", label: "Confirmation du fournisseur reçue le" },
    { name: "receivedAt", type: "date", label: "Date de réception complète" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Brouillon", value: "draft" },
        { label: "En attente de validation", value: "awaiting_approval" },
        { label: "Validé en interne", value: "approved" },
        { label: "Envoyé au fournisseur", value: "sent_to_supplier" },
        { label: "Confirmé par le fournisseur", value: "acknowledged" },
        { label: "Réception partielle", value: "partially_received" },
        { label: "Réception complète", value: "received" },
        { label: "Annulé", value: "cancelled" },
      ],
      label: "État du bon de commande",
    },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
    { name: "attachments", type: "relationship", relationTo: "media", hasMany: true, label: "Pièces jointes (pro forma, échanges, spécifications)" },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, operation, req }) => {
        if (!data) return data;
        if (operation === "create" && !data.purchaseOrderReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.purchaseOrderReference = `PO-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }

        const existingItems = Array.isArray(originalDoc?.items) ? originalDoc.items : [];
        const items = Array.isArray(data.items) ? data.items : existingItems;
        let subtotal = 0;
        for (const item of items as PurchaseLine[]) {
          const quantity = numeric(item.quantity);
          const unitPrice = numeric(item.unitPrice);
          if (quantity === undefined || quantity < 1 || unitPrice === undefined || unitPrice < 0) {
            throw new Error("Chaque ligne d'achat doit avoir une quantité positive et un prix unitaire valide.");
          }
          item.lineTotal = Math.round(quantity * unitPrice * 100) / 100;
          subtotal += item.lineTotal;
        }
        const domestic = numeric(data.chinaDomesticShipping) ?? numeric(originalDoc?.chinaDomesticShipping) ?? 0;
        const other = numeric(data.otherSupplierCharges) ?? numeric(originalDoc?.otherSupplierCharges) ?? 0;
        if (domestic < 0 || other < 0) throw new Error("Les frais fournisseur ne peuvent pas être négatifs.");
        data.goodsSubtotal = Math.round(subtotal * 100) / 100;
        data.totalAmount = Math.round((subtotal + domestic + other) * 100) / 100;

        const status = data.status ?? originalDoc?.status;
        if (status === "approved" && originalDoc?.status !== "approved") {
          data.approvalName = req.user?.email ?? "Administrateur";
          data.approvedAt = new Date().toISOString();
        }
        if (status === "sent_to_supplier" && !data.sentAt && !originalDoc?.sentAt) {
          throw new Error("Renseignez la date d'envoi avant de passer le bon à « Envoyé au fournisseur ».");
        }
        if (status === "acknowledged" && !data.acknowledgedAt && !originalDoc?.acknowledgedAt) {
          throw new Error("Renseignez la date de confirmation du fournisseur.");
        }
        if (status === "received" && !data.receivedAt && !originalDoc?.receivedAt) {
          throw new Error("Renseignez la date de réception complète.");
        }
        if (status === "sent_to_supplier" || status === "acknowledged" || status === "partially_received" || status === "received") {
          if (!(data.approvedAt ?? originalDoc?.approvedAt)) {
            throw new Error("Le bon doit être validé en interne avant son envoi au fournisseur.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
