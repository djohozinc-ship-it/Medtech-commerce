"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const MAX_FILES = 4;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

type FormState = "idle" | "uploading" | "sending" | "success" | "error";
type ApiResponse = {
  doc?: { id?: string | number; requestReference?: string };
  errors?: { message?: string }[];
};

const formString = (data: FormData, name: string): string => {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
};

const apiError = (result: ApiResponse, fallback: string): string =>
  result.errors?.find((entry) => typeof entry.message === "string")?.message ?? fallback;

export function SourcingRequestForm() {
  const searchParams = useSearchParams();
  const requestedProduct = searchParams.get("product") ?? "";
  const requestedQuantity = searchParams.get("quantity") ?? "1";
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);

    const productName = formString(data, "productName").trim();
    const specifications = formString(data, "specifications").trim();
    const customerName = formString(data, "customerName").trim();
    const customerEmail = formString(data, "customerEmail").trim();
    const customerPhone = formString(data, "customerPhone").trim();
    const quantity = Number(data.get("quantity"));
    const destinationCity = formString(data, "destinationCity").trim();

    if (!productName || !specifications || !customerName || !customerEmail || !customerPhone || !destinationCity || !Number.isInteger(quantity) || quantity < 1) {
      setState("error");
      setMessage("Vérifie les champs obligatoires avant l'envoi.");
      return;
    }
    if (files.length > MAX_FILES || files.some((file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE)) {
      setState("error");
      setMessage("Maximum 4 fichiers JPG, PNG, WEBP ou PDF de 10 Mo chacun.");
      return;
    }

    try {
      const attachmentIds: { file: string; description: string }[] = [];
      if (files.length) {
        setState("uploading");
        for (const file of files) {
          const upload = new FormData();
          upload.append("file", file);
          upload.append("_payload", JSON.stringify({ description: file.name }));
          const uploadResponse = await fetch("/api/sourcing-attachments", {
            method: "POST",
            body: upload,
          });
          const uploadResult = await uploadResponse.json() as ApiResponse;
          if (!uploadResponse.ok || !uploadResult.doc?.id) {
            throw new Error(apiError(uploadResult, "Un fichier n'a pas pu être envoyé."));
          }
          attachmentIds.push({ file: String(uploadResult.doc.id), description: file.name });
        }
      }

      setState("sending");
      const budgetRaw = formString(data, "budgetAmount").trim();
      const requestBody = {
        customerName,
        customerEmail: customerEmail.toLowerCase(),
        customerPhone,
        productName,
        brand: formString(data, "brand"),
        model: formString(data, "model"),
        specifications,
        referenceUrl: formString(data, "referenceUrl"),
        quantity,
        destinationCity,
        budgetAmount: budgetRaw ? Number(budgetRaw) : undefined,
        budgetCurrency: formString(data, "budgetCurrency") || "XOF",
        attachments: attachmentIds,
      };

      const response = await fetch("/api/sourcing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const result = await response.json() as ApiResponse;
      if (!response.ok || !result.doc?.id) {
        throw new Error(apiError(result, "La demande n'a pas pu être enregistrée."));
      }
      setState("success");
      const reference = result.doc.requestReference ? ` Référence : ${result.doc.requestReference}.` : "";
      setMessage(`Ta demande a bien été transmise.${reference} Pour suivre le devis, crée un compte ou connecte-toi avec cette même adresse e-mail.`);
      form.reset();
      setFiles([]);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Une erreur est survenue. Réessaie plus tard.");
    }
  }

  const busy = state === "uploading" || state === "sending";

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl space-y-8">
      <section className="space-y-4 rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-semibold">Le produit recherché</h2>
        <label className="block text-sm font-medium">Nom du produit *
          <input name="productName" required defaultValue={requestedProduct} maxLength={180} className="mt-1 w-full rounded-lg border p-3" placeholder="Ex. : moniteur multiparamétrique" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Marque souhaitée
            <input name="brand" maxLength={120} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-medium">Modèle / référence
            <input name="model" maxLength={120} className="mt-1 w-full rounded-lg border p-3" />
          </label>
        </div>
        <label className="block text-sm font-medium">Description et caractéristiques techniques *
          <textarea name="specifications" required minLength={10} maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border p-3" placeholder="Précise les caractéristiques, l'usage prévu, les accessoires ou normes nécessaires..." />
        </label>
        <label className="block text-sm font-medium">Lien vers une fiche produit (facultatif)
          <input name="referenceUrl" type="url" maxLength={1000} className="mt-1 w-full rounded-lg border p-3" placeholder="https://..." />
        </label>
        <div>
          <label className="block text-sm font-medium">Photos ou fiche technique (facultatif)</label>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="mt-2 block w-full text-sm"
            onChange={(event) => {
              const selected = Array.from(event.target.files || []);
              setFiles(selected.slice(0, MAX_FILES));
              if (selected.length > MAX_FILES) setMessage("Seuls les 4 premiers fichiers ont été retenus.");
            }}
          />
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP ou PDF · 4 fichiers maximum · 10 Mo par fichier.</p>
          {files.length > 0 && <ul className="mt-2 list-inside list-disc text-sm">{files.map((file) => <li key={file.name}>{file.name}</li>)}</ul>}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-semibold">Quantité et destination</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Quantité souhaitée *
            <input name="quantity" type="number" min="1" step="1" defaultValue={requestedQuantity} required className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-medium">Ville de livraison au Bénin *
            <input name="destinationCity" required defaultValue="Cotonou" maxLength={120} className="mt-1 w-full rounded-lg border p-3" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Budget indicatif (facultatif)
            <input name="budgetAmount" type="number" min="0" step="any" className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-medium">Devise
            <select name="budgetCurrency" defaultValue="XOF" className="mt-1 w-full rounded-lg border p-3">
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="USD">Dollar américain (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="CNY">Yuan chinois (CNY)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 p-5">
        <h2 className="text-xl font-semibold">Tes coordonnées</h2>
        <label className="block text-sm font-medium">Nom complet *
          <input name="customerName" required maxLength={160} className="mt-1 w-full rounded-lg border p-3" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Adresse e-mail *
            <input name="customerEmail" type="email" required maxLength={160} className="mt-1 w-full rounded-lg border p-3" />
          </label>
          <label className="block text-sm font-medium">Téléphone / WhatsApp *
            <input name="customerPhone" type="tel" required maxLength={40} placeholder="+229 ..." className="mt-1 w-full rounded-lg border p-3" />
          </label>
        </div>
      </section>

      {message && <p role="status" aria-live="polite" className={state === "error" ? "rounded-lg bg-red-50 p-3 text-sm text-red-800" : "rounded-lg bg-green-50 p-3 text-sm text-green-800"}>{message}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-slate-900 px-6 py-4 font-semibold text-white disabled:opacity-60">
        {state === "uploading" ? "Envoi des fichiers..." : state === "sending" ? "Enregistrement de la demande..." : "Envoyer ma demande"}
      </button>
      <p className="text-xs text-gray-500">En envoyant ce formulaire, tu autorises l'équipe à utiliser ces informations pour traiter ta demande.</p>
    </form>
  );
}
