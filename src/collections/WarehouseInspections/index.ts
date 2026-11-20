import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const WarehouseInspections: CollectionConfig = {
  slug: "warehouse-inspections",
  labels: { singular: "Contrôle à réception", plural: "Contrôles à réception" },
  admin: {
    useAsTitle: "inspectionReference",
    defaultColumns: ["inspectionReference", "shipment", "warehouse", "inspectionDate", "result"],
    group: "Logistique",
    description: "Constat documenté de réception, quantité, état et conformité des colis.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "inspectionReference", type: "text", required: true, unique: true, label: "Référence du contrôle" },
    { name: "shipment", type: "relationship", relationTo: "inbound-shipments", label: "Expédition" },
    { name: "goodsReceipt", type: "relationship", relationTo: "goods-receipts", label: "Réception fournisseur concernée" },
    { name: "warehouse", type: "relationship", relationTo: "warehouses", required: true, label: "Entrepôt de contrôle" },
    { name: "inspectionDate", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date du contrôle" },
    { name: "inspectorName", type: "text", label: "Nom du contrôleur" },
    { name: "packagesExpected", type: "number", min: 0, label: "Colis attendus" },
    { name: "packagesReceived", type: "number", min: 0, label: "Colis reçus" },
    { name: "quantityExpected", type: "number", min: 0, label: "Quantité attendue" },
    { name: "quantityReceived", type: "number", min: 0, label: "Quantité reçue" },
    { name: "damagedQuantity", type: "number", min: 0, label: "Quantité endommagée" },
    { name: "missingQuantity", type: "number", min: 0, label: "Quantité manquante" },
    { name: "result", type: "select", required: true, defaultValue: "pending", options: [
      { label: "En attente", value: "pending" },
      { label: "Conforme", value: "passed" },
      { label: "Conforme avec réserves", value: "passed_with_reservations" },
      { label: "Non conforme", value: "failed" },
    ], label: "Résultat du contrôle" },
    { name: "inspectionNotes", type: "textarea", label: "Observations et anomalies" },
    { name: "evidencePhotos", type: "relationship", relationTo: "media", hasMany: true, label: "Photos justificatives" },
    { name: "proofOfReceipt", type: "relationship", relationTo: "media", hasMany: true, label: "Bons de réception / documents" },
    { name: "supplierNotified", type: "checkbox", defaultValue: false, label: "Fournisseur informé en cas d'anomalie" },
    { name: "resolutionNotes", type: "textarea", label: "Action corrective / réclamation" },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data;
        const receiptValue = data.goodsReceipt ?? originalDoc?.goodsReceipt;
        const receiptId = typeof receiptValue === "object" && receiptValue ? receiptValue.id : receiptValue;
        if (receiptId) {
          const receipt = await (req.payload as any).findByID({
            collection: "goods-receipts", id: receiptId, depth: 0, overrideAccess: true,
          });
          if (!receipt) throw new Error("La réception fournisseur liée à ce contrôle est introuvable.");
          const inspectionWarehouseValue = data.warehouse ?? originalDoc?.warehouse;
          const inspectionWarehouseId = typeof inspectionWarehouseValue === "object" && inspectionWarehouseValue ? inspectionWarehouseValue.id : inspectionWarehouseValue;
          const receiptWarehouseId = typeof receipt.warehouse === "object" && receipt.warehouse ? receipt.warehouse.id : receipt.warehouse;
          if (String(inspectionWarehouseId ?? "") !== String(receiptWarehouseId ?? "")) {
            throw new Error("Le contrôle qualité doit être effectué dans le même entrepôt que la réception fournisseur.");
          }
          const receiptShipmentId = typeof receipt.inboundShipment === "object" && receipt.inboundShipment ? receipt.inboundShipment.id : receipt.inboundShipment;
          const inspectionShipmentValue = data.shipment ?? originalDoc?.shipment;
          const inspectionShipmentId = typeof inspectionShipmentValue === "object" && inspectionShipmentValue ? inspectionShipmentValue.id : inspectionShipmentValue;
          if (receiptShipmentId && inspectionShipmentId && String(receiptShipmentId) !== String(inspectionShipmentId)) {
            throw new Error("L'expédition du contrôle ne correspond pas à celle de la réception liée.");
          }
          if (receiptShipmentId && !inspectionShipmentId) data.shipment = receiptShipmentId;
        }
        const expectedValue = data.quantityExpected ?? originalDoc?.quantityExpected;
        const receivedValue = data.quantityReceived ?? originalDoc?.quantityReceived;
        const expected = expectedValue == null ? undefined : Number(expectedValue);
        const received = receivedValue == null ? undefined : Number(receivedValue);
        const damaged = Number(data.damagedQuantity ?? originalDoc?.damagedQuantity ?? 0);
        const missing = Number(data.missingQuantity ?? originalDoc?.missingQuantity ?? 0);
        const packagesExpectedValue = data.packagesExpected ?? originalDoc?.packagesExpected;
        const packagesReceivedValue = data.packagesReceived ?? originalDoc?.packagesReceived;
        const packagesExpected = packagesExpectedValue == null ? undefined : Number(packagesExpectedValue);
        const packagesReceived = packagesReceivedValue == null ? undefined : Number(packagesReceivedValue);
        const values = [expected, received, damaged, missing, packagesExpected, packagesReceived].filter((value): value is number => value !== undefined);
        if (!values.every(Number.isFinite) || values.some((value) => !Number.isInteger(value) || value < 0) ||
            (received !== undefined && damaged > received) ||
            (expected !== undefined && missing > expected) ||
            (expected !== undefined && received !== undefined && received + missing > expected) ||
            (packagesExpected !== undefined && packagesReceived !== undefined && packagesReceived > packagesExpected)) {
          throw new Error("Les quantités de colis et de produits inspectés sont incohérentes.");
        }
        const result = data.result ?? originalDoc?.result;
        if (result === "passed" && (damaged > 0 || missing > 0)) {
          throw new Error("Une inspection avec des produits endommagés ou manquants doit être validée avec réserves ou déclarée non conforme.");
        }
        if (result === "passed_with_reservations" && damaged + missing === 0 && !(data.inspectionNotes ?? originalDoc?.inspectionNotes)) {
          throw new Error("Indiquez au moins une réserve réelle ou choisissez « Conforme ».");
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        const receiptValue = doc.goodsReceipt;
        const receiptId = typeof receiptValue === "object" && receiptValue ? receiptValue.id : receiptValue;
        if (!receiptId) return doc;
        const status = doc.result === "passed" ? "accepted"
          : doc.result === "passed_with_reservations" ? "accepted_with_reservations"
          : doc.result === "failed" ? "rejected" : "pending_inspection";
        await (req.payload as any).update({
          collection: "goods-receipts",
          id: receiptId,
          overrideAccess: true,
          data: { status, inspection: doc.id },
        });
        return doc;
      },
    ],
  },
  timestamps: true,
};
