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
    const [ordersResult, transactionsResult, paymentAllocationsResult, costAllocationsResult] = await Promise.all([
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
        select: { id: true, transactionType: true, amount: true, currency: true, order: true },
      }),
      req.payload.find({
        collection: "order-payment-allocations",
        depth: 0,
        limit: 10000,
        pagination: false,
        where: { status: { equals: "confirmed" } },
        select: { order: true, cashTransaction: true, amountInOrderCurrency: true, currency: true },
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

    const confirmedTransactions = new Map<string, RecordValue>();
    for (const raw of transactionsResult.docs) {
      const transaction = raw as unknown as RecordValue;
      const id = relationId(transaction.id);
      if (id) confirmedTransactions.set(id, transaction);
    }

    const paidByOrder = new Map<string, number>();
    const allocationsByOrder = new Set<string>();
    for (const raw of paymentAllocationsResult.docs) {
      const allocation = raw as unknown as RecordValue;
      const orderId = relationId(allocation.order);
      const transactionId = relationId(allocation.cashTransaction);
      if (!orderId || !transactionId) continue;
      const source = confirmedTransactions.get(transactionId);
      if (!source || source.transactionType !== "customer_payment") continue;
      if (source.currency !== allocation.currency) continue;
      const convertedAmount = asAmount(allocation.amountInOrderCurrency);
      if (convertedAmount <= 0) continue;
      allocationsByOrder.add(orderId);
      paidByOrder.set(orderId, (paidByOrder.get(orderId) ?? 0) + convertedAmount);
    }

    let outstandingXOF = 0;
    let outstandingOrders = 0;
    let excludedForeignCurrencyOrders = 0;
    let legacyPaymentOrders = 0;
    const orderRevenueXOF = new Map<string, number>();
    const orderCostsXOF = new Map<string, number>();

    for (const rawOrder of ordersResult.docs) {
      const order = rawOrder as unknown as RecordValue;
      const orderId = relationId(order.id);
      if (!orderId) continue;
      const details = asRecord(order.orderDetails);
      const total = asAmount(details.totalWithShipping);
      const currency = typeof details.currency === "string" ? details.currency : "UNKNOWN";
      const legacyPaid = asAmount(details.amountPaid);
      const paid = allocationsByOrder.has(orderId) ? (paidByOrder.get(orderId) ?? 0) : legacyPaid;

      if (!allocationsByOrder.has(orderId) && legacyPaid > 0) legacyPaymentOrders += 1;

      if (currency !== "XOF") {
        excludedForeignCurrencyOrders += 1;
        continue;
      }
      const due = Math.max(0, total - paid);
      if (due > 0) {
        outstandingXOF += due;
        outstandingOrders += 1;
      }
      orderRevenueXOF.set(orderId, Math.max(0, paid));
    }

    let confirmedReceiptsXOF = 0;
    let confirmedRefundsXOF = 0;
    let foreignCurrencyReceipts = 0;
    const receiptsByOrder = new Map<string, number>();
    const refundsByOrder = new Map<string, number>();
    for (const raw of transactionsResult.docs) {
      const transaction = raw as unknown as RecordValue;
      if (transaction.transactionType !== "customer_payment" && transaction.transactionType !== "customer_refund") continue;
      if (transaction.currency !== "XOF") {
        foreignCurrencyReceipts += 1;
        continue;
      }
      const amount = asAmount(transaction.amount);
      const orderId = relationId(transaction.order);
      if (transaction.transactionType === "customer_payment") {
        confirmedReceiptsXOF += amount;
        if (orderId) receiptsByOrder.set(orderId, (receiptsByOrder.get(orderId) ?? 0) + amount);
      } else {
        confirmedRefundsXOF += amount;
        if (orderId) refundsByOrder.set(orderId, (refundsByOrder.get(orderId) ?? 0) + amount);
      }
    }

    let approvedCostsXOF = 0;
    for (const raw of costAllocationsResult.docs) {
      const allocation = raw as unknown as RecordValue;
      const orderId = relationId(allocation.order);
      const cost = asAmount(allocation.allocatedCostXOF);
      approvedCostsXOF += cost;
      if (orderId) orderCostsXOF.set(orderId, (orderCostsXOF.get(orderId) ?? 0) + cost);
    }

    let ordersWithMissingCostAllocation = 0;
    let orderContributionXOF = 0;
    for (const [orderId, receipts] of receiptsByOrder) {
      const cost = orderCostsXOF.get(orderId);
      if (cost === undefined) {
        ordersWithMissingCostAllocation += 1;
        continue;
      }
      orderContributionXOF += receipts - (refundsByOrder.get(orderId) ?? 0) - cost;
    }

    const netReceiptsXOF = confirmedReceiptsXOF - confirmedRefundsXOF;
    const resultAfterCostsXOF = netReceiptsXOF - approvedCostsXOF;

    return Response.json({
      currency: "XOF",
      balances: {
        outstandingXOF: Math.round(outstandingXOF),
        outstandingOrders,
        excludedForeignCurrencyOrders,
        ordersUsingLegacyManualPaidAmount: legacyPaymentOrders,
        basis: "Confirmed payment allocations when present; otherwise legacy orderDetails.amountPaid. Orders in other currencies are excluded.",
      },
      profitability: {
        confirmedReceiptsXOF: Math.round(confirmedReceiptsXOF),
        confirmedRefundsXOF: Math.round(confirmedRefundsXOF),
        netReceiptsXOF: Math.round(netReceiptsXOF),
        approvedAllocatedCostsXOF: Math.round(approvedCostsXOF),
        resultAfterAllocatedCostsXOF: Math.round(resultAfterCostsXOF),
        contributionForOrdersWithKnownCostsXOF: Math.round(orderContributionXOF),
        ordersWithMissingCostAllocation,
        foreignCurrencyPaymentTransactionsExcluded: foreignCurrencyReceipts,
        isCompleteProfit: false,
        note: "Résultat de trésorerie après coûts affectés approuvés, pas un bénéfice net comptable. Les frais non enregistrés, les opérations en devises non converties et les commandes sans affectation de coût empêchent de certifier le bénéfice réel.",
      },
    });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to calculate finance operations" });
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
};
