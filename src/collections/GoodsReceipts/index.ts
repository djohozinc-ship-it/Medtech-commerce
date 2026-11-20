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
    { name: "disputeStatus", type: "select", defaultValue: "not_opened", options: [
      { label: "Aucun litige", value: "not_opened" },
      { label: "À transmettre au fournisseur", value: "to_submit" },
      { label: "En cours de traitement", value: "in_progress" },
      { label: "Avoir / remplacement promis", value: "compensation_promised" },
      { label: "Résolu", value: "resolved" },
      { label: "Rejeté par le fournisseur", value: "rejected" },
    ], label: "État de la réclamation" },
    { name: "compensationAmount", type: "number", min: 0, label: "Montant de compensation obtenu" },
    { name: "compensationCurrency", type: "select", options: [{ label: "CNY", value: "CNY" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }, { label: "XOF", value: "XOF" }], label: "Devise de la compensation" },
    { name: "resolutionNotes", type: "textarea", label: "Résolution / compensation convenue" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const payload = req.payload as any;
        const purchaseOrderId = typeof doc.purchaseOrder === "object" ? doc.purchaseOrder?.id : doc.purchaseOrder;
        if (!purchaseOrderId) return doc;

        const purchaseOrder = await payload.findByID({
          collection: "purchase-orders",
          id: purchaseOrderId,
          depth: 0,
          overrideAccess: true,
        });
        if (!purchaseOrder || !Array.isArray(purchaseOrder.items)) return doc;

        const receipts = await payload.find({
          collection: "goods-receipts",
          where: { purchaseOrder: { equals: purchaseOrderId } },
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        });
        const receivedByLine = new Map<string, number>();
        for (const receipt of receipts.docs) {
          if (!["accepted", "accepted_with_reservations"].includes(String(receipt.status))) continue;
          for (const item of Array.isArray(receipt.items) ? receipt.items : []) {
            const lineId = String(item.purchaseOrderItemID ?? "");
            if (!lineId) continue;
            receivedByLine.set(lineId, (receivedByLine.get(lineId) ?? 0) + Number(item.quantityReceived ?? 0));
          }
        }
        let anyReceived = false;
        let allReceived = true;
        const items = purchaseOrder.items.map((item: Record<string, unknown>) => {
          const lineId = String(item.id ?? "");
          const quantity = Number(item.quantity ?? 0);
          const receivedQuantity = receivedByLine.get(lineId) ?? 0;
          if (receivedQuantity > 0) anyReceived = true;
          if (receivedQuantity < quantity) allReceived = false;
          return { ...item, receivedQuantity };
        });
        const nextStatus = allReceived && anyReceived ? "received" : anyReceived ? "partially_received" : ["received", "partially_received"].includes(String(purchaseOrder.status)) ? "acknowledged" : purchaseOrder.status;
        await payload.update({
          collection: "purchase-orders",
          id: purchaseOrderId,
          overrideAccess: true,
          data: {
            items,
            status: nextStatus,
            ...(nextStatus === "received" ? { receivedAt: new Date().toISOString() } : nextStatus === "acknowledged" ? { receivedAt: null } : {}),
          },
        });
        return doc;
      },
    ],
    beforeValidate: [
      async ({ data, operation, req, originalDoc }) => {
        if (!data) return data;
        if (operation === "create" && !data.receiptReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.receiptReference = `GR-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        const purchaseOrderValue = data.purchaseOrder ?? originalDoc?.purchaseOrder;
        const purchaseOrderId = typeof purchaseOrderValue === "object" && purchaseOrderValue ? purchaseOrderValue.id : purchaseOrderValue;
        if (!purchaseOrderId) throw new Error("Toute réception doit être rattachée à un bon de commande fournisseur.");
        const payload = req.payload as any;
        const po = await payload.findByID({ collection: "purchase-orders", id: purchaseOrderId, depth: 0, overrideAccess: true });
        if (!po || !Array.isArray(po.items)) throw new Error("Bon de commande introuvable ou sans lignes.");
        if (!["acknowledged", "partially_received"].includes(String(po.status)) && !originalDoc) {
          throw new Error("Le fournisseur doit avoir confirmé le bon de commande avant toute réception.");
        }
        const orderLines = new Map<string, Record<string, unknown>>(po.items.map((line: Record<string, unknown>) => [String(line.id), line]));
        const currentReceiptId = originalDoc?.id;
        const otherReceipts = await payload.find({
          collection: "goods-receipts",
          where: { and: [{ purchaseOrder: { equals: purchaseOrderId } }, ...(currentReceiptId ? [{ id: { not_equals: currentReceiptId } }] : [])] },
          limit: 10000, depth: 0, overrideAccess: true,
        });
        const previouslyAccepted = new Map<string, number>();
        for (const receipt of otherReceipts.docs) {
          if (!["accepted", "accepted_with_reservations"].includes(String(receipt.status))) continue;
          for (const line of Array.isArray(receipt.items) ? receipt.items : []) {
            const key = String(line.purchaseOrderItemID ?? "");
            previouslyAccepted.set(key, (previouslyAccepted.get(key) ?? 0) + Number(line.quantityReceived ?? 0));
          }
        }
        for (const item of (Array.isArray(data.items) ? data.items : (originalDoc?.items ?? [])) as Array<Record<string, unknown>>) {
          const expected = Number(item.quantityExpected);
          const received = Number(item.quantityReceived);
          const damaged = Number(item.damagedQuantity ?? 0);
          const missing = Number(item.missingQuantity ?? 0);
          const lineId = String(item.purchaseOrderItemID ?? "");
          const orderedLine = orderLines.get(lineId);
          if (![expected, received, damaged, missing].every(Number.isFinite) || expected < 0 || received < 0 || damaged < 0 || missing < 0 || damaged > received || damaged + missing > expected) {
            throw new Error("Vérifiez les quantités attendues, reçues, endommagées et manquantes.");
          }
          if (!orderedLine) throw new Error("Une ligne de réception ne correspond pas à une ligne de ce bon de commande.");
          const orderedQty = Number(orderedLine.quantity ?? 0);
          if (expected > orderedQty || (previouslyAccepted.get(lineId) ?? 0) + received > orderedQty) {
            throw new Error("La quantité réceptionnée cumulée ne peut pas dépasser la quantité commandée.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
