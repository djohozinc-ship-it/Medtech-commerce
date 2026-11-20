"use client";

import axios from "axios";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export const FedaPayPaymentButton = ({ orderId, currency }: { orderId: string; currency: string }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startPayment = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post<{ paymentUrl: string }>(
        "/api/orders/create-fedapay-payment",
        { orderId },
        { withCredentials: true },
      );
      if (!data.paymentUrl?.startsWith("https://")) {
        throw new Error("Lien de paiement invalide");
      }
      window.location.assign(data.paymentUrl);
    } catch {
      setError("Impossible de préparer le paiement. Vérifiez votre connexion ou contactez notre équipe.");
      setLoading(false);
    }
  };

  if (currency !== "XOF") return null;

  return (
    <div className="mt-6">
      <Button type="button" onClick={startPayment} disabled={loading} className="w-full sm:w-auto">
        {loading ? "Préparation du paiement…" : "Payer le solde par Mobile Money"}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        Paiement sécurisé via FedaPay. Votre commande sera mise à jour après vérification du paiement par le serveur.
      </p>
    </div>
  );
};
