import { type PayloadRequest, type Where } from "payload";

type FinanceSummary = {
  currency: "XOF";
  period: { from?: string; to?: string };
  confirmedCustomerReceiptsXOF: number;
  confirmedRefundsXOF: number;
  netCustomerReceiptsXOF: number;
  confirmedOperatingOutflowsXOF: number;
  cashContributionXOF: number;
  pendingTransactions: number;
  confirmedForeignCurrencyTransactions: number;
  excludedForeignCurrencyAmountByCurrency: Record<string, number>;
  note: string;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const getFinanceSummary = async (req: PayloadRequest) => {
  if (req.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }
  if (req.user?.collection !== "administrators") {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const dates = req.json && ((await req.json()) as { dateFrom?: string; dateTo?: string });
    const from = dates?.dateFrom ? new Date(dates.dateFrom) : undefined;
    const to = dates?.dateTo ? new Date(dates.dateTo) : undefined;

    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      return Response.json({ message: "Invalid date range" }, { status: 400 });
    }
    if (from && to && from > to) {
      return Response.json({ message: "dateFrom must be before dateTo" }, { status: 400 });
    }

    const clauses: Where[] = [];
    if (from || to) {
      const range: Record<string, string> = {};
      if (from) {
        from.setHours(0, 0, 0, 0);
        range.greater_than_equal = from.toISOString();
      }
      if (to) {
        to.setHours(23, 59, 59, 999);
        range.less_than_equal = to.toISOString();
      }
      clauses.push({ transactionDate: range });
    }

    const { docs } = await req.payload.find({
      collection: "cash-transactions",
      depth: 0,
      limit: 10000,
      pagination: false,
      where: clauses.length ? { and: clauses } : undefined,
      select: {
        transactionType: true,
        status: true,
        amount: true,
        currency: true,
        transactionDate: true,
      },
    });

    let receipts = 0;
    let refunds = 0;
    let outflows = 0;
    let pending = 0;
    let foreignCount = 0;
    const foreignAmounts: Record<string, number> = {};

    for (const doc of docs) {
      const amount = isNumber(doc.amount) ? doc.amount : 0;
      const currency = typeof doc.currency === "string" ? doc.currency : "UNKNOWN";
      if (doc.status === "pending") pending += 1;
      if (doc.status !== "confirmed") continue;

      if (currency !== "XOF") {
        foreignCount += 1;
        foreignAmounts[currency] = (foreignAmounts[currency] ?? 0) + amount;
        continue;
      }

      switch (doc.transactionType) {
        case "customer_payment":
          receipts += amount;
          break;
        case "customer_refund":
          refunds += amount;
          break;
        case "supplier_payment":
        case "freight_expense":
        case "customs_expense":
        case "handling_expense":
        case "local_delivery_expense":
        case "operating_expense":
          outflows += amount;
          break;
        default:
          break;
      }
    }

    const netReceipts = receipts - refunds;
    const result: FinanceSummary = {
      currency: "XOF",
      period: {
        from: dates?.dateFrom,
        to: dates?.dateTo,
      },
      confirmedCustomerReceiptsXOF: Math.round(receipts),
      confirmedRefundsXOF: Math.round(refunds),
      netCustomerReceiptsXOF: Math.round(netReceipts),
      confirmedOperatingOutflowsXOF: Math.round(outflows),
      cashContributionXOF: Math.round(netReceipts - outflows),
      pendingTransactions: pending,
      confirmedForeignCurrencyTransactions: foreignCount,
      excludedForeignCurrencyAmountByCurrency: Object.fromEntries(
        Object.entries(foreignAmounts).map(([currency, amount]) => [currency, Math.round(amount * 100) / 100]),
      ),
      note: "Indicateur de trésorerie basé sur les mouvements confirmés en XOF. Il ne constitue pas un bénéfice comptable : les opérations en devises non converties sont exclues et les coûts non encore enregistrés ne sont pas estimés.",
    };

    return Response.json(result, { status: 200 });
  } catch (error) {
    req.payload.logger.error({ err: error, msg: "Unable to calculate finance summary" });
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
};
