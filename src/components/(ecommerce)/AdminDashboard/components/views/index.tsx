"use client";

import { useSearchParams } from "next/navigation";
import { type ReactNode } from "react";
import { Overview } from "./Overview";

type AdminShortcut = { slug: string; label: string; description: string };

const panels: Record<string, { title: string; intro: string; links: AdminShortcut[] }> = {
  procurement: {
    title: "Centre d'approvisionnement",
    intro: "Traiter les demandes clients, comparer les offres et formaliser les achats auprès des fournisseurs.",
    links: [
      { slug: "sourcing-requests", label: "Demandes de sourcing", description: "Rechercher, chiffrer et répondre aux demandes clients." },
      { slug: "suppliers", label: "Fournisseurs", description: "Coordonnées, suivi et dossiers fournisseurs." },
      { slug: "supplier-offers", label: "Offres fournisseurs", description: "Prix, validité et offres retenues." },
      { slug: "purchase-orders", label: "Bons de commande fournisseurs", description: "Créer et suivre les commandes d'achat." },
      { slug: "landed-cost-estimates", label: "Estimations de coût rendu", description: "Estimer le coût total d'importation avant validation." },
    ],
  },
  logistics: {
    title: "Centre logistique",
    intro: "Suivre les réceptions, inspections, consolidations, expéditions internationales et événements de livraison.",
    links: [
      { slug: "warehouses", label: "Entrepôts", description: "Sites de stockage en Chine et au Bénin." },
      { slug: "goods-receipts", label: "Réceptions marchandises", description: "Enregistrer les quantités effectivement reçues." },
      { slug: "warehouse-inspections", label: "Inspections qualité", description: "Contrôler, documenter et statuer sur les lots." },
      { slug: "inbound-shipments", label: "Expéditions internationales", description: "Consolidation, départ, arrivée et douane." },
      { slug: "shipment-events", label: "Événements de suivi", description: "Publier les étapes visibles par les clients." },
    ],
  },
  customers: {
    title: "Centre clients et commandes",
    intro: "Accéder aux dossiers clients, commandes, paiements et demandes de devis.",
    links: [
      { slug: "customers", label: "Clients", description: "Comptes et coordonnées clients." },
      { slug: "orders", label: "Commandes clients", description: "Commandes, statut, soldes et livraison." },
      { slug: "sourcing-requests", label: "Demandes de devis", description: "Demandes de sourcing et réponses commerciales." },
      { slug: "payment-attempts", label: "Tentatives de paiement", description: "Vérifier les paiements et leur statut." },
      { slug: "order-payment-allocations", label: "Affectations de paiements", description: "Rattacher les paiements confirmés aux commandes." },
    ],
  },
  finance: {
    title: "Centre financier",
    intro: "Contrôler les encaissements confirmés, les sorties, les coûts affectés et les soldes clients.",
    links: [
      { slug: "cash-transactions", label: "Journal financier", description: "Enregistrer et consulter les mouvements de trésorerie." },
      { slug: "order-cost-allocations", label: "Coûts affectés aux commandes", description: "Affecter les coûts réels validés." },
      { slug: "order-payment-allocations", label: "Affectations de paiements", description: "Suivre la ventilation des encaissements." },
      { slug: "payment-attempts", label: "Paiements", description: "Contrôler les tentatives et confirmations." },
      { slug: "orders", label: "Commandes et soldes", description: "Vérifier les montants dus et payés." },
    ],
  },
};

const Panel = ({ panel }: { panel: (typeof panels)[string] }) => (
  <section className="twp space-y-5 rounded-xl border border-border bg-card p-5">
    <header>
      <h2 className="text-xl font-semibold">{panel.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{panel.intro}</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {panel.links.map((link) => (
        <a key={link.slug} href={`/admin/collections/${link.slug}`} className="rounded-lg border p-4 transition hover:border-payload-elevation-500 hover:bg-payload-elevation-50">
          <h3 className="font-semibold">{link.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
          <span className="mt-3 inline-block text-sm font-medium">Ouvrir →</span>
        </a>
      ))}
    </div>
  </section>
);

export const AdminViews = () => {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  let active: ReactNode = <Overview />;
  if (view && panels[view]) active = <Panel panel={panels[view]} />;
  return active;
};
