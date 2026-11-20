import { type PayloadRequest } from "payload";

type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};

const relationId = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  if (typeof record.id === "string" || typeof record.id === "number") return String(record.id);
  return undefined;
};

/**
 * Returns only customer-visible tracking events for an order owned by the
 * authenticated customer. Internal notes are deliberately never selected.
 */
export const getCustomerShipmentTracking = async (req: PayloadRequest) => {
  if (req.method !== "GET") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  if (req.user?.collection !== "customers") {
    return Response.json({ message: "Connexion client requise" }, { status: 401 });
  }

  const url = new URL(req.url ?? "https://localhost");
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return Response.json({ message: "Référence de commande manquante" }, { status: 400 });
  }

  try {
    const order = await req.payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });

    if (relationId(order.customer) !== String(req.user.id)) {
      return Response.json({ message: "Commande introuvable" }, { status: 404 });
    }

    const result = await req.payload.find({
      collection: "shipment-events",
      depth: 0,
      limit: 100,
      pagination: false,
      overrideAccess: true,
      sort: "eventDate",
      where: {
        and: [
          { order: { equals: orderId } },
          { visibleToCustomer: { equals: true } },
        ],
      },
      select: {
        status: true,
        eventDate: true,
        location: true,
        carrier: true,
        trackingCode: true,
        trackingUrl: true,
      },
    });

    return Response.json({
      orderId: String(order.id),
      events: result.docs,
    });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to load customer shipment tracking" });
    return Response.json({ message: "Impossible de charger le suivi logistique" }, { status: 500 });
  }
};
