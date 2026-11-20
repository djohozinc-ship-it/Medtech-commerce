import type { CollectionConfig } from "payload";

import { authenticated } from "@/access/authenticated";

/**
 * Demandes de sourcing pour les produits absents du catalogue.
 * Les visiteurs peuvent déposer une demande; seules les personnes
 * connectées à l'administration peuvent consulter et traiter les dossiers.
 */
export const SourcingRequests: CollectionConfig = {
  slug: "sourcing-requests",
  labels: {
    singular: "Demande d'approvisionnement",
    plural: "Demandes d'approvisionnement",
  },
  access: {
    create: () => true,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: "productName",
    defaultColumns: ["productName", "customerName", "quantity", "status", "createdAt"],
    group: "Approvisionnement",
    description:
      "Demandes de produits à rechercher auprès de fournisseurs, notamment en Chine.",
  },
  fields: [
    {
      name: "requestReference",
      type: "text",
      label: "Référence de la demande",
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      type: "row",
      fields: [
        {
          name: "customerName",
          type: "text",
          label: "Nom complet",
          required: true,
        },
        {
          name: "customerEmail",
          type: "email",
          label: "Adresse e-mail",
          required: true,
        },
      ],
    },
    {
      name: "customerPhone",
      type: "text",
      label: "Téléphone / WhatsApp avec indicatif",
      required: true,
    },
    {
      name: "productName",
      type: "text",
      label: "Produit recherché",
      required: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "brand",
          type: "text",
          label: "Marque souhaitée",
        },
        {
          name: "model",
          type: "text",
          label: "Référence ou modèle",
        },
      ],
    },
    {
      name: "specifications",
      type: "textarea",
      label: "Description et caractéristiques souhaitées",
      required: true,
    },
    {
      name: "referenceUrl",
      type: "text",
      label: "Lien vers une fiche produit ou une annonce fournisseur",
      admin: {
        description: "Lien facultatif vers une page publique. Ne pas saisir de mot de passe ni de données privées.",
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "quantity",
          type: "number",
          label: "Quantité souhaitée",
          required: true,
          min: 1,
          defaultValue: 1,
        },
        {
          name: "destinationCity",
          type: "text",
          label: "Ville de livraison au Bénin",
          required: true,
          defaultValue: "Cotonou",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "budgetAmount",
          type: "number",
          label: "Budget indicatif (facultatif)",
          min: 0,
        },
        {
          name: "budgetCurrency",
          type: "select",
          label: "Devise du budget",
          defaultValue: "XOF",
          options: [
            { label: "Franc CFA (XOF)", value: "XOF" },
            { label: "Dollar américain (USD)", value: "USD" },
            { label: "Euro (EUR)", value: "EUR" },
            { label: "Yuan chinois (CNY)", value: "CNY" },
          ],
        },
      ],
    },
    {
      name: "status",
      type: "select",
      label: "État de traitement",
      required: true,
      defaultValue: "received",
      options: [
        { label: "Reçue", value: "received" },
        { label: "Recherche fournisseur", value: "supplier_search" },
        { label: "Devis en préparation", value: "quote_preparation" },
        { label: "Devis envoyé", value: "quote_sent" },
        { label: "Acceptée par le client", value: "accepted" },
        { label: "Refusée par le client", value: "declined" },
        { label: "Convertie en commande", value: "converted_to_order" },
        { label: "Impossible à approvisionner", value: "unavailable" },
      ],
    },
    {
      type: "collapsible",
      label: "Traitement interne du devis",
      admin: {
        description: "Informations réservées à l'équipe d'administration.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "quotedAmount",
              type: "number",
              label: "Montant total proposé au client",
              min: 0,
            },
            {
              name: "quotedCurrency",
              type: "select",
              label: "Devise du devis",
              defaultValue: "XOF",
              options: [
                { label: "Franc CFA (XOF)", value: "XOF" },
                { label: "Dollar américain (USD)", value: "USD" },
                { label: "Euro (EUR)", value: "EUR" },
              ],
            },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "depositPercentage",
              type: "number",
              label: "Acompte demandé (%)",
              min: 0,
              max: 100,
            },
            {
              name: "quoteValidUntil",
              type: "date",
              label: "Date limite de validité du devis",
            },
          ],
        },
        {
          name: "internalNotes",
          type: "textarea",
          label: "Notes internes (non destinées au client)",
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (!data) return data;

        // Les visiteurs peuvent soumettre une demande, mais jamais modifier
        // son statut, le devis ou les notes réservées à l'administration.
        const isAdmin = req.user?.collection === "administrators";
        if (!isAdmin) {
          data.status = "received";
          delete data.quotedAmount;
          delete data.quotedCurrency;
          delete data.depositPercentage;
          delete data.quoteValidUntil;
          delete data.internalNotes;
        }

        if (!data.requestReference || !isAdmin) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.requestReference = `SRC-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
