import { type Access, type CollectionConfig } from "payload";

const customersOnly: Access = ({ req }) => req.user?.collection === "customers";
const administratorsOnly: Access = ({ req }) => req.user?.collection === "administrators";
const reviewOwnerOrAdministrator: Access = ({ req }) => {
  if (req.user?.collection === "administrators") return true;
  if (req.user?.collection === "customers") {
    return { author: { equals: req.user.id } };
  }
  return false;
};

export const ProductReviews: CollectionConfig = {
  slug: "productReviews",
  access: {
    read: () => true,
    create: customersOnly,
    update: reviewOwnerOrAdministrator,
    delete: reviewOwnerOrAdministrator,
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === "create" && req.user?.collection === "customers") {
          return { ...data, author: req.user.id };
        }
        return data;
      },
    ],
  },
  admin: {
    group: {
      en: "Products",
      pl: "Produkty",
    },
  },
  labels: {
    singular: {
      en: "Product Review",
      pl: "Opinia o produkcie",
    },
    plural: {
      en: "Product Reviews",
      pl: "Opinie o produktach",
    },
  },
  fields: [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      required: true,
    },
    {
      name: "author",
      type: "relationship",
      relationTo: "customers",
      required: true,
      access: {
        update: administratorsOnly,
      },
    },
    {
      name: "rating",
      label: {
        pl: "Ocena",
        en: "Rating",
      },
      type: "number",
      required: true,
      max: 5,
      min: 1,
    },
    {
      name: "review",
      label: {
        pl: "Treść de l'avis",
        en: "Review content",
      },
      type: "richText",
    },
  ],
};
