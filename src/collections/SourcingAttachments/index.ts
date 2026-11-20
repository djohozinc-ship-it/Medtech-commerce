import path from "path";
import { fileURLToPath } from "url";

import { authenticated } from "@/access/authenticated";

import type { CollectionConfig } from "payload";


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Fichiers transmis avec une demande de sourcing.
 * Le dossier est hors de public/ et la lecture est réservée à l'administration.
 */
export const SourcingAttachments: CollectionConfig = {
  slug: "sourcing-attachments",
  labels: {
    singular: "Pièce jointe de demande",
    plural: "Pièces jointes de demandes",
  },
  access: {
    create: ({ req }) => req.user?.collection === "customers" || req.user?.collection === "administrators",
    read: ({ req }) => req.user?.collection === "administrators",
    update: ({ req }) => req.user?.collection === "administrators",
    delete: ({ req }) => req.user?.collection === "administrators",
  },
  admin: {
    useAsTitle: "filename",
    group: "Approvisionnement",
    description: "Photos et fiches techniques envoyées par les clients.",
  },
  upload: {
    staticDir: path.resolve(dirname, "../../../uploads/sourcing"),
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ],
  },
  fields: [
    {
      name: "description",
      type: "text",
      label: "Description du fichier",
    },
  ],
  timestamps: true,
};
