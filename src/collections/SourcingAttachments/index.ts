import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { authenticated } from "@/access/authenticated";

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
    create: () => true,
    read: authenticated,
    update: authenticated,
    delete: authenticated,
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
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
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
