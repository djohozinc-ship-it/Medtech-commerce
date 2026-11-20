import type { PayloadRequest } from "payload";

type JsonRecord = Record<string, unknown>;

const readRequestJson = async (req: PayloadRequest): Promise<unknown> => {
  if (typeof req.json !== "function") throw new Error("Request body is unavailable");
  return req.json();
};

const record = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};

const relationId = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const relation = record(value);
  if (typeof relation.id === "string" || typeof relation.id === "number") return String(relation.id);
  return undefined;
};

const getRequestId = (value: unknown): string => {
  const body = record(value);
  return typeof body.requestId === "string" ? body.requestId.trim() : "";
};

/** Lists only the signed-in customer's own sourcing requests and public quote fields. */
export const getMySourcingRequests = async (req: PayloadRequest) => {
  if (req.method !== "GET") return Response.json({ message: "Method not allowed" }, { status: 405 });
  if (req.user?.collection !== "customers") {
    return Response.json({ message: "Connexion client requise" }, { status: 401 });
  }

  const payload = req.payload as any;
  try {
    const result = await payload.find({
      collection: "sourcing-requests",
      overrideAccess: true,
      pagination: false,
      sort: "-createdAt",
      limit: 100,
      where: {
        or: [
          { customerEmail: { equals: req.user.email } },
          { customerEmail: { equals: req.user.email.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        requestReference: true,
        customerName: true,
        customerEmail: true,
        productName: true,
        brand: true,
        model: true,
        specifications: true,
        quantity: true,
        destinationCity: true,
        status: true,
        quotedAmount: true,
        quotedCurrency: true,
        quotedShippingCost: true,
        quotedTotal: true,
        depositPercentage: true,
        quoteValidUntil: true,
        quoteConditions: true,
        convertedOrder: true,
        acceptedAt: true,
        declinedAt: true,
        createdAt: true,
      },
    });

    return Response.json({ docs: result.docs });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to list customer sourcing requests" });
    return Response.json({ message: "Impossible de charger les demandes" }, { status: 500 });
  }
};

/** A customer can explicitly accept or decline a quote; acceptance creates one order. */
export const respondToSourcingQuote = async (req: PayloadRequest) => {
  if (req.method !== "POST") return Response.json({ message: "Method not allowed" }, { status: 405 });
  if (req.user?.collection !== "customers" || !req.user.email) {
    return Response.json({ message: "Connexion client requise" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await readRequestJson(req);
  } catch {
    return Response.json({ message: "Corps de requête invalide" }, { status: 400 });
  }

  const requestId = getRequestId(body);
  const action = record(body).action;
  if (!requestId || (action !== "accept" && action !== "decline")) {
    return Response.json({ message: "Demande ou action invalide" }, { status: 400 });
  }

  const payload = req.payload as any;
  try {
    const sourcingRequest = await payload.findByID({
      collection: "sourcing-requests",
      id: requestId,
      depth: 0,
      overrideAccess: true,
    });

    if (String(sourcingRequest.customerEmail).toLowerCase() !== String(req.user.email).toLowerCase()) {
      return Response.json({ message: "Demande introuvable" }, { status: 404 });
    }

    if (sourcingRequest.status === "converted_to_order") {
      return Response.json({
        message: "Ce devis a déjà été converti en commande.",
        orderId: relationId(sourcingRequest.convertedOrder),
      });
    }

    if (sourcingRequest.status === "converting_to_order") {
      const existingOrder = await payload.find({
        collection: "orders",
        where: { sourcingRequest: { equals: requestId } },
        limit: 1,
        overrideAccess: true,
      });
      if (existingOrder.docs[0]) {
        await payload.update({
          collection: "sourcing-requests",
          id: requestId,
          overrideAccess: true,
          context: { sourcingWorkflow: true },
          data: { status: "converted_to_order", convertedOrder: existingOrder.docs[0].id },
        });
        return Response.json({ status: "converted_to_order", orderId: existingOrder.docs[0].id }, { status: 201 });
      }
      return Response.json({ message: "La conversion de ce devis est déjà en cours. Réessaie dans quelques instants." }, { status: 409 });
    }

    if (sourcingRequest.status !== "quote_sent") {
      return Response.json({ message: "Ce devis n'est plus disponible pour réponse." }, { status: 409 });
    }

    const expiryDate = sourcingRequest.quoteValidUntil ? new Date(sourcingRequest.quoteValidUntil) : undefined;
    if (expiryDate) expiryDate.setUTCHours(23, 59, 59, 999);
    const expiry = expiryDate?.getTime() ?? Number.NaN;
    if (expiryDate && (!Number.isFinite(expiry) || expiry < Date.now())) {
      await payload.update({
        collection: "sourcing-requests",
        id: requestId,
        overrideAccess: true,
        context: { sourcingWorkflow: true },
        data: { status: "expired" },
      });
      return Response.json({ message: "La validité de ce devis est expirée." }, { status: 410 });
    }

    if (action === "decline") {
      await payload.update({
        collection: "sourcing-requests",
        id: requestId,
        overrideAccess: true,
        context: { sourcingWorkflow: true },
        data: { status: "declined", declinedAt: new Date().toISOString() },
      });
      return Response.json({ status: "declined" });
    }

    const amount = Number(sourcingRequest.quotedAmount);
    const shipping = Number(sourcingRequest.quotedShippingCost ?? 0);
    const quantity = Number(sourcingRequest.quantity);
    const currency = String(sourcingRequest.quotedCurrency ?? "XOF");
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(shipping) || shipping < 0 ||
        !Number.isInteger(quantity) || quantity < 1 || !["XOF", "USD", "EUR"].includes(currency)) {
      return Response.json({ message: "Le devis doit être complété et vérifié par l'équipe avant acceptation." }, { status: 422 });
    }

    const total = amount + shipping;
    const depositPercentage = Number(sourcingRequest.depositPercentage ?? 0);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(depositPercentage) || depositPercentage < 0 || depositPercentage > 100) {
      return Response.json({ message: "Les montants du devis sont invalides." }, { status: 422 });
    }

    // Claim the quote before creating the order to block concurrent double acceptance.
    const claim = await payload.update({
      collection: "sourcing-requests",
      where: {
        and: [
          { id: { equals: requestId } },
          { status: { equals: "quote_sent" } },
        ],
      },
      overrideAccess: true,
      context: { sourcingWorkflow: true },
      data: { status: "converting_to_order", acceptedAt: new Date().toISOString() },
    });
    if (!claim.docs.length) {
      return Response.json({ message: "Ce devis vient d'être traité. Actualise la page." }, { status: 409 });
    }

    try {
      const existingOrder = await payload.find({
        collection: "orders",
        where: { sourcingRequest: { equals: requestId } },
        limit: 1,
        overrideAccess: true,
      });
      if (existingOrder.docs[0]) {
        await payload.update({
          collection: "sourcing-requests",
          id: requestId,
          overrideAccess: true,
          context: { sourcingWorkflow: true },
          data: { status: "converted_to_order", convertedOrder: existingOrder.docs[0].id },
        });
        return Response.json({ status: "converted_to_order", orderId: existingOrder.docs[0].id }, { status: 201 });
      }
      const unitPrice = amount / quantity;
      const order = await payload.create({
        collection: "orders",
        overrideAccess: true,
        data: {
          customer: String(req.user.id),
          sourcingRequest: requestId,
          date: new Date().toISOString(),
          products: [{
            productName: String(sourcingRequest.productName),
            quantity,
            price: unitPrice,
            priceTotal: amount,
            isFromAPI: false,
          }],
          shippingAddress: {
            name: String(sourcingRequest.customerName),
            address: String(sourcingRequest.destinationCity),
            city: String(sourcingRequest.destinationCity),
            country: "bj",
            region: String(sourcingRequest.destinationCity),
            email: String(sourcingRequest.customerEmail),
            phone: String(sourcingRequest.customerPhone),
          },
          orderDetails: {
            total: amount,
            shippingCost: shipping,
            totalWithShipping: total,
            currency,
            amountPaid: 0,
            status: "pending",
            orderNote: `Commande issue du devis ${String(sourcingRequest.requestReference)}. Acompte demandé : ${depositPercentage}%.${sourcingRequest.quoteConditions ? ` Conditions : ${String(sourcingRequest.quoteConditions)}` : ""}`,
          },
        } as never,
      });

      await payload.update({
        collection: "sourcing-requests",
        id: requestId,
        overrideAccess: true,
        context: { sourcingWorkflow: true },
        data: { status: "converted_to_order", convertedOrder: order.id },
      });

      return Response.json({ status: "converted_to_order", orderId: order.id }, { status: 201 });
    } catch (error) {
      const createdOrder = await payload.find({
        collection: "orders",
        where: { sourcingRequest: { equals: requestId } },
        limit: 1,
        overrideAccess: true,
      });
      if (createdOrder.docs[0]) {
        await payload.update({
          collection: "sourcing-requests",
          id: requestId,
          overrideAccess: true,
          context: { sourcingWorkflow: true },
          data: { status: "converted_to_order", convertedOrder: createdOrder.docs[0].id },
        });
        return Response.json({ status: "converted_to_order", orderId: createdOrder.docs[0].id }, { status: 201 });
      }
      await payload.update({
        collection: "sourcing-requests",
        id: requestId,
        overrideAccess: true,
        context: { sourcingWorkflow: true },
        data: { status: "quote_sent", acceptedAt: null },
      });
      throw error;
    }
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to process sourcing quote response" });
    return Response.json({ message: "Impossible de traiter la réponse au devis. Réessaie ou contacte notre équipe." }, { status: 500 });
  }
};
