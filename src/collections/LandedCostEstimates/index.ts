import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) =>
  req.user?.collection === "administrators";

const numeric = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export const LandedCostEstimates: CollectionConfig = {
  slug: "landed-cost-estimates",
  labels: { singular: "Simulation de coût rendu", plural: "Simulations de coût rendu" },
  admin: {
    useAsTitle: "estimateReference",
    defaultColumns: ["estimateReference", "productName", "quantity", "unitLandedCostXOF", "estimatedSellingPriceXOF", "status"],
    group: "Finance et coûts",
    description: "Calcul interne du coût d'approvisionnement rendu au Bénin. Les taux et frais doivent provenir de justificatifs réels.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "estimateReference", type: "text", required: true, unique: true, label: "Référence de simulation" },
    { name: "supplierOffer", type: "relationship", relationTo: "supplier-offers", required: true, label: "Offre fournisseur" },
    { name: "purchaseOrder", type: "relationship", relationTo: "purchase-orders", label: "Bon de commande réellement exécuté" },
    { name: "inboundShipment", type: "relationship", relationTo: "inbound-shipments", label: "Expédition internationale associée" },
    { name: "costStage", type: "select", defaultValue: "estimate", options: [{ label: "Estimation avant achat", value: "estimate" }, { label: "Coûts réels après réception", value: "actual" }], label: "Nature du calcul" },
    { name: "exchangeRateSource", type: "text", label: "Source du taux de change (banque, transfert, justificatif)" },
    { name: "exchangeRateDate", type: "date", label: "Date du taux de change appliqué" },
    { name: "costEvidence", type: "relationship", relationTo: "media", hasMany: true, label: "Factures, quittances et justificatifs des coûts" },
    { name: "productName", type: "text", required: true, label: "Produit" },
    { name: "quantity", type: "number", required: true, min: 1, label: "Quantité à acheter" },
    { name: "supplierCurrency", type: "select", required: true, options: [{ label: "CNY", value: "CNY" }, { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" }], label: "Devise fournisseur" },
    { name: "unitPurchasePrice", type: "number", required: true, min: 0, label: "Prix fournisseur par unité" },
    { name: "chinaDomesticShipping", type: "number", min: 0, defaultValue: 0, label: "Transport intérieur Chine (devise fournisseur)" },
    { name: "supplierCurrencyToXOF", type: "number", required: true, min: 0.000001, label: "Taux appliqué : 1 unité de devise = XOF" },
    { name: "internationalFreightXOF", type: "number", required: true, min: 0, label: "Fret international total (XOF)" },
    { name: "insuranceXOF", type: "number", min: 0, defaultValue: 0, label: "Assurance (XOF)" },
    { name: "customsAndTaxesXOF", type: "number", required: true, min: 0, label: "Douane et taxes estimées (XOF)" },
    { name: "handlingXOF", type: "number", min: 0, defaultValue: 0, label: "Manutention et frais divers (XOF)" },
    { name: "localDeliveryXOF", type: "number", min: 0, defaultValue: 0, label: "Livraison locale au Bénin (XOF)" },
    { name: "otherCostsXOF", type: "number", min: 0, defaultValue: 0, label: "Autres frais (XOF)" },
    { name: "totalPurchaseCostXOF", type: "number", admin: { readOnly: true }, label: "Achat + transport Chine (XOF)" },
    { name: "totalLandedCostXOF", type: "number", admin: { readOnly: true }, label: "Coût total rendu (XOF)" },
    { name: "unitLandedCostXOF", type: "number", admin: { readOnly: true }, label: "Coût rendu unitaire (XOF)" },
    { name: "targetGrossMarginPercent", type: "number", min: 0, max: 90, label: "Marge brute cible (%)" },
    { name: "estimatedSellingPriceXOF", type: "number", admin: { readOnly: true }, label: "Prix de vente unitaire estimé (XOF)" },
    { name: "calculationNotes", type: "textarea", label: "Source des taux, devis de fret et hypothèses" },
    { name: "calculatedAt", type: "date", admin: { readOnly: true }, label: "Dernier calcul" },
    {
      name: "status",
      type: "select",
      defaultValue: "draft",
      required: true,
      options: [
        { label: "Brouillon", value: "draft" },
        { label: "À valider", value: "review" },
        { label: "Validée", value: "approved" },
        { label: "Archivée", value: "archived" },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data;
        const costStage = data.costStage ?? originalDoc?.costStage ?? "estimate";
        if (costStage === "actual") {
          const purchaseOrder = data.purchaseOrder ?? originalDoc?.purchaseOrder;
          const evidence = data.costEvidence ?? originalDoc?.costEvidence;
          const rateSource = data.exchangeRateSource ?? originalDoc?.exchangeRateSource;
          const rateDate = data.exchangeRateDate ?? originalDoc?.exchangeRateDate;
          if (!purchaseOrder || !Array.isArray(evidence) || evidence.length === 0 || !rateSource || !rateDate) {
            throw new Error("Un coût réel doit être rattaché à un bon d'achat et justifié par des pièces, une source et une date de taux de change.");
          }
        }
        if (!data) return data;
        const quantity = numeric(data.quantity);
        const unitPrice = numeric(data.unitPurchasePrice);
        const domestic = numeric(data.chinaDomesticShipping) ?? 0;
        const rate = numeric(data.supplierCurrencyToXOF);
        const freight = numeric(data.internationalFreightXOF);
        const insurance = numeric(data.insuranceXOF) ?? 0;
        const customs = numeric(data.customsAndTaxesXOF);
        const handling = numeric(data.handlingXOF) ?? 0;
        const delivery = numeric(data.localDeliveryXOF) ?? 0;
        const other = numeric(data.otherCostsXOF) ?? 0;

        // Pas de calcul partiel : un taux de change et les frais principaux sont obligatoires.
        if (
          quantity === undefined || quantity <= 0 ||
          unitPrice === undefined || rate === undefined || rate <= 0 ||
          freight === undefined || customs === undefined
        ) {
          delete data.totalPurchaseCostXOF;
          delete data.totalLandedCostXOF;
          delete data.unitLandedCostXOF;
          delete data.estimatedSellingPriceXOF;
          return data;
        }

        const purchaseXOF = (unitPrice * quantity + domestic) * rate;
        const landedXOF = purchaseXOF + freight + insurance + customs + handling + delivery + other;
        const unitLandedXOF = landedXOF / quantity;
        const margin = numeric(data.targetGrossMarginPercent);

        data.totalPurchaseCostXOF = Math.round(purchaseXOF);
        data.totalLandedCostXOF = Math.round(landedXOF);
        data.unitLandedCostXOF = Math.round(unitLandedXOF);
        if (margin !== undefined && margin >= 0 && margin < 100) {
          data.estimatedSellingPriceXOF = Math.ceil(unitLandedXOF / (1 - margin / 100));
        } else {
          delete data.estimatedSellingPriceXOF;
        }
        data.calculatedAt = new Date().toISOString();
        return data;
      },
    ],
  },
  timestamps: true,
};
