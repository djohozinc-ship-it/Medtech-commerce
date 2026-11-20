import { setRequestLocale } from "next-intl/server";

import { type Locale } from "@/i18n/config";
import { Link } from "@/i18n/routing";
import { type Customer } from "@/payload-types";
import { getCustomer } from "@/utilities/getCustomer";

export const dynamic = "force-dynamic";

const cards = [
  { href: "/account/orders", title: "Mes commandes", description: "Consulter les commandes, paiements, soldes et le suivi de livraison.", icon: "📦" },
  { href: "/account/sourcing", title: "Mes demandes de sourcing", description: "Suivre les recherches de produits, consulter les devis et les accepter ou refuser.", icon: "🔎" },
  { href: "/account/orders-data", title: "Mes informations", description: "Gérer les coordonnées et informations de compte utilisées pour les commandes.", icon: "👤" },
  { href: "/account/settings", title: "Sécurité et profil", description: "Modifier vos informations de profil et votre mot de passe.", icon: "⚙️" },
  { href: "/account/help", title: "Assistance", description: "Obtenir de l'aide sur vos achats, demandes ou livraisons.", icon: "💬" },
] as const;

const Page = async ({ params }: { params: Promise<{ locale: Locale }> }) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const customer = await getCustomer() as Customer | null;
  const firstName = customer?.firstName?.trim();

  return (
    <section className="mx-auto w-full max-w-5xl space-y-8">
      <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
        <p className="text-sm text-slate-300">Espace client</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{firstName ? `Bonjour ${firstName}` : "Bienvenue dans votre compte"}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-200">Retrouvez vos commandes, les devis de sourcing, vos informations et le suivi de vos colis depuis un seul espace.</p>
        <Link href="/account/orders" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">Voir mes commandes</Link>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{card.icon}</span>
              <h2 className="font-semibold text-gray-900">{card.title}</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">{card.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-slate-800 group-hover:underline">Accéder →</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Page;
