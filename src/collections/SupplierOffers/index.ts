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
    { name: "sourcingRequest", type: "relationship", relationTo: "sourcing-requests", label: "Demande client concernée" },
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: "Bon de commande issu de cette offre" },
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
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data;
        const supplierValue = data.supplier ?? originalDoc?.supplier;
        const supplierId = typeof supplierValue === "object" && supplierValue ? supplierValue.id : supplierValue;
        const status = data.quoteStatus ?? originalDoc?.quoteStatus;
        const price = typeof data.unitPrice === "number" ? data.unitPrice : originalDoc?.unitPrice;
        const moq = typeof data.minimumOrderQuantity === "number" ? data.minimumOrderQuantity : originalDoc?.minimumOrderQuantity;
        const validity = data.validUntil ?? originalDoc?.validUntil;
        if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) throw new Error("Le prix unitaire fournisseur doit être supérieur à zéro.");
        if (typeof moq === "number" && (!Number.isInteger(moq) || moq < 1)) throw new Error("La quantité minimale fournisseur doit être un entier supérieur ou égal à 1.");
        if (status === "approved") {
          if (!supplierId) throw new Error("Sélectionnez un fournisseur avant de valider son offre.");
          const supplier = await (req.payload as any).findByID({ collection: "suppliers", id: supplierId, depth: 0, overrideAccess: true });
          if (!supplier || supplier.verificationStatus !== "verified") throw new Error("Le fournisseur doit être vérifié avant de valider son offre commerciale.");
          if (validity) {
            const validUntilTime = new Date(validity).getTime();
            if (!Number.isFinite(validUntilTime) || validUntilTime < Date.now()) throw new Error("Cette offre fournisseur est expirée ou sa date de validité est incorrecte.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
