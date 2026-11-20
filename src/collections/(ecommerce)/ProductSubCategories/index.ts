import { type CollectionConfig } from "payload";

import { anyone } from "@/access/anyone";
import { authenticated } from "@/access/authenticated";

import { slugField } from "@/fields/slug";

export const ProductSubCategories: CollectionConfig = {
  slug: "productSubCategories",
  access: {
    create: authenticated,
    read: anyone,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: "title",
    group: {
      en: "Products",
      pl: "Produkty",
    },
  },
  labels: {
    singular: {
      en: "Product Subcategory",
      fr: "Sous-catégorie de produits",
      pl: "Podkategoria produktu",
    },
    plural: {
      en: "Product Subcategories",
      fr: "Sous-catégories de produits",
      pl: "Podkategorie produktów",
    },
  },
  fields: [
    {
      name: "category",
      type: "relationship",
      relationTo: "productCategories",
      label: {
        en: "Parent category",
        pl: "Kategoria nadrzędna",
      },
      required: true,
    },
    {
      name: "title",
      label: {
        en: "Subcategory name",
        pl: "Nazwa podkategorii",
      },
      type: "text",
      required: true,
      localized: true,
    },
    ...slugField(),
    {
      name: "products",
      label: {
        en: "Products in this category",
        pl: "Produkty w tej kategorii",
      },
      type: "join",
      collection: "products",
      on: "categoriesArr.subcategories",
    },
  ],
};
