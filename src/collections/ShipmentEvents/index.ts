import type { CollectionConfig } from "payload";



/**
 * Historique logistique d'une commande.
 * Chaque document représente un événement daté, afin de conserver une
 * traçabilité complète du trajet fournisseur -> Chine -> Bénin -> client.
 */
export const ShipmentEvents: CollectionConfig = {
  slug: "shipment-events",
  labels: {
    singular: "Événement logistique",
    plural: "Suivi logistique",
  },
  access: {
    create: ({ req }) => req.user?.collection === "administrators",
    delete: ({ req }) => req.user?.collection === "administrators",
    read: ({ req }) => req.user?.collection === "administrators",
    update: ({ req }) => req.user?.collection === "administrators",
  },
  admin: {
    useAsTitle: "reference",
    defaultColumns: ["reference", "order", "status", "eventDate"],
    group: "Logistique",
    description:
      "Un enregistrement par étape réelle du transport. Ne validez une étape qu'après confirmation.",
  },
  fields: [
    {
      name: "reference",
      type: "text",
      label: "Référence de suivi",
      required: true,
      index: true,
    },
    {
      name: "inboundShipment",
      type: "relationship",
      relationTo: "inbound-shipments",
      label: "Expédition internationale associée",
      index: true,
    },
    {
      name: "order",
      type: "relationship",
      relationTo: "orders",
      label: "Commande associée",
      required: true,
      index: true,
    },
    {
      name: "status",
      type: "select",
      label: "Étape logistique",
      required: true,
      options: [
        { label: "Demande reçue", value: "request_received" },
        { label: "Paiement confirmé", value: "payment_confirmed" },
        { label: "Commande passée auprès du fournisseur", value: "supplier_ordered" },
        { label: "Arrivée à l'entrepôt en Chine", value: "arrived_china_warehouse" },
        { label: "Colis regroupés", value: "consolidated" },
        { label: "Expédié de Chine", value: "departed_china" },
        { label: "Arrivé au Bénin", value: "arrived_benin" },
        { label: "Formalités douanières en cours", value: "customs_clearance" },
        { label: "Prêt pour la livraison locale", value: "ready_for_delivery" },
        { label: "En cours de livraison", value: "out_for_delivery" },
        { label: "Livré au client", value: "delivered" },
        { label: "Incident / retard", value: "exception" },
      ],
    },
    {
      name: "eventDate",
      type: "date",
      label: "Date et heure de l'événement",
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        date: {
          pickerAppearance: "dayAndTime",
          displayFormat: "dd/MM/yyyy HH:mm",
        },
      },
    },
    {
      name: "location",
      type: "text",
      label: "Lieu",
    },
    {
      name: "carrier",
      type: "text",
      label: "Transporteur / transitaire",
    },
    {
      name: "trackingCode",
      type: "text",
      label: "Numéro de suivi externe",
    },
    {
      name: "trackingUrl",
      type: "text",
      label: "Lien de suivi externe",
    },
    {
      name: "note",
      type: "textarea",
      label: "Note interne ou précision",
    },
    {
      name: "customerMessage",
      type: "textarea",
      label: "Message destiné au client",
    },
    {
      name: "visibleToCustomer",
      type: "checkbox",
      label: "Afficher cet événement au client",
      defaultValue: true,
      required: true,
    },
  ],
  timestamps: true,
};
