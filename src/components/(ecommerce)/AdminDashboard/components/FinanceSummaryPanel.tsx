"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type FinanceSummary = {
  currency: "XOF";
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

const formatXOF = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value) + " XOF";

export const FinanceSummaryPanel = () => {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const searchParams = useSearchParams();
  const dateFrom = searchParams.get("from");
  const dateTo = searchParams.get("to");

  useEffect(() => {
    let active = true;
    axios
      .post<FinanceSummary>("/api/orders/finance-summary", { dateFrom: dateFrom ?? undefined, dateTo: dateTo ?? undefined }, { withCredentials: true })
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
  }, [dateFrom, dateTo]);

  const metrics = [
    { label: "Encaissements clients confirmés", value: data?.confirmedCustomerReceiptsXOF },
    { label: "Remboursements confirmés", value: data?.confirmedRefundsXOF },
    { label: "Encaissements nets", value: data?.netCustomerReceiptsXOF },
    { label: "Sorties confirmées", value: data?.confirmedOperatingOutflowsXOF },
    { label: "Contribution de trésorerie", value: data?.cashContributionXOF },
  ];

  return (
    <section className="twp rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Situation financière — XOF</h2>
          <p className="text-sm text-muted-foreground">
            Uniquement les mouvements confirmés enregistrés dans le journal financier
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs">Données administratives</span>
      </div>

      {loading && <p className="text-sm">Chargement des données financières…</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          Impossible de charger la synthèse. Vérifiez votre session administrateur et réessayez.
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums">
                  {formatXOF(metric.value ?? 0)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <p>Opérations en attente : <strong>{data.pendingTransactions}</strong></p>
            <p>Opérations confirmées en devises étrangères exclues : <strong>{data.confirmedForeignCurrencyTransactions}</strong></p>
          </div>
          {Object.keys(data.excludedForeignCurrencyAmountByCurrency).length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Montants étrangers non convertis :{" "}
              {Object.entries(data.excludedForeignCurrencyAmountByCurrency)
                .map(([currency, amount]) => `${currency}: ${amount}`)
                .join(" · ")}
            </p>
          )}
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">{data.note}</p>
        </>
      )}
    </section>
  );
};
