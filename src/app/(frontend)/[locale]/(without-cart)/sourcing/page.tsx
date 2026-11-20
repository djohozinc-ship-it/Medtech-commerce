import { SourcingRequestForm } from "@/components/SourcingRequestForm";

export const metadata = {
  title: "Demander un approvisionnement | Medtech Commerce",
  description: "Demandez un devis pour un équipement biomédical ou un produit à approvisionner depuis l'étranger vers le Bénin.",
};

export default function SourcingPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">Approvisionnement sur demande</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu recherches un équipement précis ?</h1>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Décris le produit, joins une photo ou une fiche technique et indique la quantité souhaitée.
          Notre équipe pourra étudier la demande et préparer un devis pour une livraison au Bénin.
        </p>
      </div>
      <SourcingRequestForm />
    </main>
  );
}
