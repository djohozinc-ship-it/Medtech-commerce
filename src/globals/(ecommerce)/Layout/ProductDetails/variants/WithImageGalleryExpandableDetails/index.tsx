import { Disclosure, DisclosureButton, DisclosurePanel, Tab, TabPanel } from "@headlessui/react";
import { StarIcon } from "@heroicons/react/20/solid";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { PriceClient } from "@/components/(ecommerce)/PriceClient";
import { Media } from "@/components/Media";
import RichText from "@/components/RichText";
import { type Media as MediaDocument, type Product, type ShopLayout } from "@/payload-types";
import { type Currency } from "@/stores/Currency/types";
import { cn } from "@/utilities/cn";

import { ProductForm } from "./components/ProductForm";
import { ProductGallery } from "./components/ProductGallery";

import { type FilledVariant } from "../../types";

type MedtechProduct = Product & {
  commercialType?: string | null;
  salesMode?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  modelReference?: string | null;
  originCountry?: string | null;
  warrantyMonths?: number | null;
  leadTimeDays?: number | null;
  availabilityMode?: string | null;
  technicalSpecifications?: string | null;
  technicalSpecs?: { id?: string | null; label: string; value: string }[] | null;
  regulatoryDocuments?: (string | TechnicalDocument)[] | null;
};

const hasValue = (value: string | number | null | undefined): value is string | number =>
  value !== null && value !== undefined && String(value).trim() !== "";

