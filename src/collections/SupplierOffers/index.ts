import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) =>
  req.user?.collection === "administrators";

export const SupplierOffers: CollectionConfig = {
  slug: "supplier-offers",
  labels: { singular: "Offre fournisseur", plural: "Offres fournisseurs" },
  admin: {
    useAsTitle: "offerReference",
    defaultColumns: ["offerReference", "supplier", "productName", "unitPrice", "currency", "quoteStatus"],
    group: "Approvisionnement",
    description: "Historique des prix et conditions reçus des fournisseurs.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "offerReference", type: "text", required: true, unique: true, label: "Référence de l'offre" },
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: "Fournisseur" },
    { name: "product", type: "relationship", relationTo: "products", label: "Produit du catalogue" },
    { name: "productName", type: "text", required: true, label: "Nom du produit chez le fournisseur" },
    { name: "brand", type: "text", label: "Marque" },
    { name: "model", type: "text", label: "Modèle / Référence" },
    { name: "supplierSKU", type: "text", label: "Référence fournisseur" },
    { name: "productUrl", type: "text", label: "Lien de l'offre source" },
    { name: "unitPrice", type: "number", required: true, min: 0, label: "Prix unitaire fournisseur" },
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
      label: "Devise du prix",
    },
    { name: "minimumOrderQuantity", type: "number", min: 1, defaultValue: 1, label: "Quantité minimale (MOQ)" },
    { name: "availableQuantity", type: "number", min: 0, label: "Quantité disponible annoncée" },
    { name: "unitWeightKg", type: "number", min: 0, label: "Poids unitaire (kg)" },
    { name: "unitLengthCm", type: "number", min: 0, label: "Longueur unitaire (cm)" },
    { name: "unitWidthCm", type: "number", min: 0, label: "Largeur unitaire (cm)" },
    { name: "unitHeightCm", type: "number", min: 0, label: "Hauteur unitaire (cm)" },
    { name: "chinaDomesticShipping", type: "number", min: 0, label: "Transport intérieur Chine (devise de l'offre)" },
    { name: "quotedAt", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date du devis" },
    { name: "validUntil", type: "date", label: "Offre valable jusqu'au" },
    { name: "leadTimeDays", type: "number", min: 0, label: "Délai de préparation annoncé (jours)" },
    {
      name: "quoteStatus",
      type: "select",
      required: true,
      defaultValue: "received",
      options: [
        { label: "Reçue", value: "received" },
        { label: "À vérifier", value: "to_verify" },
        { label: "Validée", value: "approved" },
        { label: "Expirée", value: "expired" },
        { label: "Refusée", value: "rejected" },
      ],
    },
    { name: "qualityNotes", type: "textarea", label: "Contrôle qualité / conformité" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
    { name: "supportingDocuments", type: "relationship", relationTo: "media", hasMany: true, label: "Pro forma, fiches techniques et documents" },
  ],
  timestamps: true,
};
