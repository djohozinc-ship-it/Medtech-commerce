import { type Order } from "@/payload-types";

import type { FieldHook } from "payload";

export const restoreStocks: FieldHook<Order, Order["orderDetails"]["status"] | undefined> = async ({
  operation,
  value,
  originalDoc,
  req,
}) => {
  if (
    operation !== "update" ||
    !originalDoc ||
    !value ||
    value !== "cancelled" ||
    !originalDoc.products ||
    originalDoc.orderDetails?.status === "cancelled" ||
    !originalDoc.extractedFromStock
  ) return value;

  const payload = req.payload;
  const updates: Promise<unknown>[] = [];

  try {
    for (const product of originalDoc.products) {
      const relation = product.product;
      const productId = typeof relation === "string" || typeof relation === "number"
        ? relation
        : relation && typeof relation === "object" && "id" in relation
          ? relation.id
          : undefined;
      if (!productId || typeof product.quantity !== "number" || product.quantity <= 0) continue;

      try {
        const originalProduct = await payload.findByID({
          collection: "products",
          id: productId,
        });

        if (!originalProduct) {
          console.error(`Product not found: ${productId}`);
          continue;
        }

        const productWithUpdatedStock = {
          ...originalProduct,
          ...(!originalProduct.enableVariants && {
            stock: (originalProduct.stock ?? 0) + product.quantity,
          }),
          ...(originalProduct.enableVariants && {
            variants: originalProduct.variants?.map((variant) => {
              if (variant.variantSlug === product.variantSlug) {
                return {
                  ...variant,
                  stock: (variant.stock ?? 0) + product.quantity,
                };
              }
              return variant;
            }),
          }),
        };

        updates.push(
          payload.update({
            collection: "products",
            id: productId,
            data: productWithUpdatedStock,
          }),
        );
      } catch (error) {
        console.error(`Failed to process product ${productId}:`, error);
      }
    }

    await Promise.all(updates);
    await payload.update({
      collection: "orders",
      id: originalDoc.id,
      data: {
        extractedFromStock: false,
      },
    });
  } catch (error) {
    console.error("Failed to restore stocks:", error);
  }
  return value;
};
