"use client";

import { useCallback, useEffect, useState } from "react";

import { Link } from "@/i18n/routing";

type SourcingRequest = {
  id: string | number;
  requestReference?: string | null;
  productName?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity?: number | null;
  destinationCity?: string | null;
  status?: string | null;
  quotedAmount?: number | null;
  quotedCurrency?: string | null;
  quotedShippingCost?: number | null;
  quotedTotal?: number | null;
  depositPercentage?: number | null;
  quoteValidUntil?: string | null;
  quoteConditions?: string | null;
  convertedOrder?: string | { id: string | number } | null;
  createdAt?: string;
};

const statusLabels: Record<string, string> = {
  received: "Demande reçue",
  supplier_search: "Recherche fournisseur",
  quote_preparation: "Devis en préparation",
  quote_sent: "Devis à consulter",
  converting_to_order: "Conversion en commande",
  accepted: "Devis accepté",
  declined: "Devis refusé",
  converted_to_order: "Commande créée",
  expired: "Devis expiré",
  unavailable: "Approvisionnement indisponible",
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

const orderIdOf = (value: SourcingRequest["convertedOrder"]) =>
  typeof value === "string" ? value : value?.id ? String(value.id) : undefined;

export function CustomerSourcingRequests() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sourcing-requests/mine", { credentials: "same-origin", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Impossible de charger tes demandes.");
      setRequests(Array.isArray(result.docs) ? result.docs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  async function respond(requestId: string, action: "accept" | "decline") {
    const confirmation = action === "accept"
      ? "Confirmer l'acceptation de ce devis ? Une commande sera créée."
      : "Confirmer le refus de ce devis ?";
    if (!window.confirm(confirmation)) return;
    setBusyId(requestId);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/sourcing-requests/respond", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "La réponse n'a pas pu être enregistrée.");
      if (action === "accept" && result.orderId) {
        setMessage("Devis accepté : ta commande a été créée.");
      } else {
        setMessage("Ta réponse a bien été enregistrée.");
      }
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes demandes de devis</h1>
          <p className="mt-1 text-sm text-gray-600">Consulte tes demandes, réponds aux devis et retrouve les commandes créées.</p>
        </div>
        <Link href="/sourcing" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Nouvelle demande</Link>
      </div>

      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p className="text-sm text-gray-600">Chargement des demandes...</p> :
        requests.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium text-gray-800">Tu n'as pas encore de demande de devis.</p>
            <p className="mt-1 text-sm text-gray-600">Envoie une demande pour un équipement ou une pièce qui n'est pas au catalogue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const id = String(request.id);
              const currency = request.quotedCurrency || "XOF";
              const orderId = orderIdOf(request.convertedOrder);
              const canRespond = request.status === "quote_sent";
              return (
                <article key={id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{request.requestReference || "Demande"}</p>
                      <h2 className="mt-1 text-lg font-semibold text-gray-900">{request.productName}</h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {request.brand ? `${request.brand} · ` : ""}{request.model ? `${request.model} · ` : ""}{request.quantity ?? 1} unité(s) · {request.destinationCity}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {statusLabels[request.status || ""] || request.status || "En traitement"}
                    </span>
                  </div>

                  {canRespond && (
                    <div className="mt-5 rounded-lg bg-blue-50 p-4">
                      <h3 className="font-semibold text-gray-900">Devis proposé</h3>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <p>Produits : <strong>{money(Number(request.quotedAmount || 0), currency)}</strong></p>
                        <p>Transport : <strong>{money(Number(request.quotedShippingCost || 0), currency)}</strong></p>
                        <p className="sm:col-span-2 text-base">Total : <strong>{money(Number(request.quotedTotal ?? (Number(request.quotedAmount || 0) + Number(request.quotedShippingCost || 0))), currency)}</strong></p>
                        {request.depositPercentage != null && <p>Acompte demandé : <strong>{request.depositPercentage}%</strong></p>}
                        {request.quoteValidUntil && <p>Valable jusqu'au : <strong>{new Date(request.quoteValidUntil).toLocaleDateString("fr-FR")}</strong></p>}
                      </div>
                      {request.quoteConditions && <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{request.quoteConditions}</p>}
                      <p className="mt-3 text-xs text-gray-600">L'acceptation crée une commande avec le montant du devis. Le paiement sera traité ensuite selon les moyens disponibles.</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" disabled={busyId === id} onClick={() => void respond(id, "accept")} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {busyId === id ? "Traitement..." : "Accepter le devis"}
                        </button>
                        <button type="button" disabled={busyId === id} onClick={() => void respond(id, "decline")} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
                          Refuser
                        </button>
                      </div>
                    </div>
                  )}

                  {request.status === "converted_to_order" && orderId && (
                    <div className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-900">
                      Ta commande est créée.
                      <Link href={`/order/${orderId}`} className="ml-2 font-semibold underline">Voir la commande</Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
    </section>
  );
}
