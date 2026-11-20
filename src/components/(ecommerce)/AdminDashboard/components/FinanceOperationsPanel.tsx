"use client";

import axios from "axios";
import { useEffect, useState } from "react";

type FinanceOperations = {
  currency: "XOF";
  balances: {
    outstandingXOF: number;
    outstandingOrders: number;
    excludedForeignCurrencyOrders: number;
    ordersUsingLegacyManualPaidAmount: number;
  };
  profitability: {
    confirmedReceiptsXOF: number;
    confirmedRefundsXOF: number;
    netReceiptsXOF: number;
    approvedAllocatedCostsXOF: number;
    resultAfterAllocatedCostsXOF: number;
    contributionForOrdersWithKnownCostsXOF: number;
    ordersWithMissingCostAllocation: number;
    foreignCurrencyPaymentTransactionsExcluded: number;
    isCompleteProfit: false;
    note: string;
  };
};

const formatXOF = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount) + " XOF";

export const FinanceOperationsPanel = () => {
  const [data, setData] = useState<FinanceOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<FinanceOperations>("/api/orders/finance-operations", { withCredentials: true })
      .then(({ data: result }) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="twp rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Soldes clients et rentabilité — XOF</h2>
        <p className="text-sm text-muted-foreground">
          Calcul à partir des commandes, paiements confirmés et coûts validés
        </p>
      </div>
      {loading && <p className="text-sm">Calcul des soldes et des coûts…</p>}
      {error && <p role="alert" className="text-sm text-red-600">Impossible de charger les indicateurs financiers.</p>}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Solde client restant dû</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{formatXOF(data.balances.outstandingXOF)}</p>
              <p className="text-xs text-muted-foreground">{data.balances.outstandingOrders} commande(s) avec solde</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Encaissements nets confirmés</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{formatXOF(data.profitability.netReceiptsXOF)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Coûts affectés et validés</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{formatXOF(data.profitability.approvedAllocatedCostsXOF)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Résultat après coûts affectés</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{formatXOF(data.profitability.resultAfterAllocatedCostsXOF)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <p>Commandes sans coût affecté : <strong>{data.profitability.ordersWithMissingCostAllocation}</strong></p>
            <p>Commandes en devise étrangère exclues : <strong>{data.balances.excludedForeignCurrencyOrders}</strong></p>
            <p>Anciennes saisies manuelles utilisées : <strong>{data.balances.ordersUsingLegacyManualPaidAmount}</strong></p>
          </div>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{data.profitability.note}</p>
        </>
      )}
    </section>
  );
};
