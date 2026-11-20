import { type PayloadRequest } from "payload";

type RecordValue = Record<string, unknown>;
const asRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};
const asAmount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const relationId = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  if (typeof record.id === "string" || typeof record.id === "number") return String(record.id);
  return undefined;
};

export const getFinanceOperations = async (req: PayloadRequest) => {
  if (req.method !== "GET") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }
  if (req.user?.collection !== "administrators") {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [ordersResult, transactionsResult, allocationsResult] = await Promise.all([
      req.payload.find({
        collection: "orders",
        depth: 0,
        limit: 10000,
        pagination: false,
        select: { id: true, orderDetails: true },
      }),
      req.payload.find({
        collection: "cash-transactions",
        depth: 0,
        limit: 10000,
        pagination: false,
        where: { status: { equals: "confirmed" } },
        select: { transactionType: true, amount: true, currency: true, order: true },
      }),
      req.payload.find({
        collection: "order-cost-allocations",
        depth: 0,
        limit: 10000,
        pagination: false,
        where: { status: { equals: "approved" } },
        select: { order: true, allocatedCostXOF: true },
      }),
    ]);

    let outstandingXOF = 0;
    let outstandingOrders = 0;
    let foreignCurrencyOrders = 0;
    const orderIdsWithReceipts = new Set<string>();

    for (const rawOrder of ordersResult.docs) {
      const order = rawOrder as unknown as RecordValue;
      const details = asRecord(order.orderDetails);
      const total = asAmount(details.totalWithShipping);
      const paid = asAmount(details.amountPaid);
      const currency = typeof details.currency === "string" ? details.currency : "UNKNOWN";
      const due = Math.max(0, total - paid);
      if (due <= 0) continue;
      if (currency !== "XOF") {
        foreignCurrencyOrders += 1;
        continue;
      }
      outstandingXOF += due;
      outstandingOrders += 1;
    }

    let receiptsXOF = 0;
    let refundsXOF = 0;
    for (const rawTransaction of transactionsResult.docs) {
      const transaction = rawTransaction as unknown as RecordValue;
      const orderId = relationId(transaction.order);
      if (transaction.currency !== "XOF") continue;
      const amount = asAmount(transaction.amount);
      if (transaction.transactionType === "customer_payment") {
        receiptsXOF += amount;
        if (orderId) orderIdsWithReceipts.add(orderId);
      } else if (transaction.transactionType === "customer_refund") {
        refundsXOF += amount;
      }
    }

    let approvedCostsXOF = 0;
    const costByOrder = new Map<string, number>();
    for (const rawAllocation of allocationsResult.docs) {
      const allocation = rawAllocation as unknown as RecordValue;
      const orderId = relationId(allocation.order);
      const amount = asAmount(allocation.allocatedCostXOF);
      approvedCostsXOF += amount;
      if (orderId) costByOrder.set(orderId, (costByOrder.get(orderId) ?? 0) + amount);
    }

    const ordersWithReceiptsNoCostAllocation = [...orderIdsWithReceipts].filter(
      (id) => !costByOrder.has(id),
    ).length;
    const netReceiptsXOF = receiptsXOF - refundsXOF;
    const knownResultXOF = netReceiptsXOF - approvedCostsXOF;

    return Response.json({
      currency: "XOF",
      balances: {
        outstandingXOF: Math.round(outstandingXOF),
        outstandingOrders,
        excludedForeignCurrencyOrders: foreignCurrencyOrders,
        basis: "orderDetails.totalWithShipping minus orderDetails.amountPaid",
      },
      profitability: {
        confirmedReceiptsXOF: Math.round(receiptsXOF),
        confirmedRefundsXOF: Math.round(refundsXOF),
        netReceiptsXOF: Math.round(netReceiptsXOF),
        approvedAllocatedCostsXOF: Math.round(approvedCostsXOF),
        knownResultAfterAllocatedCostsXOF: Math.round(knownResultXOF),
        ordersWithReceiptsNoCostAllocation,
        isCompleteProfit: false,
        note: "Indicateur partiel : seuls les encaissements et remboursements confirmés en XOF et les coûts affectés validés sont inclus. Les coûts non encore saisis ou affectés peuvent manquer ; ce résultat ne doit pas être présenté comme un bénéfice net.",
      },
    });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to calculate finance operations" });
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
};
