"use client";

import axios from "axios";
import { useEffect, useState } from "react";

type ShipmentEvent = {
  id: string | number;
  status: string;
  eventDate: string;
  location?: string | null;
  carrier?: string | null;
  trackingCode?: string | null;
  trackingUrl?: string | null;
};

const labels: Record<string, string> = {
  request_received: "Demande reçue",
  payment_confirmed: "Paiement confirmé",
  supplier_ordered: "Commande passée auprès du fournisseur",
  arrived_china_warehouse: "Arrivée à l'entrepôt en Chine",
  consolidated: "Colis regroupés",
  departed_china: "Expédié de Chine",
  arrived_benin: "Arrivé au Bénin",
  customs_clearance: "Formalités douanières en cours",
  ready_for_delivery: "Prêt pour la livraison locale",
  out_for_delivery: "En cours de livraison",
  delivered: "Livré au client",
  exception: "Incident ou retard",
};

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Porto-Novo",
  }).format(new Date(value));

export const CustomerShipmentTracking = ({ orderId }: { orderId: string }) => {
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get<{ events: ShipmentEvent[] }>("/api/orders/shipment-tracking", {
        params: { orderId },
        withCredentials: true,
      })
      .then(({ data }) => {
        if (active) setEvents(data.events ?? []);
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
  }, [orderId]);

  return (
    <section className="mt-8 rounded-lg border border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-900">Suivi de votre commande</h2>
      {loading && <p className="mt-3 text-sm text-gray-500">Chargement des étapes logistiques…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">Le suivi n'est pas disponible pour le moment.</p>}
      {!loading && !error && events.length === 0 && (
        <p className="mt-3 text-sm text-gray-600">
          Le suivi détaillé sera affiché dès que la première étape logistique aura été enregistrée.
        </p>
      )}
      {events.length > 0 && (
        <ol className="mt-5 space-y-5">
          {events.map((event) => (
            <li key={event.id} className="relative border-l-2 border-gray-200 pl-5">
              <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-indigo-600" />
              <p className="font-medium text-gray-900">{labels[event.status] ?? event.status}</p>
              <p className="mt-1 text-xs text-gray-500">{dateLabel(event.eventDate)}</p>
              {(event.location || event.carrier) && (
                <p className="mt-1 text-sm text-gray-600">
                  {[event.location, event.carrier].filter(Boolean).join(" · ")}
                </p>
              )}
              {event.trackingCode && (
                <p className="mt-1 text-sm text-gray-600">Numéro de suivi : {event.trackingCode}</p>
              )}
              {event.trackingUrl && /^https:\/\//i.test(event.trackingUrl) && (
                <a
                  href={event.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-indigo-600 underline"
                >
                  Ouvrir le suivi du transporteur
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
