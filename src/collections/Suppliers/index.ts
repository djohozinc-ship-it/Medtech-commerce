import { type CollectionConfig } from "payload";

const administratorsOnly = ({ req }: { req: { user?: { collection?: string } | null } }) =>
  req.user?.collection === "administrators";

export const Suppliers: CollectionConfig = {
  slug: "suppliers",
  labels: { singular: "Fournisseur", plural: "Fournisseurs" },
  admin: {
    useAsTitle: "companyName",
    defaultColumns: ["companyName", "country", "supplierType", "verificationStatus", "updatedAt"],
    group: "Approvisionnement",
    description: "Répertoire privé des fournisseurs et partenaires d'achat.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "companyName", type: "text", required: true, label: "Nom de l'entreprise" },
    { name: "contactName", type: "text", label: "Nom du contact" },
    { name: "email", type: "email", label: "E-mail" },
    { name: "phone", type: "text", label: "Téléphone / WhatsApp" },
    { name: "country", type: "text", defaultValue: "China", required: true, label: "Pays" },
    { name: "city", type: "text", label: "Ville / Province" },
    {
      name: "supplierType",
      type: "select",
      required: true,
      defaultValue: "manufacturer",
      options: [
        { label: "Fabricant", value: "manufacturer" },
        { label: "Grossiste", value: "wholesaler" },
        { label: "Distributeur", value: "distributor" },
        { label: "Agent d'achat", value: "sourcing_agent" },
        { label: "Autre", value: "other" },
      ],
    },
    {
      name: "verificationStatus",
      type: "select",
      required: true,
      defaultValue: "unverified",
      options: [
        { label: "Non vérifié", value: "unverified" },
        { label: "Documents reçus", value: "documents_received" },
        { label: "Vérification en cours", value: "in_review" },
        { label: "Vérifié", value: "verified" },
        { label: "Refusé", value: "rejected" },
      ],
    },
    { name: "website", type: "text", label: "Site web" },
    { name: "platformProfileUrl", type: "text", label: "Profil Alibaba / 1688 / Made-in-China" },
    { name: "paymentTerms", type: "textarea", label: "Conditions de paiement" },
    { name: "defaultLeadTimeDays", type: "number", min: 0, label: "Délai habituel (jours)" },
    { name: "internalRating", type: "number", min: 1, max: 5, label: "Évaluation interne (1 à 5)" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
    { name: "documents", type: "relationship", relationTo: "media", hasMany: true, label: "Documents de vérification" },
  ],
  timestamps: true,
};
