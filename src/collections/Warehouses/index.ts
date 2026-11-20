import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const Warehouses: CollectionConfig = {
  slug: "warehouses",
  labels: { singular: "Entrepôt", plural: "Entrepôts" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "country", "city", "warehouseType", "active"],
    group: "Logistique",
    description: "Sites de réception, stockage, contrôle et regroupement des marchandises.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "name", type: "text", required: true, label: "Nom du site" },
    { name: "warehouseCode", type: "text", unique: true, label: "Code interne" },
    { name: "warehouseType", type: "select", required: true, defaultValue: "china_origin", options: [
      { label: "Entrepôt en Chine", value: "china_origin" },
      { label: "Entrepôt au Bénin", value: "benin_destination" },
      { label: "Site partenaire / transit", value: "transit_partner" },
    ] },
    { name: "country", type: "text", required: true, label: "Pays" },
    { name: "city", type: "text", required: true, label: "Ville" },
    { name: "address", type: "textarea", label: "Adresse complète" },
    { name: "contactName", type: "text", label: "Contact sur place" },
    { name: "phone", type: "text", label: "Téléphone / WhatsApp" },
    { name: "email", type: "email", label: "E-mail" },
    { name: "operatorCompany", type: "text", label: "Société exploitante / partenaire" },
    { name: "operatingHours", type: "textarea", label: "Horaires et consignes de réception" },
    { name: "active", type: "checkbox", defaultValue: true, label: "Site actif" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  timestamps: true,
};
