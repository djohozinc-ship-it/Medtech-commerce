"use client";

import axios from "axios";
import { useEffect, useState } from "react";

import { FedaPayPaymentButton } from "@/components/(ecommerce)/FedaPayPaymentButton";

type Balance = {
  orderId: string;
  currency: string;
  total: number;
  paid: number;
  due: number;
  paymentEnabled: boolean;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

export const CustomerOrderPaymentPanel = ({ orderId }: { orderId: string }) => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<Balance>("/api/orders/order-balance", {
        params: { orderId },
        withCredentials: true,
      })
      .then(({ data }) => {
        if (active) setBalance(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (error) return <p role="alert" className="mt-6 text-sm text-red-600">Impossible de charger le solde actuel de cette commande.</p>;
  if (!balance) return <p className="mt-6 text-sm text-gray-500">Chargement du solde…</p>;

  return (
    <section className="mt-8 rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900">Situation de paiement</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt>Total de la commande</dt><dd className="font-medium">{money(balance.total, balance.currency)}</dd></div>
        <div className="flex justify-between gap-4"><dt>Montant payé</dt><dd className="font-medium">{money(balance.paid, balance.currency)}</dd></div>
        <div className="flex justify-between gap-4 border-t pt-2"><dt className="font-semibold">Solde restant</dt><dd className="font-semibold">{money(balance.due, balance.currency)}</dd></div>
      </dl>
      {balance.paymentEnabled && <FedaPayPaymentButton orderId={orderId} currency={balance.currency} />}
      {balance.currency !== "XOF" && <p className="mt-3 text-xs text-gray-500">Le paiement en ligne sera disponible lorsque le mode de paiement sera configuré pour cette devise.</p>}
      {balance.due === 0 && <p className="mt-3 text-sm text-green-700">Cette commande est entièrement réglée.</p>}
    </section>
  );
};
