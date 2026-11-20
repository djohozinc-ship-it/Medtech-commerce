import { type PayloadRequest } from "payload";

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? value as UnknownRecord : {};
const primitiveString = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;
const idOf = (value: unknown): string | undefined => {
  const direct = primitiveString(value);
  if (direct !== undefined) return direct;
  return primitiveString(record(value).id);
};
const getRemoteTransaction = (body: unknown): UnknownRecord => {
  const root = record(body);
  return record(root["v1/transaction"] ?? root.transaction ?? root);
};
const readRequestJson = async (req: PayloadRequest): Promise<unknown> => {
  if (typeof req.json !== "function") throw new Error("Request body is unavailable");
  return req.json();
};

const apiBase = () =>
  process.env.FEDAPAY_ENV === "live"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

const fedapayRequest = async (path: string, init: RequestInit = {}) => {
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) throw new Error("FedaPay is not configured");
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`FedaPay request failed with status ${response.status}`);
  }
  return body;
};

export const createFedaPayPayment = async (req: PayloadRequest) => {
  if (req.method !== "POST") return Response.json({ message: "Method not allowed" }, { status: 405 });
  if (req.user?.collection !== "customers") return Response.json({ message: "Connexion client requise" }, { status: 401 });
  if (!process.env.FEDAPAY_SECRET_KEY || !process.env.NEXT_PUBLIC_SERVER_URL) {
    return Response.json({ message: "Le paiement en ligne n'est pas encore configuré par l'administrateur." }, { status: 503 });
  }

  try {
    const body = await readRequestJson(req) as { orderId?: string; amount?: number };
    if (!body.orderId) return Response.json({ message: "Commande manquante" }, { status: 400 });

    const order = await req.payload.findByID({
      collection: "orders",
      id: body.orderId,
      depth: 0,
      overrideAccess: true,
    }) as unknown as UnknownRecord;

    if (idOf(order.customer) !== String(req.user.id)) {
      return Response.json({ message: "Commande introuvable" }, { status: 404 });
    }

    const details = record(order.orderDetails);
    const currency = primitiveString(details.currency) ?? "";
    if (currency !== "XOF") {
      return Response.json({ message: "FedaPay accepte ici uniquement les commandes en XOF." }, { status: 400 });
    }

    const total = Number(details.totalWithShipping);
    const legacyPaid = Number(details.amountPaid ?? 0);
    if (!Number.isFinite(total) || total <= 0) {
      return Response.json({ message: "Montant de commande invalide" }, { status: 400 });
    }

    const confirmedAllocations = await req.payload.find({
      collection: "order-payment-allocations",
      depth: 1,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
      where: { and: [
        { order: { equals: body.orderId } },
        { status: { equals: "confirmed" } },
      ] },
    });

    let alreadyAllocated = 0;
    let validAllocationCount = 0;
    for (const item of confirmedAllocations.docs) {
      const allocation = item as unknown as UnknownRecord;
      const cash = record(allocation.cashTransaction);
      if (cash.status !== "confirmed" || cash.transactionType !== "customer_payment") continue;
      if (cash.currency !== allocation.currency) continue;
      alreadyAllocated += Number(allocation.amountInOrderCurrency) || 0;
      validAllocationCount += 1;
    }
    const paid = validAllocationCount > 0 ? alreadyAllocated : legacyPaid;
    const due = Math.max(0, Math.floor(total - paid));
    const amount = body.amount === undefined ? due : Math.floor(Number(body.amount));

    if (!Number.isFinite(amount) || amount < 1 || amount > due) {
      return Response.json({ message: "Le montant doit être positif et ne pas dépasser le solde restant." }, { status: 400 });
    }

    const address = record(order.shippingAddress);
    const fullName = String(address.name ?? "Client Medtech Commerce").trim().split(/\s+/);
    const firstname = fullName[0] || "Client";
    const lastname = fullName.slice(1).join(" ") || "Medtech Commerce";
    const email = primitiveString(address.email) ?? "";
    const phone = primitiveString(address.phone) ?? "";
    if (!email || !phone) {
      return Response.json({ message: "L'adresse e-mail et le téléphone du client sont requis pour le paiement." }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL.replace(/\/$/, "");
    const transactionBody = await fedapayRequest("/transactions", {
      method: "POST",
      body: JSON.stringify({
        description: `Medtech Commerce — commande ${String(order.id)}`,
        amount,
        currency: { iso: "XOF" },
        callback_url: `${baseUrl}/api/orders/fedapay-return`,
        customer: {
          firstname,
          lastname,
          email,
          phone_number: { number: phone, country: "BJ" },
        },
      }),
    });

    const remote = getRemoteTransaction(transactionBody);
    const remoteId = primitiveString(remote.id);
    if (remoteId === undefined) {
      throw new Error("FedaPay response did not include a transaction ID");
    }

    const tokenBody = record(await fedapayRequest(`/transactions/${encodeURIComponent(remoteId)}/token`, { method: "POST", body: "{}" }));
    const token = record(tokenBody["v1/token"] ?? tokenBody.token ?? tokenBody);
    const paymentUrl = token.url;
    if (typeof paymentUrl !== "string" || !paymentUrl.startsWith("https://")) {
      throw new Error("FedaPay did not return a valid hosted payment URL");
    }

    const orderRecordId = idOf(order.id);
    if (!orderRecordId) throw new Error("Invalid order identifier");
    const reference = `FDP-${orderRecordId}-${remoteId}`;
    await req.payload.create({
      collection: "payment-attempts",
      overrideAccess: true,
      data: {
        paymentReference: reference,
        order: orderRecordId,
        customer: req.user.id,
        provider: "fedapay",
        providerTransactionId: String(remoteId),
        amount,
        currency: "XOF",
        paymentUrl,
        status: "pending",
        providerPayload: { id: remoteId, status: remote.status ?? "pending" },
      },
    });

    return Response.json({ paymentUrl, paymentReference: reference, amount, currency: "XOF" }, { status: 201 });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to create FedaPay payment" });
    return Response.json({ message: "Impossible de créer le paiement. Réessayez ou contactez le support." }, { status: 500 });
  }
};

const confirmFedaPayTransaction = async (req: PayloadRequest, remoteId: string) => {
  const attempts = await req.payload.find({
    collection: "payment-attempts",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { providerTransactionId: { equals: remoteId } },
  });
  const attempt = attempts.docs[0] as unknown as UnknownRecord | undefined;
  if (!attempt) return { ok: false, status: 404, message: "Tentative de paiement inconnue" };

  const remoteBody = await fedapayRequest(`/transactions/${encodeURIComponent(remoteId)}`, { method: "GET" });
  const remote = getRemoteTransaction(remoteBody);
  if (String(remote.id) !== remoteId) return { ok: false, status: 400, message: "Identifiant prestataire invalide" };
  const remoteCurrency = record(remote.currency).iso ?? remote.currency_iso;
  if (remoteCurrency && remoteCurrency !== "XOF") {
    return { ok: false, status: 400, message: "La devise de la transaction prestataire ne correspond pas à XOF" };
  }

  const attemptId = idOf(attempt.id);
  if (!attemptId) return { ok: false, status: 400, message: "Identifiant de tentative invalide" };
  const orderId = idOf(attempt.order);
  const amount = Number(attempt.amount);
  if (!orderId || !Number.isFinite(amount) || amount < 1 || Number(remote.amount) !== amount) {
    return { ok: false, status: 400, message: "Les données du paiement ne correspondent pas à la commande" };
  }

  if (remote.status !== "approved") {
    return { ok: true, status: 200, paymentStatus: remote.status ?? "pending" };
  }

  if (attempt.status === "paid") return { ok: true, status: 200, paymentStatus: "paid" };

  const duplicate = await req.payload.find({
    collection: "cash-transactions",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { providerTransactionId: { equals: remoteId } },
  });
  let cashTransactionId: string | number;
  if (duplicate.docs.length === 0) {
    const cash = await req.payload.create({
      collection: "cash-transactions",
      overrideAccess: true,
      data: {
        transactionReference: `FDP-RECEIPT-${remoteId}`,
        transactionType: "customer_payment",
        status: "confirmed",
        amount,
        currency: "XOF",
        paymentMethod: "mobile_money_gateway",
        paymentProvider: "FedaPay",
        providerTransactionId: remoteId,
        transactionDate: new Date().toISOString(),
        order: orderId,
        customer: idOf(attempt.customer),
        confirmedBy: "FedaPay API verification",
        confirmationNotes: "Statut approved vérifié directement auprès de l'API FedaPay.",
      },
    });
    cashTransactionId = cash.id;
  } else {
    const duplicateId = idOf((duplicate.docs[0] as unknown as UnknownRecord).id);
    if (!duplicateId) throw new Error("Invalid cash transaction identifier");
    cashTransactionId = duplicateId;
  }

  const existingAllocation = await req.payload.find({
    collection: "order-payment-allocations",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { cashTransaction: { equals: cashTransactionId } },
  });
  if (existingAllocation.docs.length === 0) {
    await req.payload.create({
      collection: "order-payment-allocations",
      overrideAccess: true,
      data: {
        allocationReference: `FDP-ALLOC-${remoteId}`,
        order: orderId,
        cashTransaction: String(cashTransactionId),
        allocatedAmount: amount,
        currency: "XOF",
        exchangeRateToOrderCurrency: 1,
        status: "confirmed",
        providerReference: remoteId,
        verifiedBy: "FedaPay API verification",
        verifiedAt: new Date().toISOString(),
        notes: "Affectation automatique après vérification du statut approved chez FedaPay.",
      },
    });
  }

  await req.payload.update({
    collection: "payment-attempts",
    id: attemptId,
    overrideAccess: true,
    data: {
      status: "paid",
      verifiedAt: new Date().toISOString(),
      providerPayload: { id: String(remote.id), status: String(remote.status), approved_at: remote.approved_at },
    },
  });
  return { ok: true, status: 200, paymentStatus: "paid" };
};

export const fedapayReturn = async (req: PayloadRequest) => {
  const url = new URL(req.url ?? "https://localhost");
  const remoteId = url.searchParams.get("id");
  if (!remoteId) return Response.json({ message: "Identifiant de transaction manquant" }, { status: 400 });
  try {
    const result = await confirmFedaPayTransaction(req, remoteId);
    const attempts = await req.payload.find({
      collection: "payment-attempts",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { providerTransactionId: { equals: remoteId } },
    });
    const attempt = attempts.docs[0] as unknown as UnknownRecord | undefined;
    const orderId = attempt ? idOf(attempt.order) : undefined;
    if (orderId && process.env.NEXT_PUBLIC_SERVER_URL) {
      const outcome = result.paymentStatus === "paid" ? "success" : "pending";
      return Response.redirect(
        new URL(`/fr/order/${encodeURIComponent(orderId)}?payment=${outcome}`, process.env.NEXT_PUBLIC_SERVER_URL),
        303,
      );
    }
    return Response.json(result, { status: result.status });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to verify FedaPay return" });
    return Response.json({ message: "Vérification du paiement impossible pour le moment" }, { status: 502 });
  }
};

export const fedapayWebhook = async (req: PayloadRequest) => {
  if (req.method !== "POST") return Response.json({ message: "Method not allowed" }, { status: 405 });
  try {
    const body = record(await readRequestJson(req));
    const data = record(body["v1/event"] ?? body.event ?? body);
    const entity = record(data.entity ?? data.object ?? data);
    const remoteId = primitiveString(entity.id ?? record(entity.transaction).id);
    if (remoteId === undefined) {
      return Response.json({ message: "Identifiant de transaction manquant" }, { status: 400 });
    }
    const result = await confirmFedaPayTransaction(req, remoteId);
    return Response.json(result, { status: result.status });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to process FedaPay webhook" });
    return Response.json({ message: "Webhook processing failed" }, { status: 502 });
  }
};

export const getCustomerOrderBalance = async (req: PayloadRequest) => {
  if (req.method !== "GET") return Response.json({ message: "Method not allowed" }, { status: 405 });
  if (req.user?.collection !== "customers") return Response.json({ message: "Connexion client requise" }, { status: 401 });
  try {
    const url = new URL(req.url ?? "https://localhost");
    const orderId = url.searchParams.get("orderId");
    if (!orderId) return Response.json({ message: "Commande manquante" }, { status: 400 });
    const order = await req.payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    }) as unknown as UnknownRecord;
    if (idOf(order.customer) !== String(req.user.id)) {
      return Response.json({ message: "Commande introuvable" }, { status: 404 });
    }
    const details = record(order.orderDetails);
    const currency = primitiveString(details.currency) ?? "";
    const total = Number(details.totalWithShipping);
    if (!Number.isFinite(total) || total < 0) {
      return Response.json({ message: "Montant de commande invalide" }, { status: 400 });
    }
    const allocations = await req.payload.find({
      collection: "order-payment-allocations",
      depth: 1,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
      where: { and: [
        { order: { equals: orderId } },
        { status: { equals: "confirmed" } },
      ] },
    });
    let paidFromLedger = 0;
    for (const raw of allocations.docs) {
      const allocation = raw as unknown as UnknownRecord;
      const cash = record(allocation.cashTransaction);
      if (cash.status !== "confirmed" || cash.transactionType !== "customer_payment") continue;
      if (allocation.currency !== currency) continue;
      paidFromLedger += Number(allocation.amountInOrderCurrency) || 0;
    }
    const paid = allocations.docs.some((raw) => {
      const allocation = raw as unknown as UnknownRecord;
      const cash = record(allocation.cashTransaction);
      return cash.status === "confirmed" && cash.transactionType === "customer_payment" && cash.currency === allocation.currency;
    }) ? paidFromLedger : Number(details.amountPaid) || 0;
    return Response.json({
      orderId,
      currency,
      total: Math.round(total),
      paid: Math.round(paid),
      due: Math.max(0, Math.round(total - paid)),
      paymentEnabled: currency === "XOF" && Math.round(total - paid) > 0,
    });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to calculate customer order balance" });
    return Response.json({ message: "Impossible de calculer le solde de la commande" }, { status: 500 });
  }
};
