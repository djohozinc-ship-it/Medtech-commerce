import { getPayload } from "payload";

import { type Locale } from "@/i18n/config";
import { type Order } from "@/payload-types";
import config from "@/payload.config";

export const getOrderProducts = async (orderProducts: Order["products"] | null, locale: Locale) => {
  try {
    const payload = await getPayload({ config });
    console.log(orderProducts);
    return (
      orderProducts &&
      (await Promise.all(
        orderProducts.map(async (product) => {
          const productId =
            typeof product.product === "string"
              ? product.product
              : typeof product.product === "object" && product.product
                ? product.product.id
                : undefined;

          // Sourcing quotes can create an order for an item not yet present in
          // the public catalogue. Keep its commercial snapshot visible.
          if (!productId) {
            return {
              ...product,
              title: product.productName ?? "Produit sur devis",
              slug: "",
              images: [],
              variants: [],
              colors: [],
              sizes: [],
              description: null,
            };
          }

          const filledProduct = await payload.findByID({
            collection: "products",
            id: productId,
            locale,
          });
          return {
            ...product,
            ...filledProduct,
          };
        }),
      ))
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};