const TechnicalSheet = ({ product }: { product: MedtechProduct }) => {
  const t = useTranslations("ProductDetails");
  const rows = ([
    [t("manufacturer"), product.manufacturer],
    [t("brand"), product.brand],
    [t("model-reference"), product.modelReference],
    [t("origin-country"), product.originCountry],
    [t("warranty"), hasValue(product.warrantyMonths) ? `${product.warrantyMonths} ${t("month-unit")}` : null],
    [t("lead-time"), hasValue(product.leadTimeDays) ? `${product.leadTimeDays} ${t("day-unit")}` : null],
    [t("availability"), product.availabilityMode === "in_stock" ? t("in-stock-confirm") : product.availabilityMode === "on_order" ? t("on-order") : product.availabilityMode === "to_confirm" ? t("to-confirm") : null],
  ] as [string, string | number | null | undefined][]).reduce<[string, string | number][]>((result, [label, value]) => {
    if (hasValue(value)) result.push([label, value]);
    return result;
  }, []);

  const documents = (product.regulatoryDocuments ?? []).filter(
    (document): document is MediaDocument =>
      typeof document !== "string" && Boolean(document.url),
  );

  if (!rows.length && !product.technicalSpecifications && !product.technicalSpecs?.length && !documents.length) {
    return null;
  }

  return (
    <section className="mt-10 rounded-xl border border-gray-200 p-5" aria-labelledby="technical-sheet-title">
      <h2 id="technical-sheet-title" className="text-xl font-semibold text-gray-900">{t("technical-sheet")}</h2>
      {rows.length > 0 && (
        <dl className="mt-4 divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
              <dt className="text-sm font-medium text-gray-600">{label}</dt>
              <dd className="text-sm text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {product.technicalSpecs && product.technicalSpecs.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900">{t("detailed-specs")}</h3>
          <dl className="mt-2 divide-y divide-gray-100">
            {product.technicalSpecs.map((spec, index) => (
              <div key={spec.id ?? `${spec.label}-${index}`} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-2">
                <dt className="text-sm font-medium text-gray-600">{spec.label}</dt>
                <dd className="text-sm text-gray-900">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {product.technicalSpecifications && (
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900">{t("technical-notes")}</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">{product.technicalSpecifications}</p>
        </div>
      )}
      {documents.length > 0 && (
        <div className="mt-5">
          <h3 className="font-semibold text-gray-900">{t("documents-available")}</h3>
          <ul className="mt-2 space-y-2">
            {documents.map((document, index) => (
              <li key={document.id ?? document.url ?? index}>
                <a
                  href={document.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-main-700 underline underline-offset-2"
                >
                  {document.alt || document.filename || `${t("document-label")} ${index + 1}`}
                </a>
                {document.mimeType === "application/pdf" && <span className="ml-2 text-xs text-gray-500">PDF</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-5 text-xs leading-5 text-gray-500">
        {t("verification-note")}
      </p>
    </section>
  );
};

export const WithImageGalleryExpandableDetails = ({
  variant,
  product,
  productSettings,
}: {
  variant?: string;
  product: Product;
  productSettings: ShopLayout["productDetails"];
}) => {
  const medtechProduct = product as MedtechProduct;
  const filledVariants: FilledVariant[] | undefined = product.variants?.map((variant) => ({
    color: product.colors?.find((color) => {
      return color.slug === variant.color;
    }),
    size: product.sizes?.find((size) => size.slug === variant.size),
    slug: variant.variantSlug,
    stock: variant.stock,
    image: typeof variant.image !== "string" ? variant.image : null,
    pricing: variant.pricing as
      | { value: number; currency: Currency; id?: string | null }[]
      | null
      | undefined,
  }));

  const selectedVariant =
    filledVariants?.find((filledVariant) => filledVariant.slug === variant) ?? filledVariants?.find((variant) => variant.stock > 0) ?? filledVariants?.[0];

  const maxQuantity = selectedVariant?.stock ?? product.stock ?? 999;
  const minQuantity = 1;

  const t = useTranslations("ProductDetails");

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          {/* Image gallery */}

          <ProductGallery
            product={product}
            selectedVariant={selectedVariant}
            minQuantity={minQuantity}
            maxQuantity={maxQuantity}
            tabs={product.images.map(
              (image) =>
                typeof image !== "string" && (
                  <TabPanel key={image.id}>
                    <Media
                      placeholder="empty"
                      resource={image}
                      className="aspect-square w-full object-cover sm:rounded-lg"
                    />
                  </TabPanel>
                ),
            )}
          >
            {product.images.map(
              (image) =>
                typeof image !== "string" && (
                  <Tab
                    key={image.id}
                    className="focus:ring-3 focus:outline-hidden focus:ring-main-500/50 group relative flex aspect-square cursor-pointer items-center justify-center rounded-md bg-white text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 focus:ring-offset-4"
                  >
                    <span className="sr-only">{image.alt}</span>
                    <span className="absolute inset-0 overflow-hidden rounded-md">
                      <Media resource={image} className="size-full object-cover" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-transparent ring-offset-2 group-data-selected:ring-main-500"
                    />
                  </Tab>
                ),
            )}
          </ProductGallery>

          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.title}</h1>

            {medtechProduct.salesMode !== "quote" && (
              <div className="mt-3">
                <h2 className="sr-only">{t("product-info")}</h2>
                <p className="text-3xl tracking-tight text-gray-900">
                  <PriceClient
                    pricing={
                      (product.enableVariants &&
                      product.enableVariantPrices &&
                      product.variants &&
                      selectedVariant
                        ? selectedVariant.pricing
                        : product.pricing) ?? []
                    }
                  />
                </p>
              </div>
            )}

            {productSettings.reviewsEnabled && (
              <>
                <div className="mt-3">
                  <h3 className="sr-only">{t("reviews")}</h3>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      {[0, 1, 2, 3, 4].map((rating) => (
                        <StarIcon
                          key={rating}
                          aria-hidden="true"
                          className={cn(
                            // product.rating > rating ? "text-main-500" : "text-gray-300",
                            "text-main-500", // temporary
                            "size-5 shrink-0",
                          )}
                        />
                      ))}
                    </div>
                    <p className="sr-only">{/* {product.rating} - temporary disabled*/}5 out of 5 stars</p>
                  </div>
                </div>
              </>
            )}

            {product.description && (
              <div className="mt-6">
                <h3 className="sr-only">{t("description")}</h3>

                <RichText className="space-y-6 text-base text-gray-700" data={product.description} />
              </div>
            )}

            <TechnicalSheet product={medtechProduct} />

            <ProductForm
              product={product}
              minQuantity={minQuantity}
              maxQuantity={maxQuantity}
              selectedVariant={selectedVariant}
              filledVariants={filledVariants}
            />

            <section aria-labelledby="details-heading" className="mt-12">
              <h2 id="details-heading" className="sr-only">
                {t("additional-details")}
              </h2>

              <div className="divide-gray-360 divide-y border-t">
                {product.details?.map((detail) => (
                  <Disclosure key={detail.id} as="div">
                    <h3>
                      <DisclosureButton className="group relative flex w-full items-center justify-between py-6 text-left">
                        <span className="text-sm font-medium text-gray-900 group-data-open:text-main-600">
                          {detail.title}
                        </span>
                        <span className="ml-6 flex items-center">
                          <PlusIcon
                            aria-hidden="true"
                            className="block size-6 text-gray-400 group-hover:text-gray-500 group-data-open:hidden"
                          />
                          <MinusIcon
                            aria-hidden="true"
                            className="hidden size-6 text-main-400 group-hover:text-main-500 group-data-open:block"
                          />
                        </span>
                      </DisclosureButton>
                    </h3>
                    <DisclosurePanel className="pb-6">
                      <RichText
                        className="list-disc space-y-1 pl-5 text-sm/6 text-gray-700 marker:text-gray-300"
                        data={detail.content}
                      />
                    </DisclosurePanel>
                  </Disclosure>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
