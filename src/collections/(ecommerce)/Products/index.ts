import { type CollectionConfig } from "payload";

import { anyone } from "@/access/anyone";
import { authenticated } from "@/access/authenticated";
// import { authenticatedOrPublished } from "@/access/authenticatedOrPublished";
import { currencyField } from "@/fields/currencyField";
import { defaultLexical } from "@/fields/defaultLexical";
import { slugField } from "@/fields/slug";
import { generatePreviewPath } from "@/utilities/generatePreviewPath";

export const Products: CollectionConfig = {
  slug: "products",
  labels: {
    singular: {
      en: "Product",
      pl: "Produkt",
    },
    plural: {
      en: "Products list",
      pl: "Lista Produktów",
    },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    // read: authenticatedOrPublished,
    read: anyone,
    update: authenticated,
  },
  admin: {
    defaultColumns: ["title"],
    useAsTitle: "title",
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          path: `/product/${typeof data?.slug === "string" ? data.slug : ""}`,
          locale: req.locale,
        });
        return `${process.env.NEXT_PUBLIC_SERVER_URL}${path}`;
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        path: `/product/${typeof data?.slug === "string" ? data.slug : ""}`,
        locale: req.locale,
      }),
    group: {
      en: "Products",
      pl: "Produkty",
    },
  },
  fields: [
    {
      name: "title",
      label: {
        en: "Product name",
        pl: "Nazwa produktu",
      },
      type: "text",
      localized: true,
      required: true,
    },
    ...slugField(),
    {
      type: "tabs",
      tabs: [
        {
          label: {
            en: "Content",
            pl: "Zawartość",
          },
          fields: [
            {
              name: "description",
              label: {
                en: "Product description",
                pl: "Opis produktu",
              },
              localized: true,
              type: "richText",
              editor: defaultLexical,
            },
            {
              name: "images",
              label: {
                en: "Product images",
                pl: "Zdjęcia produktu",
              },
              type: "upload",
              relationTo: "media",
              hasMany: true,
              maxRows: 10,
              minRows: 1,
              required: true,
              admin: {
                description: {
                  en: "If you have variants, first image will be variant image.",
                  pl: "Jeśli masz warianty, pierwsze zdjęcie będzie zdjęciem wariantu.",
                },
              },
            },
            {
              name: "details",
              type: "array",
              label: {
                en: "Details",
                pl: "Szczegóły",
              },
              labels: {
                singular: {
                  en: "Detail",
                  pl: "Szczegół",
                },
                plural: {
                  en: "Details",
                  pl: "Szczegóły",
                },
              },
              admin: {
                components: {
                  RowLabel: "@/collections/(ecommerce)/Products/components/RowLabels/DetailLabel#DetailLabel",
                },
              },
              fields: [
                {
                  name: "title",
                  label: {
                    en: "Title",
                    pl: "Tytuł",
                  },
                  localized: true,
                  type: "text",
                  required: true,
                },
                {
                  name: "content",
                  label: {
                    en: "Content",
                    pl: "Zawartość",
                  },
                  localized: true,
                  required: true,
                  type: "richText",
                  editor: defaultLexical,
                },
              ],
            },
          ],
        },
        {
          label: {
            en: "Variants options",
            pl: "Opcje wariantów",
          },
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "enableVariants",
                  label: {
                    en: "Enable variants",
                    pl: "Włącz warianty",
                  },
                  type: "checkbox",
                  admin: {
                    width: "fit-content",
                  },
                },
                {
                  name: "enableVariantPrices",
                  label: {
                    en: "Variants have different prices",
                    pl: "Warianty mają różne ceny",
                  },

                  type: "checkbox",
                  admin: {
                    description: {
                      en: "If false, price is in Product Details",
                      pl: "Jeśli fałsz, cena jest w Szczegółach produktu",
                    },
                    width: "fit-content",
                    style: {
                      marginLeft: "2rem",
                    },
                  },
                },
                {
                  name: "enableVariantWeights",
                  label: {
                    en: "Variants have different weights",
                    pl: "Warianty mają różne wagi",
                  },

                  type: "checkbox",
                  admin: {
                    description: {
                      en: "If false, weight is in Product Details",
                      pl: "Jeśli fałsz, waga jest w Szczegółach produktu",
                    },
                    width: "fit-content",
                    style: {
                      marginLeft: "2rem",
                    },
                  },
                },
              ],
            },
            {
              type: "radio",
              name: "variantsType",
              label: {
                en: "Variants type",
                pl: "Rodzaj wariantów",
              },
              admin: {
                condition: (data) => Boolean(data.enableVariants),
              },
              defaultValue: "sizes",
              options: [
                {
                  value: "sizes",
                  label: {
                    en: "Only sizes",
                    pl: "Tylko rozmiary",
                  },
                },
                {
                  value: "colors",
                  label: {
                    en: "Only colors",
                    pl: "Tylko kolory",
                  },
                },
                {
                  value: "colorsAndSizes",
                  label: {
                    en: "Colors and sizes",
                    pl: "Kolory i rozmiary",
                  },
                },
              ],
            },
            {
              name: "colors",
              labels: {
                singular: {
                  en: "Color",
                  pl: "Kolor",
                },
                plural: {
                  en: "Colors",
                  pl: "Kolory",
                },
              },
              type: "array",
              admin: {
                components: {
                  RowLabel: "@/collections/(ecommerce)/Products/components/RowLabels/OptionLabel#OptionLabel",
                },
                condition: (_, siblingData) =>
                  Boolean(siblingData.enableVariants && siblingData.variantsType !== "sizes"),
                initCollapsed: true,
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "label",
                      label: {
                        en: "Color name",
                        pl: "Nazwa koloru",
                      },
                      type: "text",
                      localized: true,
                      required: true,
                    },
                    {
                      name: "slug",
                      type: "text",
                      required: true,
                      label: {
                        en: "Color slug",
                        pl: "Slug koloru",
                      },
                    },
                  ],
                },
                {
                  name: "colorValue",
                  label: {
                    en: "Color",
                    pl: "Kolor",
                  },
                  type: "text",
                  admin: {
                    components: {
                      Field: "@/components/AdminColorPicker#AdminColorPicker",
                    },
                  },
                },
              ],
              label: {
                en: "Color options",
                pl: "Opcje kolorów",
              },
              minRows: 1,
            },
            {
              name: "sizes",
              labels: {
                singular: {
                  en: "Size",
                  pl: "Rozmiar",
                },
                plural: {
                  en: "Sizes",
                  pl: "Rozmiary",
                },
              },
              type: "array",
              admin: {
                components: {
                  RowLabel: "@/collections/(ecommerce)/Products/components/RowLabels/OptionLabel#OptionLabel",
                },
                condition: (_, siblingData) =>
                  Boolean(siblingData.enableVariants && siblingData.variantsType !== "colors"),
                initCollapsed: true,
              },
              fields: [
                {
                  name: "label",
                  label: {
                    en: "Size label",
                    pl: "Etykieta rozmiaru",
                  },
                  type: "text",
                  localized: true,
                  required: true,
                },
                {
                  name: "slug",
                  type: "text",
                  required: true,
                  label: {
                    en: "Size slug",
                    pl: "Slug rozmiaru",
                  },
                },
              ],
              label: {
                en: "Size options",
                pl: "Opcje rozmiarów",
              },
              minRows: 1,
            },
            {
              name: "variants",
              type: "array",
              admin: {
                components: {
                  RowLabel:
                    "@/collections/(ecommerce)/Products/components/RowLabels/VariantLabel#VariantLabel",
                },
                condition: (_, siblingData) => {
                  return Boolean(siblingData.enableVariants);
                },
              },
              validate: (value) => {
                if (!value) return true;
                // eslint-disable-next-line
                const groupedByVariantSlug = value.reduce((acc: Record<string, any[]>, item: any) => {
                  // eslint-disable-next-line
                  if (!acc[item.variantSlug]) {
                    // eslint-disable-next-line
                    acc[item.variantSlug] = [];
                  }
                  // eslint-disable-next-line
                  acc[item.variantSlug].push(item);
                  return acc;
                  // eslint-disable-next-line
                }, {}) as any[];

                const duplicateSlugs = Object.keys(groupedByVariantSlug).filter(
                  // eslint-disable-next-line
                  (slug) => groupedByVariantSlug[slug].length > 1,
                );
                if (duplicateSlugs.length > 0) {
                  return `Duplicated variant slugs: ${duplicateSlugs.join(", ")}`;
                }
                return true;
              },
              fields: [
                {
                  type: "row",
                  admin: {
                    className: "variant-gap-row",
                  },
                  fields: [
                    {
                      name: "size",
                      type: "text",
                      index: true,
                      label: {
                        en: "Size",
                        pl: "Rozmiar",
                      },
                      admin: {
                        components: {
                          Field: "@/collections/(ecommerce)/Products/components/SizeSelect#SizeSelect",
                        },
                        condition: (_, siblingData) => siblingData.variantsType !== "colors",
                      },
                    },
                    {
                      name: "color",
                      index: true,
                      type: "text",
                      label: {
                        en: "Color",
                        pl: "Kolor",
                      },
                      admin: {
                        components: {
                          Field: "@/collections/(ecommerce)/Products/components/ColorSelect#ColorSelect",
                        },
                        condition: (_, siblingData) => siblingData.variantsType !== "sizes",
                      },
                    },
                  ],
                },
                {
                  name: "variantSlug",
                  type: "text",
                  admin: {
                    readOnly: true,
                  },
                },
                {
                  name: "image",
                  type: "upload",
                  relationTo: "media",
                },
                {
                  name: "stock",
                  type: "number",
                  admin: {
                    description: {
                      en: "Define stock for this variant. A stock of 0 disables checkout for this variant.",
                      pl: "Zdefiniuj stan magazynowy dla tego wariantu. Stan magazynowy 0 wyłącza możliwość zakupu tego wariantu.",
                    },
                  },
                  defaultValue: 0,
                  required: true,
                },
                {
                  name: "weight",
                  label: {
                    en: "Weight (g)",
                    pl: "Waga (g)",
                  },
                  type: "number",
                  admin: {
                    condition: (data) => Boolean(data.enableVariantWeights),
                    description: {
                      en: "Define weight for this variant.",
                      pl: "Zdefiniuj wagę dla tego wariantu.",
                    },
                  },
                  defaultValue: 0,
                  required: true,
                },
                {
                  name: "pricing",
                  type: "array",
                  label: {
                    en: "Pricing",
                    pl: "Cennik",
                  },
                  minRows: 1,
                  required: true,
                  labels: {
                    singular: {
                      en: "Price",
                      pl: "Cena",
                    },
                    plural: {
                      en: "Prices",
                      pl: "Ceny",
                    },
                  },
                  admin: {
                    condition: (data) => Boolean(data.enableVariantPrices),
                    components: {
                      RowLabel: "@/components/(ecommerce)/RowLabels/PriceRowLabel#PriceRowLabel",
                    },
                  },
                  fields: [
                    {
                      type: "row",
                      fields: [
                        {
                          name: "value",
                          index: true,
                          type: "number",
                          label: {
                            en: "Price",
                            pl: "Cena",
                          },
                          required: true,
                        },
                        currencyField,
                      ],
                    },
                  ],
                },
              ],
              minRows: 1,
            },
          ],
        },
        {
          label: {
            en: "Product details",
            pl: "Szczegóły produktu",
          },
          admin: {
            // todo: not working condition, waiting for payload team to fix conditional tabs.
            // condition: (data) => {
            //   return !data.enableVariants && !data.enableVariantPrices;
            // },
          },
          fields: [
            {
              name: "commercialType",
              type: "select",
              label: { en: "Commercial category", fr: "Type commercial", pl: "Typ handlowy" },
              defaultValue: "equipment",
              required: true,
              options: [
                { label: { en: "Biomedical equipment", fr: "Équipement biomédical", pl: "Sprzęt biomedyczny" }, value: "equipment" },
                { label: { en: "Spare part / accessory", fr: "Pièce détachée / accessoire", pl: "Część / akcesorium" }, value: "spare_part" },
                { label: { en: "Maintenance tool", fr: "Outil de maintenance", pl: "Narzędzie serwisowe" }, value: "maintenance_tool" },
                { label: { en: "Technology / electronics", fr: "Technologie / électronique", pl: "Technologia / elektronika" }, value: "technology" },
                { label: { en: "Other product", fr: "Autre produit", pl: "Inny produkt" }, value: "other" },
              ],
            },
            {
              name: "salesMode",
              type: "select",
              label: { en: "Sales mode", fr: "Mode de commercialisation", pl: "Tryb sprzedaży" },
              defaultValue: "direct",
              required: true,
              options: [
                { label: { en: "Direct order", fr: "Commande directe", pl: "Zamówienie bezpośrednie" }, value: "direct" },
                { label: { en: "Quote / sourcing request", fr: "Sur devis / approvisionnement", pl: "Na zapytanie / sourcing" }, value: "quote" },
              ],
              admin: { description: { en: "Use quote mode when availability or landed price must be confirmed with a supplier.", fr: "Choisir le devis lorsque la disponibilité ou le coût rendu doit être confirmé auprès du fournisseur.", pl: "Wybierz wycenę, gdy dostępność lub koszt dostawy wymaga potwierdzenia u dostawcy." } },
            },
            {
              type: "row",
              fields: [
                { name: "manufacturer", type: "text", label: { en: "Manufacturer", fr: "Fabricant", pl: "Producent" } },
                { name: "brand", type: "text", label: { en: "Brand", fr: "Marque", pl: "Marka" } },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "modelReference", type: "text", label: { en: "Model / reference", fr: "Modèle / référence", pl: "Model / referencja" } },
                { name: "originCountry", type: "text", label: { en: "Country of origin", fr: "Pays d'origine", pl: "Kraj pochodzenia" }, defaultValue: "China" },
              ],
            },
            {
              type: "row",
              fields: [
                { name: "warrantyMonths", type: "number", min: 0, label: { en: "Warranty (months)", fr: "Garantie (mois)", pl: "Gwarancja (miesiące)" } },
                { name: "leadTimeDays", type: "number", min: 0, label: { en: "Estimated sourcing lead time (days)", fr: "Délai d'approvisionnement estimé (jours)", pl: "Szacowany czas dostawy (dni)" } },
              ],
            },
            {
              name: "availabilityMode",
              type: "select",
              label: { en: "Availability", fr: "Disponibilité", pl: "Dostępność" },
              defaultValue: "on_order",
              required: true,
              options: [
                { label: { en: "Available in stock", fr: "Disponible en stock", pl: "Dostępny w magazynie" }, value: "in_stock" },
                { label: { en: "Available on order", fr: "Disponible sur commande", pl: "Dostępny na zamówienie" }, value: "on_order" },
                { label: { en: "Availability to confirm", fr: "Disponibilité à confirmer", pl: "Dostępność do potwierdzenia" }, value: "to_confirm" },
              ],
            },
            {
              name: "technicalSpecifications",
              type: "textarea",
              label: { en: "Technical specifications / compatibility", fr: "Caractéristiques techniques / compatibilité", pl: "Specyfikacja techniczna / kompatybilność" },
            },
            {
              name: "regulatoryDocuments",
              type: "relationship",
              relationTo: "media",
              hasMany: true,
              label: { en: "Technical and regulatory documents", fr: "Documents techniques et réglementaires", pl: "Dokumenty techniczne i regulacyjne" },
              admin: { description: { en: "Attach only documents actually supplied and checked; never imply certification without evidence.", fr: "Joindre uniquement les documents réellement reçus et vérifiés ; ne jamais déclarer une certification sans justificatif.", pl: "Dołączaj wyłącznie otrzymane i sprawdzone dokumenty; nie deklaruj certyfikacji bez dowodu." } },
            },
            {
              name: "categoriesArr",
              label: {
                en: "Product categories",
                pl: "Kategorie produktu",
              },
              labels: {
                singular: {
                  en: "Category",
                  pl: "Kategoria",
                },
                plural: {
                  en: "Categories",
                  pl: "Kategorie",
                },
              },
              type: "array",
              fields: [
                {
                  name: "category",
                  label: {
                    en: "Category",
                    pl: "Kategoria",
                  },
                  type: "relationship",
                  index: true,
                  relationTo: "productCategories",
                  required: true,
                },
                {
                  name: "subcategories",
                  index: true,
                  type: "relationship",
                  label: {
                    en: "Subcategories",
                    pl: "Podkategorie",
                  },
                  relationTo: "productSubCategories",
                  filterOptions: ({ siblingData }) => {
                    // eslint-disable-next-line
                    const siblingDataTyped: {
                      category: string;
                      // eslint-disable-next-line
                    } = siblingData as any;
                    return {
                      category: {
                        equals: siblingDataTyped.category,
                      },
                    };
                  },
                  hasMany: true,
                },
              ],
            },
            {
              name: "stock",
              label: {
                en: "Stock",
                pl: "Stan magazynowy",
              },
              type: "number",
              admin: {
                condition: (data) => !data.enableVariants,
                description: {
                  en: "Define stock for whole product. A stock of 0 disables checkout for this product.",
                  pl: "Zdefiniuj stan magazynowy dla całego produktu. Stan magazynowy 0 wyłącza możliwość zakupu tego produktu.",
                },
              },
              defaultValue: 0,
              required: true,
            },
            {
              name: "weight",
              label: {
                en: "Weight (g)",
                pl: "Waga (g)",
              },
              type: "number",
              admin: {
                condition: (data) => !data.enableVariantWeights,
                description: {
                  en: "Define weight for whole product.",
                  pl: "Zdefiniuj wagę dla całego produktu.",
                },
              },
              defaultValue: 0,
              required: true,
            },
            {
              name: "pricing",
              type: "array",
              label: {
                en: "Pricing",
                pl: "Cennik",
              },
              minRows: 1,
              required: true,
              labels: {
                singular: {
                  en: "Price",
                  pl: "Cena",
                },
                plural: {
                  en: "Prices",
                  pl: "Ceny",
                },
              },
              admin: {
                condition: (data) => !data.enableVariantPrices,
                components: {
                  RowLabel: "@/components/(ecommerce)/RowLabels/PriceRowLabel#PriceRowLabel",
                },
              },
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "value",
                      type: "number",
                      index: true,
                      label: {
                        en: "Price",
                        pl: "Cena",
                      },
                      required: true,
                    },
                    currencyField,
                  ],
                },
              ],
            },
            {
              name: "bought",
              index: true,
              label: {
                en: "Bought",
                pl: "Kupiono",
              },
              type: "number",
              defaultValue: 0,
            },
          ],
        },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
};
