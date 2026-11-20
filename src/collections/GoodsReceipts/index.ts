import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const GoodsReceipts: CollectionConfig = {
  slug: "goods-receipts",
  labels: { singular: "Réception fournisseur", plural: "Réceptions fournisseurs" },
  admin: {
    useAsTitle: "receiptReference",
    defaultColumns: ["receiptReference", "purchaseOrder", "warehouse", "receiptDate", "status"],
    group: "Approvisionnement",
    description: "Réceptions partielles ou complètes des achats, avec contrôle des quantités et des anomalies.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "receiptReference", type: "text", required: true, unique: true, index: true, label: "Référence de réception" },
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", required: true, label: "Bon de commande fournisseur" },
    { name: "warehouse", type: "relationship", relationTo: "warehouses", required: true, label: "Entrepôt de réception" },
    { name: "inboundShipment", type: "relationship", relationTo: "inbound-shipments", label: "Expédition / colis concerné" },
    { name: "receiptDate", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date de réception" },
    { name: "receivedBy", type: "text", label: "Personne ayant réceptionné" },
    {
      name: "items",
      type: "array",
      minRows: 1,
      required: true,
      label: "Articles réceptionnés",
      fields: [
        { name: "purchaseOrderItemID", type: "text", required: true, label: "ID de la ligne du bon de commande" },
        { name: "productName", type: "text", required: true, label: "Désignation" },
        { name: "quantityExpected", type: "number", required: true, min: 0, label: "Quantité attendue sur cette réception" },
        { name: "quantityReceived", type: "number", required: true, min: 0, label: "Quantité physiquement reçue" },
        { name: "damagedQuantity", type: "number", min: 0, defaultValue: 0, label: "Quantité endommagée" },
        { name: "missingQuantity", type: "number", min: 0, defaultValue: 0, label: "Quantité manquante constatée" },
        { name: "notes", type: "textarea", label: "Observations" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending_inspection",
      options: [
        { label: "En attente de contrôle", value: "pending_inspection" },
        { label: "Conforme", value: "accepted" },
        { label: "Acceptée avec réserves", value: "accepted_with_reservations" },
        { label: "Refusée / litige", value: "rejected" },
      ],
      label: "Résultat de la réception",
    },
    { name: "inspection", type: "relationship", relationTo: "warehouse-inspections", label: "Fiche de contrôle qualité détaillée" },
    { name: "evidencePhotos", type: "relationship", relationTo: "media", hasMany: true, label: "Photos à la réception" },
    { name: "deliveryNote", type: "relationship", relationTo: "media", label: "Bon de livraison fournisseur" },
    { name: "disputeOpened", type: "checkbox", defaultValue: false, label: "Litige fournisseur ouvert" },
    { name: "disputeReference", type: "text", label: "Référence de réclamation" },
    { name: "resolutionNotes", type: "textarea", label: "Résolution / compensation convenue" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (!data) return data;
        if (operation === "create" && !data.receiptReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.receiptReference = `GR-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        for (const item of (Array.isArray(data.items) ? data.items : []) as Array<Record<string, unknown>>) {
          const expected = Number(item.quantityExpected);
          const received = Number(item.quantityReceived);
          const damaged = Number(item.damagedQuantity ?? 0);
          const missing = Number(item.missingQuantity ?? 0);
          if (![expected, received, damaged, missing].every(Number.isFinite) || expected < 0 || received < 0 || damaged < 0 || missing < 0 || damaged > received) {
            throw new Error("Vérifiez les quantités attendues, reçues, endommagées et manquantes.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
