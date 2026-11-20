import { getMySourcingRequests, respondToSourcingQuote } from "@/endpoints/sourcing/requests";
import { sendEmail } from "@/utilities/nodemailer";

import type { Access, CollectionConfig } from "payload";


/**
 * Sourcing requests are public to submit, but private to administrators.
 * Customers access their own records through the /mine endpoint.
 */
const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const SourcingRequests: CollectionConfig<"sourcing-requests"> = {
  slug: "sourcing-requests",
  labels: {
    singular: "Demande d'approvisionnement",
    plural: "Demandes d'approvisionnement",
  },
  access: {
    create: () => true,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  endpoints: [
    { path: "/mine", method: "get", handler: getMySourcingRequests },
    { path: "/respond", method: "post", handler: respondToSourcingQuote },
  ],
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
      name: "attachments",
      type: "array",
      label: "Photos et fiches techniques",
      admin: {
        description: "Fichiers transmis par le client. Formats acceptés : JPG, PNG, WEBP et PDF.",
      },
      fields: [
        {
          name: "file",
          type: "upload",
          relationTo: "sourcing-attachments",
          required: true,
        },
        {
          name: "description",
          type: "text",
          label: "Description du fichier",
        },
      ],
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
          access: { update: ({ req }) => req.user?.collection === "administrators" },
      type: "select",
      label: "État de traitement",
      required: true,
      defaultValue: "received",
      options: [
        { label: "Reçue", value: "received" },
        { label: "Recherche fournisseur", value: "supplier_search" },
        { label: "Devis en préparation", value: "quote_preparation" },
        { label: "Devis envoyé", value: "quote_sent" },
        { label: "Conversion en commande", value: "converting_to_order" },
        { label: "Refusée par le client", value: "declined" },
        { label: "Convertie en commande", value: "converted_to_order" },
        { label: "Devis expiré", value: "expired" },
        { label: "Impossible à approvisionner", value: "unavailable" },
      ],
    },
    {
      name: "convertedOrder",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
      type: "relationship",
      relationTo: "orders",
      label: "Commande créée à partir du devis",
      admin: { readOnly: true, position: "sidebar" },
    },
    {
      type: "row",
      fields: [
        { name: "acceptedAt",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          }, type: "date", label: "Date d'acceptation", admin: { readOnly: true } },
        { name: "declinedAt",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          }, type: "date", label: "Date de refus", admin: { readOnly: true } },
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
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
              type: "number",
              label: "Montant des produits (hors transport)",
              min: 0,
            },
            {
              name: "quotedCurrency",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
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
              name: "quotedShippingCost",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
              type: "number",
              label: "Transport et livraison (devise du devis)",
              min: 0,
              defaultValue: 0,
            },
            {
              name: "quotedTotal",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
              type: "number",
              label: "Total du devis",
              admin: { readOnly: true },
            },
          ],
        },
        {
          name: "quoteConditions",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
          type: "textarea",
          label: "Conditions commerciales communiquées au client",
          admin: { description: "Délais estimés, garantie, inclusions/exclusions, modalités de livraison et de paiement." },
        },
        {
          type: "row",
          fields: [
            {
              name: "depositPercentage",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
              type: "number",
              label: "Acompte demandé (%)",
              min: 0,
              max: 100,
            },
            {
              name: "quoteValidUntil",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
              type: "date",
              label: "Date limite de validité du devis",
            },
          ],
        },
        {
          name: "internalNotes",
          access: {
            read: ({ req }) => req.user?.collection === "administrators",
            update: ({ req }) => req.user?.collection === "administrators",
          },
          type: "textarea",
          label: "Notes internes (non destinées au client)",
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation !== "create" || !data) return data;
        const reference = `SRC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        return {
          ...data,
          requestReference: reference,
          status: "received",
          convertedOrder: null,
          acceptedAt: null,
          declinedAt: null,
          quotedAmount: null,
          quotedCurrency: "XOF",
          quotedShippingCost: 0,
          quotedTotal: null,
          depositPercentage: null,
          quoteValidUntil: null,
          quoteConditions: null,
          internalNotes: null,
        };
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const current = doc as unknown as Record<string, unknown>;
        const previous = previousDoc as unknown as Record<string, unknown> | undefined;
        if (current.status !== "quote_sent" || previous?.status === "quote_sent") return doc;

        const email = typeof current.customerEmail === "string" ? current.customerEmail : "";
        const amount = Number(current.quotedAmount);
        const shipping = Number(current.quotedShippingCost ?? 0);
        const currency = typeof current.quotedCurrency === "string" ? current.quotedCurrency : "XOF";
        if (!email || !Number.isFinite(amount) || amount <= 0) return doc;

        const escapeHtml = (value: unknown) =>
          String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
          })[character] ?? character);
        const baseUrl = (process.env.NEXT_PUBLIC_SERVER_URL ?? "").replace(/\/$/, "");
        const quoteUrl = `${baseUrl}/fr/account/sourcing`;
        const total = amount + (Number.isFinite(shipping) ? shipping : 0);
        const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033">
          <h2>Votre devis Medtech Commerce est disponible</h2>
          <p>Bonjour ${escapeHtml(current.customerName)},</p>
          <p>Nous avons préparé le devis pour votre demande <strong>${escapeHtml(current.requestReference)}</strong> concernant : ${escapeHtml(current.productName)}.</p>
          <p>Montant des produits : <strong>${amount.toLocaleString("fr-FR")} ${escapeHtml(currency)}</strong><br/>
          Transport : <strong>${shipping.toLocaleString("fr-FR")} ${escapeHtml(currency)}</strong><br/>
          Total : <strong>${total.toLocaleString("fr-FR")} ${escapeHtml(currency)}</strong></p>
          <p>Connectez-vous à votre espace client pour consulter les conditions et accepter ou refuser ce devis.</p>
          <p><a href="${escapeHtml(quoteUrl)}">Consulter mon devis</a></p>
          <p>Medtech Commerce</p>
        </div>`;

        try {
          await sendEmail({ to: email, subject: "Votre devis Medtech Commerce est disponible", html });
        } catch (error) {
          req.payload.logger.error({ err: error, msg: "Unable to email customer about sourcing quote" });
        }
        return doc;
      },
    ],
    beforeValidate: [
      ({ data, req, originalDoc }) => {
        if (!data) return data;

        // Les visiteurs peuvent soumettre une demande, mais jamais modifier
        // son statut, le devis ou les notes réservées à l'administration.
        const isAdmin = req.user?.collection === "administrators" || req.context?.sourcingWorkflow === true;
        if (typeof data.customerEmail === "string") data.customerEmail = data.customerEmail.trim().toLowerCase();
        if (!isAdmin) {
          data.status = "received";
          delete data.quotedAmount;
          delete data.quotedCurrency;
          delete data.depositPercentage;
          delete data.quoteValidUntil;
          delete data.internalNotes;
        }

        if (!isAdmin) {
          delete data.convertedOrder;
          delete data.acceptedAt;
          delete data.declinedAt;
          delete data.quotedShippingCost;
          delete data.quotedTotal;
          delete data.quoteConditions;
        } else {
          const amount = data.quotedAmount ?? originalDoc?.quotedAmount;
          const shipping = data.quotedShippingCost ?? originalDoc?.quotedShippingCost ?? 0;
          const status = data.status ?? originalDoc?.status;
          const validUntil = data.quoteValidUntil ?? originalDoc?.quoteValidUntil;
          if (typeof amount === "number" && typeof shipping === "number") {
            data.quotedTotal = amount + shipping;
          }
          if (status === "quote_sent") {
            if (typeof amount !== "number" || amount <= 0) {
              throw new Error("Renseignez un montant de devis positif avant de l'envoyer.");
            }
            if (!validUntil) {
              throw new Error("Renseignez une date limite de validité avant d’envoyer le devis.");
            }
            const validUntilTime = new Date(validUntil).getTime();
            if (!Number.isFinite(validUntilTime) || validUntilTime < Date.now()) {
              throw new Error("La date de validité du devis doit être future.");
            }
          }
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
