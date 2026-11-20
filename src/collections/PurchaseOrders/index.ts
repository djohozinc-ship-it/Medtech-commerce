import { type Access, type CollectionConfig } from "payload";
import { sendEmail } from "@/utilities/nodemailer";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

type PurchaseLine = {
  productName?: string | null;
  supplierSKU?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  notes?: string | null;
};

const numeric = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const PurchaseOrders: CollectionConfig = {
  slug: "purchase-orders",
  labels: { singular: "Bon de commande fournisseur", plural: "Bons de commande fournisseurs" },
  admin: {
    useAsTitle: "purchaseOrderReference",
    defaultColumns: ["purchaseOrderReference", "supplier", "status", "currency", "totalAmount", "orderDate"],
    group: "Approvisionnement",
    description: "Commandes d'achat adressées aux fournisseurs. Un bon approuvé et envoyé constitue la référence de l'achat.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "purchaseOrderReference", type: "text", required: true, unique: true, index: true, label: "Référence du bon de commande" },
    { name: "supplier", type: "relationship", relationTo: "suppliers", required: true, label: "Fournisseur" },
    { name: "sourcingRequest", type: "relationship", relationTo: "sourcing-requests", label: "Demande client à l'origine de l'achat" },
    { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", label: "Offre fournisseur retenue" },
    { name: "orderDate", type: "date", required: true, defaultValue: () => new Date().toISOString(), label: "Date du bon de commande" },
    { name: "expectedReadyDate", type: "date", label: "Date prévue de disponibilité chez le fournisseur" },
    { name: "expectedDeliveryDate", type: "date", label: "Date prévisionnelle de réception" },
    { name: "supplierReference", type: "text", label: "Référence / numéro de commande du fournisseur" },
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
      label: "Devise du bon de commande",
    },
    {
      name: "items",
      type: "array",
      minRows: 1,
      required: true,
      label: "Lignes d'achat",
      labels: { singular: "Article", plural: "Articles" },
      fields: [
        { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", label: "Offre fournisseur" },
        { name: "product", type: "relationship", relationTo: "products", label: "Produit du catalogue (si existant)" },
        { name: "productName", type: "text", required: true, label: "Désignation exacte" },
        { name: "brand", type: "text", label: "Marque" },
        { name: "model", type: "text", label: "Modèle / référence" },
        { name: "supplierSKU", type: "text", label: "SKU fournisseur" },
        { name: "quantity", type: "number", required: true, min: 1, label: "Quantité commandée" },
        { name: "receivedQuantity", type: "number", min: 0, defaultValue: 0, admin: { readOnly: true }, label: "Quantité réceptionnée cumulée" },
        { name: "unitPrice", type: "number", required: true, min: 0, label: "Prix unitaire dans la devise du bon" },
        { name: "lineTotal", type: "number", admin: { readOnly: true }, label: "Total de la ligne" },
        { name: "technicalRequirements", type: "textarea", label: "Spécifications et exigences qualité" },
        { name: "notes", type: "textarea", label: "Instructions particulières au fournisseur" },
      ],
    },
    { name: "goodsSubtotal", type: "number", admin: { readOnly: true }, label: "Sous-total marchandises" },
    { name: "chinaDomesticShipping", type: "number", min: 0, defaultValue: 0, label: "Transport intérieur Chine" },
    { name: "otherSupplierCharges", type: "number", min: 0, defaultValue: 0, label: "Autres frais facturés par le fournisseur" },
    { name: "totalAmount", type: "number", admin: { readOnly: true }, label: "Total du bon de commande" },
    { name: "paymentStatus", type: "select", defaultValue: "unpaid", options: [
      { label: "Non payé", value: "unpaid" },
      { label: "Partiellement payé", value: "partially_paid" },
      { label: "Payé intégralement", value: "paid" },
    ], label: "Situation des paiements" },
    { name: "amountPaid", type: "number", admin: { readOnly: true }, label: "Montant fournisseur déjà payé" },
    { name: "balanceDue", type: "number", admin: { readOnly: true }, label: "Solde fournisseur restant" },
    { name: "paymentTerms", type: "textarea", label: "Conditions de paiement convenues" },
    { name: "depositPercentage", type: "number", min: 0, max: 100, label: "Acompte demandé par le fournisseur (%)" },
    { name: "supplierInvoiceNumber", type: "text", label: "Numéro de facture / pro forma fournisseur" },
    { name: "supplierInvoice", type: "relationship", relationTo: "media", label: "Facture pro forma / facture fournisseur" },
    { name: "approvalName", type: "text", admin: { readOnly: true }, label: "Validé par" },
    { name: "approvedAt", type: "date", admin: { readOnly: true }, label: "Date de validation interne" },
    { name: "sentAt", type: "date", label: "Date d'envoi au fournisseur" },
    { name: "supplierEmailSentAt", type: "date", admin: { readOnly: true }, label: "E-mail fournisseur envoyé le" },
    { name: "supplierEmailError", type: "textarea", admin: { readOnly: true }, label: "Erreur email fournisseur" },
    { name: "resendSupplierEmail", type: "checkbox", defaultValue: false, label: "Renvoyer le bon au fournisseur" },
    { name: "acknowledgedAt", type: "date", label: "Confirmation du fournisseur reçue le" },
    { name: "receivedAt", type: "date", label: "Date de réception complète" },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "draft",
      options: [
        { label: "Brouillon", value: "draft" },
        { label: "En attente de validation", value: "awaiting_approval" },
        { label: "Validé en interne", value: "approved" },
        { label: "Envoyé au fournisseur", value: "sent_to_supplier" },
        { label: "Confirmé par le fournisseur", value: "acknowledged" },
        { label: "Réception partielle", value: "partially_received" },
        { label: "Réception complète", value: "received" },
        { label: "Annulé", value: "cancelled" },
      ],
      label: "État du bon de commande",
    },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
    { name: "attachments", type: "relationship", relationTo: "media", hasMany: true, label: "Pièces jointes (pro forma, échanges, spécifications)" },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        const payload = req.payload;
        const relationId = (value: unknown) =>
          typeof value === "object" && value !== null ? String((value as { id?: string | number }).id ?? "") : String(value ?? "");
        const currentOfferId = relationId(doc.supplierOffer);
        const previousOfferId = relationId(previousDoc?.supplierOffer);
        if (previousOfferId && previousOfferId !== currentOfferId) {
          await payload.update({ collection: "supplier-offers", id: previousOfferId, overrideAccess: true, data: { purchaseOrder: null } });
        }
        if (currentOfferId) {
          await payload.update({ collection: "supplier-offers", id: currentOfferId, overrideAccess: true, data: { purchaseOrder: doc.id } });
        }
        if (doc.status !== "sent_to_supplier" || (previousDoc?.status === "sent_to_supplier" && !doc.resendSupplierEmail)) return doc;
        const supplierId = typeof doc.supplier === "object" ? doc.supplier?.id : doc.supplier;
        if (!supplierId) return doc;
        const supplier = await payload.findByID({
          collection: "suppliers",
          id: supplierId,
          depth: 0,
          overrideAccess: true,
        });
        if (!supplier?.email) {
          const message = "Aucune adresse e-mail n'est enregistrée pour ce fournisseur.";
          req.payload.logger.warn({ msg: message, purchaseOrder: doc.purchaseOrderReference });
          await payload.update({
            collection: "purchase-orders",
            id: doc.id,
            overrideAccess: true,
            data: { supplierEmailError: message, resendSupplierEmail: false },
          });
          return doc;
        }
        const escapeHtml = (value: unknown) =>
          String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
          })[character] ?? character);
        const currency = String(doc.currency ?? "CNY");
        const rows = (Array.isArray(doc.items) ? doc.items : []).map((item: Record<string, unknown>) =>
          `<tr><td style="padding:8px;border:1px solid #ddd">${escapeHtml(item.productName)}</td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(item.model)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(item.quantity ?? 0)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(item.unitPrice ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(item.lineTotal ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}</td></tr>`,
        ).join("");
        const html = `<div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#172033">
          <h2>Bon de commande ${escapeHtml(doc.purchaseOrderReference)}</h2>
          <p>Bonjour ${escapeHtml(supplier.contactName || supplier.companyName)},</p>
          <p>Veuillez trouver ci-dessous notre commande fournisseur. Merci de confirmer par retour d'e-mail les quantités, les références, le délai de préparation et les coordonnées de paiement.</p>
          <p><strong>Référence :</strong> ${escapeHtml(doc.purchaseOrderReference)}<br/>
          <strong>Date :</strong> ${escapeHtml(doc.orderDate)}<br/>
          <strong>Devise :</strong> ${escapeHtml(currency)}</p>
          <table style="border-collapse:collapse;width:100%"><thead><tr><th style="padding:8px;border:1px solid #ddd">Désignation</th><th style="padding:8px;border:1px solid #ddd">Modèle</th><th style="padding:8px;border:1px solid #ddd">Qté</th><th style="padding:8px;border:1px solid #ddd">Prix unitaire</th><th style="padding:8px;border:1px solid #ddd">Total</th></tr></thead><tbody>${rows}</tbody></table>
          <p>Marchandises : <strong>${Number(doc.goodsSubtotal ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}</strong><br/>
          Transport Chine : ${Number(doc.chinaDomesticShipping ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}<br/>
          Autres frais : ${Number(doc.otherSupplierCharges ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}<br/>
          <strong>Total commande : ${Number(doc.totalAmount ?? 0).toLocaleString("fr-FR")} ${escapeHtml(currency)}</strong></p>
          <p>Conditions de paiement : ${escapeHtml(doc.paymentTerms || "À confirmer")}<br/>Date de disponibilité souhaitée : ${escapeHtml(doc.expectedReadyDate || "À confirmer")}</p>
          <p>Merci de confirmer la réception de ce bon de commande et de ne procéder à aucune substitution de modèle ou de spécification sans accord écrit.</p>
          <p>Medtech Commerce</p>
        </div>`;
        try {
          await sendEmail({
            to: String(supplier.email),
            subject: `Bon de commande ${doc.purchaseOrderReference} — Medtech Commerce`,
            html,
          });
          await payload.update({
            collection: "purchase-orders",
            id: doc.id,
            overrideAccess: true,
            data: { supplierEmailSentAt: new Date().toISOString(), supplierEmailError: null, resendSupplierEmail: false },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erreur inconnue d'envoi";
          req.payload.logger.error({ err: error, msg: "Unable to email supplier purchase order", purchaseOrder: doc.purchaseOrderReference });
          await payload.update({
            collection: "purchase-orders",
            id: doc.id,
            overrideAccess: true,
            data: { supplierEmailError: message, resendSupplierEmail: false },
          });
        }
        return doc;
      },
    ],
    beforeValidate: [
      async ({ data, originalDoc, operation, req }) => {
        if (!data) return data;
        if (operation === "create" && !data.purchaseOrderReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.purchaseOrderReference = `PO-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }

        const sourcingRequestValue = data.sourcingRequest ?? originalDoc?.sourcingRequest;
        const sourcingRequestId = typeof sourcingRequestValue === "object" && sourcingRequestValue !== null
          ? (sourcingRequestValue as { id?: string | number }).id
          : sourcingRequestValue;
        if (sourcingRequestId) {
          const payload = req.payload;
          const sourcingRequest = await payload.findByID({
            collection: "sourcing-requests",
            id: sourcingRequestId,
            depth: 0,
            overrideAccess: true,
          });
          if (sourcingRequest.status !== "converted_to_order") {
            throw new Error("Une demande client ne peut être approvisionnée qu'après acceptation du devis et création de sa commande client.");
          }
        }

        const offerValue = data.supplierOffer ?? originalDoc?.supplierOffer;
        const offerId = typeof offerValue === "object" && offerValue !== null ? (offerValue as { id?: string | number }).id : offerValue;
        const shouldValidateOffer = Boolean(offerId) && (operation === "create" || data.supplierOffer !== undefined || (data.status === "approved" && originalDoc?.status !== "approved"));
        if (shouldValidateOffer) {
          const payload = req.payload;
          const offer = await payload.findByID({
            collection: "supplier-offers",
            id: offerId,
            depth: 0,
            overrideAccess: true,
          });
          const offerRequestId = typeof offer.sourcingRequest === "object" && offer.sourcingRequest !== null
            ? offer.sourcingRequest.id
            : offer.sourcingRequest;
          if (sourcingRequestId && String(offerRequestId ?? "") !== String(sourcingRequestId)) {
            throw new Error("L'offre fournisseur doit être rattachée à la même demande client que le bon de commande.");
          }
          if (!offer || offer.quoteStatus !== "approved") {
            throw new Error("Le bon de commande ne peut utiliser qu'une offre fournisseur validée.");
          }
          if (offer.validUntil) {
            const offerExpiry = new Date(offer.validUntil).getTime();
            if (!Number.isFinite(offerExpiry) || offerExpiry < Date.now()) throw new Error("L'offre fournisseur sélectionnée a expiré ou sa date de validité est incorrecte.");
          }
          const supplierValue = data.supplier ?? originalDoc?.supplier;
          const supplierId = typeof supplierValue === "object" && supplierValue !== null ? (supplierValue as { id?: string | number }).id : supplierValue;
          const offerSupplierId = typeof offer.supplier === "object" && offer.supplier !== null ? offer.supplier.id : offer.supplier;
          const existingPurchaseOrder = typeof offer.purchaseOrder === "object" && offer.purchaseOrder !== null ? offer.purchaseOrder.id : offer.purchaseOrder;
          if (existingPurchaseOrder && String(existingPurchaseOrder) !== String(originalDoc?.id ?? "")) {
            throw new Error("Cette offre fournisseur est déjà rattachée à un autre bon de commande.");
          }
          if (String(supplierId) !== String(offerSupplierId)) {
            throw new Error("Le fournisseur du bon de commande doit correspondre au fournisseur de l'offre retenue.");
          }
          if ((data.currency ?? originalDoc?.currency) !== offer.currency) {
            throw new Error("La devise du bon de commande doit correspondre à celle de l'offre fournisseur.");
          }
        }

        const existingItems = Array.isArray(originalDoc?.items) ? originalDoc.items : [];
        const items = Array.isArray(data.items) ? data.items : existingItems;
        for (const line of items as Array<Record<string, unknown>>) {
          const lineOfferValue = line.supplierOffer;
          const lineOfferId = typeof lineOfferValue === "object" && lineOfferValue ? (lineOfferValue as { id?: string | number }).id : lineOfferValue;
          if (!lineOfferId) continue;
          const lineOffer = await (req.payload).findByID({ collection: "supplier-offers", id: lineOfferId, depth: 0, overrideAccess: true });
          if (!lineOffer || lineOffer.quoteStatus !== "approved") throw new Error("Chaque offre associée à une ligne d'achat doit être validée.");
          const supplierValue = data.supplier ?? originalDoc?.supplier;
          const supplierId = typeof supplierValue === "object" && supplierValue ? (supplierValue as { id?: string | number }).id : supplierValue;
          const lineSupplierId = typeof lineOffer.supplier === "object" && lineOffer.supplier ? lineOffer.supplier.id : lineOffer.supplier;
          if (String(supplierId) !== String(lineSupplierId)) throw new Error("Une ligne d'achat référence une offre d'un autre fournisseur.");
          if (Number(line.quantity) < Number(lineOffer.minimumOrderQuantity ?? 1)) throw new Error("La quantité commandée est inférieure au minimum exigé par le fournisseur.");
        }
        let subtotal = 0;
        for (const item of items as PurchaseLine[]) {
          const quantity = numeric(item.quantity);
          const unitPrice = numeric(item.unitPrice);
          if (quantity === undefined || !Number.isInteger(quantity) || quantity < 1 || unitPrice === undefined || unitPrice < 0) {
            throw new Error("Chaque ligne d'achat doit avoir une quantité positive et un prix unitaire valide.");
          }
          item.lineTotal = Math.round(quantity * unitPrice * 100) / 100;
          subtotal += item.lineTotal;
        }
        const domestic = numeric(data.chinaDomesticShipping) ?? numeric(originalDoc?.chinaDomesticShipping) ?? 0;
        const other = numeric(data.otherSupplierCharges) ?? numeric(originalDoc?.otherSupplierCharges) ?? 0;
        if (domestic < 0 || other < 0) throw new Error("Les frais fournisseur ne peuvent pas être négatifs.");
        data.goodsSubtotal = Math.round(subtotal * 100) / 100;
        data.totalAmount = Math.round((subtotal + domestic + other) * 100) / 100;
        const paid = numeric(data.amountPaid) ?? numeric(originalDoc?.amountPaid) ?? 0;
        data.balanceDue = Math.max(0, Math.round((Number(data.totalAmount) - paid) * 100) / 100);

        const status = data.status ?? originalDoc?.status;
        const previousStatus = originalDoc?.status ?? "draft";
        if (status === "approved" && previousStatus !== "approved") {
          const supplierValue = data.supplier ?? originalDoc?.supplier;
          const supplierId = typeof supplierValue === "object" && supplierValue ? supplierValue.id : supplierValue;
          if (!supplierId) throw new Error("Un fournisseur doit être sélectionné avant validation du bon.");
          const payload = req.payload;
          const supplier = await payload.findByID({ collection: "suppliers", id: supplierId, depth: 0, overrideAccess: true });
          if (!supplier || supplier.verificationStatus !== "verified") {
            throw new Error("Le fournisseur doit être vérifié avant la validation du bon de commande.");
          }
          if (!offerId) throw new Error("Sélectionnez une offre fournisseur validée avant d'approuver le bon de commande.");
        }
        if (status !== previousStatus) {
          const allowed: Record<string, string[]> = {
            draft: ["awaiting_approval", "cancelled"],
            awaiting_approval: ["draft", "approved", "cancelled"],
            approved: ["draft", "sent_to_supplier", "cancelled"],
            sent_to_supplier: ["acknowledged", "cancelled"],
            acknowledged: ["partially_received", "received", "cancelled"],
            partially_received: ["received", "acknowledged", "cancelled"],
            received: ["partially_received", "acknowledged"],
            cancelled: [],
          };
          if (!(allowed[previousStatus] ?? []).includes(String(status))) {
            throw new Error(`Transition impossible du bon de commande : ${previousStatus} → ${String(status)}.`);
          }
        }
        if (status === "approved" && previousStatus !== "approved") {
          data.approvalName = req.user?.email ?? "Administrateur";
          data.approvedAt = new Date().toISOString();
        }
        if (status === "sent_to_supplier") {
          if (!(data.approvedAt ?? originalDoc?.approvedAt)) {
            throw new Error("Le bon doit être validé en interne avant son envoi au fournisseur.");
          }
          if (!(data.sentAt ?? originalDoc?.sentAt)) {
            throw new Error("Renseignez la date d'envoi avant de passer le bon à « Envoyé au fournisseur ».");
          }
        }
        if (status === "acknowledged") {
          if (!(data.sentAt ?? originalDoc?.sentAt)) throw new Error("Le bon doit d'abord être envoyé au fournisseur.");
          if (!(data.acknowledgedAt ?? originalDoc?.acknowledgedAt)) throw new Error("Renseignez la date de confirmation du fournisseur.");
        }
        if (status === "partially_received" || status === "received") {
          if (!(data.acknowledgedAt ?? originalDoc?.acknowledgedAt)) throw new Error("La confirmation du fournisseur est nécessaire avant la réception.");
          if (status === "received" && !(data.receivedAt ?? originalDoc?.receivedAt)) {
            throw new Error("Renseignez la date de réception complète.");
          }
        }
        return data;
      },
    ],
  },
  timestamps: true,
};
