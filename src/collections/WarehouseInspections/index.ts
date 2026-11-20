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
    { name: "shipment", type: "relationship", relationTo: "inbound-shipments", required: true, label: "Expédition" },
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
  timestamps: true,
};
