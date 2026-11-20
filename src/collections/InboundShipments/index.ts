import { type Access, type CollectionConfig } from "payload";

const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";

export const InboundShipments: CollectionConfig = {
  slug: "inbound-shipments",
  labels: { singular: "Expédition internationale", plural: "Expéditions internationales" },
  admin: {
    useAsTitle: "shipmentReference",
    defaultColumns: ["shipmentReference", "originWarehouse", "destinationWarehouse", "shippingMode", "status", "estimatedArrival"],
    group: "Logistique",
    description: "Suivi des marchandises entre les sites d'origine et le Bénin.",
  },
  access: {
    create: administratorsOnly,
    read: administratorsOnly,
    update: administratorsOnly,
    delete: administratorsOnly,
  },
  fields: [
    { name: "shipmentReference", type: "text", required: true, unique: true, label: "Référence d'expédition" },
    { name: "originWarehouse", type: "relationship", relationTo: "warehouses", required: true, label: "Entrepôt de départ" },
    { name: "destinationWarehouse", type: "relationship", relationTo: "warehouses", required: true, label: "Entrepôt d'arrivée" },
    { name: "orders", type: "relationship", relationTo: "orders", hasMany: true, label: "Commandes concernées" },
    { name: "supplierOffers", type: "relationship", relationTo: "supplier-offers", hasMany: true, label: "Offres / achats concernés" },
    { name: "purchaseOrders", type: "relationship", relationTo: "purchase-orders", hasMany: true, label: "Bons de commande transportés" },
    { name: "shippingMode", type: "select", required: true, options: [
      { label: "Aérien", value: "air" },
      { label: "Maritime", value: "sea" },
      { label: "Routier", value: "road" },
      { label: "Express / courrier", value: "express" },
      { label: "À confirmer", value: "pending" },
    ], label: "Mode de transport" },
    { name: "freightForwarder", type: "text", label: "Transitaire / transporteur" },
    { name: "forwarderContact", type: "text", label: "Contact du transitaire" },
    { name: "trackingNumber", type: "text", label: "Numéro de suivi" },
    { name: "trackingUrl", type: "text", label: "Lien de suivi officiel" },
    { name: "departureDate", type: "date", label: "Date réelle de départ" },
    { name: "estimatedArrival", type: "date", label: "Arrivée estimée" },
    { name: "actualArrival", type: "date", label: "Arrivée réelle" },
    { name: "grossWeightKg", type: "number", min: 0, label: "Poids brut total (kg)" },
    { name: "volumeM3", type: "number", min: 0, label: "Volume total (m³)" },
    { name: "packageCount", type: "number", min: 0, label: "Nombre de colis" },
    { name: "freightCost", type: "number", min: 0, label: "Coût du fret" },
    { name: "insuranceCost", type: "number", min: 0, label: "Coût de l’assurance" },
    { name: "customsAndTaxesCost", type: "number", min: 0, label: "Douane et taxes réelles" },
    { name: "handlingCost", type: "number", min: 0, label: "Manutention et stockage" },
    { name: "freightInvoice", type: "relationship", relationTo: "media", label: "Facture du transporteur" },
    { name: "packingList", type: "relationship", relationTo: "media", label: "Packing list / liste de colisage" },
    { name: "commercialInvoice", type: "relationship", relationTo: "media", label: "Facture commerciale" },
    { name: "insuranceCertificate", type: "relationship", relationTo: "media", label: "Attestation d’assurance" },
    { name: "customsDeclaration", type: "relationship", relationTo: "media", label: "Déclaration douanière" },
    { name: "freightCurrency", type: "select", options: [
      { label: "XOF", value: "XOF" }, { label: "CNY", value: "CNY" },
      { label: "USD", value: "USD" }, { label: "EUR", value: "EUR" },
    ], label: "Devise du fret" },
    { name: "customsReference", type: "text", label: "Référence dossier douanier" },
    { name: "customsDocuments", type: "relationship", relationTo: "media", hasMany: true, label: "Documents de transport et douane" },
    { name: "status", type: "select", required: true, defaultValue: "preparing", options: [
      { label: "Préparation chez le fournisseur", value: "preparing" },
      { label: "En route vers l'entrepôt Chine", value: "to_china_warehouse" },
      { label: "Reçu à l'entrepôt Chine", value: "received_china" },
      { label: "Contrôle et regroupement", value: "consolidation" },
      { label: "Prêt à expédier", value: "ready_to_ship" },
      { label: "Expédié", value: "shipped" },
      { label: "En transit international", value: "in_transit" },
      { label: "Arrivé au Bénin", value: "arrived_benin" },
      { label: "Dédouanement", value: "customs" },
      { label: "Reçu à l'entrepôt Bénin", value: "received_benin" },
      { label: "Clôturé", value: "closed" },
      { label: "Incident", value: "exception" },
    ] },
    { name: "exceptionNotes", type: "textarea", label: "Incident / retard / dommage" },
    { name: "internalNotes", type: "textarea", label: "Notes internes" },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, operation, req }) => {
        if (!data) return data;
        if (operation === "create" && !data.shipmentReference) {
          const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
          data.shipmentReference = `SHP-${stamp}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        }
        for (const field of ["grossWeightKg", "volumeM3", "packageCount", "freightCost", "insuranceCost", "customsAndTaxesCost", "handlingCost"] as const) {
          const value = data[field] ?? originalDoc?.[field];
          if (value !== undefined && value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
            throw new Error("Les poids, volumes, quantités et coûts d'expédition doivent être positifs ou nuls.");
          }
        }
        const status = data.status ?? originalDoc?.status;
        if (["shipped", "in_transit"].includes(String(status)) && !(data.departureDate ?? originalDoc?.departureDate)) {
          throw new Error("Renseignez la date réelle de départ avant de marquer l'expédition comme expédiée.");
        }
        if (["arrived_benin", "customs", "received_benin", "closed"].includes(String(status)) && !(data.actualArrival ?? originalDoc?.actualArrival)) {
          throw new Error("Renseignez la date réelle d'arrivée au Bénin.");
        }
        if (status === "closed" && !(data.customsReference ?? originalDoc?.customsReference)) {
          throw new Error("Le dossier douanier doit être renseigné avant la clôture.");
        }
        if (status === "exception" && !(data.exceptionNotes ?? originalDoc?.exceptionNotes)) {
          throw new Error("Décrivez l'incident avant de placer l'expédition en anomalie.");
        }
        const originValue = data.originWarehouse ?? originalDoc?.originWarehouse;
        const destinationValue = data.destinationWarehouse ?? originalDoc?.destinationWarehouse;
        const originId = typeof originValue === "object" && originValue ? originValue.id : originValue;
        const destinationId = typeof destinationValue === "object" && destinationValue ? destinationValue.id : destinationValue;
        if (originId && destinationId) {
          const payload = req.payload as any;
          const [origin, destination] = await Promise.all([
            payload.findByID({ collection: "warehouses", id: originId, depth: 0, overrideAccess: true }),
            payload.findByID({ collection: "warehouses", id: destinationId, depth: 0, overrideAccess: true }),
          ]);
          if (String(originId) === String(destinationId)) throw new Error("L'entrepôt de départ et celui d'arrivée doivent être différents.");
          if (origin?.warehouseType === "benin_destination" && destination?.warehouseType === "china_origin") {
            throw new Error("Le sens du trajet est inversé : l'expédition internationale doit partir de Chine vers le Bénin.");
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        if (doc.status === previousDoc?.status) return doc;
        const eventStatus: Record<string, string> = {
          received_china: "arrived_china_warehouse",
          consolidation: "consolidated",
          shipped: "departed_china",
          arrived_benin: "arrived_benin",
          customs: "customs_clearance",
        };
        const mapped = eventStatus[String(doc.status)];
        if (!mapped) return doc;
        const payload = req.payload as any;
        const orders = Array.isArray(doc.orders) ? doc.orders : [];
        for (const orderValue of orders) {
          const orderId = typeof orderValue === "object" && orderValue ? orderValue.id : orderValue;
          if (!orderId) continue;
          await payload.create({
            collection: "shipment-events",
            overrideAccess: true,
            data: {
              reference: doc.shipmentReference,
              inboundShipment: doc.id,
              order: orderId,
              status: mapped,
              eventDate: new Date().toISOString(),
              location: doc.status === "arrived_benin" || doc.status === "customs" ? "Bénin" : "Chine",
              carrier: doc.freightForwarder,
              trackingCode: doc.trackingNumber,
              trackingUrl: doc.trackingUrl,
              note: doc.exceptionNotes || "",
              visibleToCustomer: true,
            },
          });
        }
        return doc;
      },
    ],
  },
  timestamps: true,
};
