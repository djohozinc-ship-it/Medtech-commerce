import { getPayload } from "payload";

import { type Country } from "@/globals/(ecommerce)/Couriers/utils/countryList";
import { type Locale } from "@/i18n/config";
import { getFilledProducts } from "@/lib/getFilledProducts";
import { getTotal } from "@/lib/getTotal";
import { getTotalWeight } from "@/lib/getTotalWeight";
import { getAutopayPaymentURL } from "@/lib/paywalls/getAutopayPaymentURL";
import { getP24PaymentURL } from "@/lib/paywalls/getP24PaymentURL";
import { getStripePaymentURL } from "@/lib/paywalls/getStripePaymentURL";
import { type CheckoutFormData } from "@/schemas/checkoutForm.schema";
import { type Cart } from "@/stores/CartStore/types";
import { type Currency } from "@/stores/Currency/types";
import { getCustomer } from "@/utilities/getCustomer";
import { getCachedGlobal } from "@/utilities/getGlobals";
import config from "@payload-config";

const createCouriers = async (locale: Locale) => {
  const couriersModule = await import("@/globals/(ecommerce)/Couriers/utils/couriersConfig");
  return couriersModule.createCouriers(locale);
};

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config });
    const {
      cart,
      selectedCountry,
      checkoutData,
      locale,
      currency,
    }: {
      cart: Cart | undefined;
      selectedCountry: Country;
      locale: Locale;
      checkoutData: CheckoutFormData;
      currency: Currency;
    } = (await req.json()) as {
      cart: Cart | undefined;
      selectedCountry: Country;
      locale: Locale;
      checkoutData: CheckoutFormData;
      currency: Currency;
    };
    if (checkoutData?.shipping?.country !== selectedCountry) {
      return Response.json({ status: 400, message: "Le pays de livraison sélectionné ne correspond pas aux coordonnées de livraison." });
    }
    if (!["fr", "en", "pl"].includes(locale)) {
      return Response.json({ status: 400, message: "Langue de commande invalide." });
    }
    if (!Array.isArray(cart) || cart.length === 0 || cart.length > 50) {
      return Response.json({ status: 400, message: "Panier invalide ou trop volumineux." });
    }
    const seenItems = new Set<string>();
    for (const item of cart) {
      if (!item || typeof item.id !== "string" || !item.id.trim() ||
          !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 ||
          (item.choosenVariantSlug !== undefined && typeof item.choosenVariantSlug !== "string")) {
        return Response.json({ status: 400, message: "Article ou quantité invalide dans le panier." });
      }
      const key = `${item.id}:${item.choosenVariantSlug ?? ""}`;
      if (seenItems.has(key)) {
        return Response.json({ status: 400, message: "Un même article/variant ne doit pas apparaître plusieurs fois." });
      }
      seenItems.add(key);
    }

    const { docs: products } = await payload.find({
      collection: "products",
      where: {
        id: {
          in: cart.map((product) => product.id),
        },
      },
      locale,
      select: {
        title: true,
        price: true,
        images: true,
        variants: true,
        enableVariants: true,
        enableVariantPrices: true,
        colors: true,
        slug: true,
        stock: true,
        sizes: true,
        weight: true,
        pricing: true,
      },
    });

    if (products.length !== new Set(cart.map((item) => item.id)).size) {
      return Response.json({ status: 400, message: "Un ou plusieurs produits ne sont plus disponibles." });
    }

    const filledProducts = getFilledProducts(products, cart);
    if (filledProducts.length !== cart.length) {
      return Response.json({ status: 400, message: "Un variant demandé n'existe plus." });
    }

    for (const product of filledProducts) {
      const quantity = product.quantity ?? 0;
      const stock = product.enableVariants && product.variant
        ? product.variant.stock
        : product.stock;
      if (typeof stock === "number" && quantity > stock) {
        return Response.json({ status: 409, message: `Stock insuffisant pour ${product.title}.` });
      }
      const selectedPrices = product.enableVariants && product.enableVariantPrices && product.variant
        ? product.variant.pricing
        : product.pricing;
      const price = selectedPrices?.find((entry) => entry.currency === currency)?.value;
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
        return Response.json({ status: 400, message: `Prix indisponible dans la devise choisie pour ${product.title}.` });
      }
    }

    const total = getTotal(filledProducts);
    const totalWeight = getTotalWeight(filledProducts, cart);
    const couriers = await createCouriers(locale);

    const courier = couriers.find((courier) => courier?.key === checkoutData.deliveryMethod);
    if (!courier) {
      return Response.json({ status: 400, message: "Courier not found" });
    }
    const courierData = await courier.getSettings();
    const shippingCost = courierData.deliveryZones
      ?.find((zone) => zone.countries.includes(selectedCountry))
      ?.range?.find((range) => range.weightFrom <= totalWeight && range.weightTo >= totalWeight)
      ?.pricing.find((pricing) => pricing.currency === currency)?.value;

    if (typeof shippingCost !== "number" || !Number.isFinite(shippingCost) || shippingCost < 0) {
      return Response.json({ status: 400, message: "Shipping cost not found" });
    }

    const paywalls = await getCachedGlobal("paywalls", locale, 1)();

    let redirectURL: string | null = null;

    const user = await getCustomer();

    const order = await payload.create({
      collection: "orders",
      overrideAccess: true,
      data: {
        customer: user?.id,
        extractedFromStock: true,
        products: filledProducts.map((product) => ({
          id: product.id,
          product: product.id,
          productName: product.title,
          quantity: product.quantity ?? 0,
          isFromAPI: true,
          hasVariant: product.enableVariants && product.variant ? true : false,
          variantSlug: product.variant?.variantSlug ?? undefined,
          color: product.variant?.color?.slug ?? undefined,
          size: product.variant?.size?.slug ?? undefined,
          price:
            product.variant?.pricing && product.enableVariantPrices
              ? (product.variant.pricing.find((price) => price.currency === currency)?.value ?? 0)
              : (product.pricing?.find((price) => price.currency === currency)?.value ?? 0),
          priceTotal:
            (product.variant?.pricing && product.enableVariantPrices
              ? (product.variant.pricing.find((price) => price.currency === currency)?.value ?? 0)
              : (product.pricing?.find((price) => price.currency === currency)?.value ?? 0)) *
            (product?.quantity ?? 0),
        })),
        date: new Date().toISOString(),
        invoice: {
          address:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.address
              : checkoutData.shipping.address,
          city:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.city
              : checkoutData.shipping.city,
          country:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.country
              : checkoutData.shipping.country,
          isCompany: checkoutData.buyerType === "company",
          name:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.name
              : checkoutData.shipping.name,
          postalCode:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.postalCode
              : checkoutData.shipping.postalCode,
          region:
            checkoutData.individualInvoice && checkoutData.invoice
              ? checkoutData.invoice.region
              : checkoutData.shipping.region,
          tin: checkoutData.buyerType === "company" ? checkoutData.invoice?.tin : undefined,
        },
        orderDetails: {
          shipping: courier.key,
          shippingCost,
          status: "pending",
          total: total.find((price) => price.currency === currency)?.value ?? 0,
          totalWithShipping: (total.find((price) => price.currency === currency)?.value ?? 0) + shippingCost,
          currency: currency,
        },
        shippingAddress: {
          name: checkoutData.shipping.name,
          address: checkoutData.shipping.address,
          city: checkoutData.shipping.city,
          country: checkoutData.shipping.country as Country,
          region: checkoutData.shipping.region,
          postalCode: checkoutData.shipping.postalCode,
          email: checkoutData.shipping.email,
          phone: checkoutData.shipping.phone,
          pickupPointAddress: checkoutData.shipping.pickupPointAddress,
          pickupPointID: checkoutData.shipping.pickupPointID,
        },
        printLabel: {
          weight: totalWeight / 1000,
        },
      },
    });

    await Promise.all(filledProducts.map(async (product) => {
      const newBoughtCount = (product.bought ?? 0) + (product.quantity ?? 0);
      if (product.enableVariants && product.variant && product.variants) {
        const variant = product.variant;
        if (typeof variant.stock === "number") {
          const newStock = variant.stock - (product.quantity ?? 0);
          await payload.update({
            collection: "products",
            id: product.id,
            data: {
              variants: product.variants.map((v) =>
                v.variantSlug === variant.variantSlug ? { ...v, stock: newStock } : v,
              ),
              bought: newBoughtCount,
            },
          });
        }
      } else if (typeof product.stock === "number") {
        const newStock = product.stock - (product.quantity ?? 0);
        await payload.update({
          collection: "products",
          id: product.id,
          data: { stock: newStock, bought: newBoughtCount },
        });
      }
    }));

    if (user) {
      void payload.update({
        collection: "customers",
        id: user.id,
        data: {
          lastBuyerType: checkoutData.buyerType as "individual" | "company",
        },
      });
    }

    if (courier.prepaid === false) {
      return Response.json({
        status: 200,
        url: `${process.env.NEXT_PUBLIC_SERVER_URL}/${locale}/order/${order.id}`,
      });
    }

    const totalWithShipping = (total.find((price) => price.currency === currency)?.value ?? 0) + shippingCost;

    console.log(paywalls.paywall);

    try {
      switch (paywalls.paywall) {
        case "stripe":
          redirectURL = await getStripePaymentURL({
            filledProducts,
            shippingCost,
            shippingLabel: courierData.settings.label,
            currency,
            locale,
            apiKey: paywalls?.stripe?.secret ?? "",
            orderID: order.id,
          });
          break;

        case "autopay":
          redirectURL = await getAutopayPaymentURL({
            total: totalWithShipping,
            autopay: paywalls?.autopay,
            orderID: order.id,
            currency,
            customerEmail: checkoutData.shipping.email,
          });
          break;
        case "p24":
          redirectURL = await getP24PaymentURL({
            secretId: paywalls.p24?.secretId ?? "",
            posId: Number(paywalls.p24?.posId ?? 0),
            crc: paywalls.p24?.crc ?? "",
            endpoint: paywalls.p24?.endpoint ?? "",
            sessionId: order.id,
            amount: totalWithShipping,
            currency,
            description: `${locale} - ${order.id}`,
            email: order.shippingAddress.email,
            locale,
            client: user,
          });
          break;

        default:
          break;
      }
    } catch (error) {
      console.log(error);
      return Response.json({ status: 500, message: "Error while creating payment" });
    }

    return Response.json({ status: 200, url: redirectURL });
  } catch (error) {
    console.log(error);
    return Response.json({ status: 500, message: "Internal server error" });
  }
}
