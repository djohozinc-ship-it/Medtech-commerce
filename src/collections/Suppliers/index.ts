import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) =>
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
    { name: "beneficiaryName", type: "text", label: "Nom du bénéficiaire bancaire" },
    { name: "bankName", type: "text", label: "Banque du fournisseur" },
    { name: "bankCountry", type: "text", label: "Pays de la banque" },
    { name: "bankAddress", type: "textarea", label: "Adresse de la banque" },
    { name: "bankAccountNumber", type: "text", label: "Numéro de compte / IBAN" },
    { name: "swiftCode", type: "text", label: "Code SWIFT / BIC" },
    { name: "alipayOrWechatPay", type: "text", label: "Identifiant Alipay / WeChat Pay professionnel" },
    { name: "paymentDetailsVerified", type: "checkbox", defaultValue: false, label: "Coordonnées de paiement vérifiées indépendamment" },
    { name: "defaultLeadTimeDays", type: "number", min: 0, label: "Délai habituel (jours)" },
    { name: "internalRating", type: "number", min: 1, max: 5, label: "Évaluation interne (1 à 5)" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
    { name: "documents", type: "relationship", relationTo: "media", hasMany: true, label: "Documents de vérification" },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data;
        const status = data.verificationStatus ?? originalDoc?.verificationStatus;
        if (status === "verified") {
          const company = data.companyName ?? originalDoc?.companyName;
          const contact = data.contactName ?? originalDoc?.contactName;
          const email = data.email ?? originalDoc?.email;
          const phone = data.phone ?? originalDoc?.phone;
          const country = data.country ?? originalDoc?.country;
          const documents = data.documents ?? originalDoc?.documents;
          if (!company || !contact || !email || !phone || !country || !Array.isArray(documents) || documents.length === 0) {
            throw new Error("Pour vérifier un fournisseur, renseignez l'entreprise, le contact, l'e-mail, le téléphone, le pays et au moins un document justificatif.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
