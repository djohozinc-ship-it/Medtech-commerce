import { CustomerSourcingRequests } from "@/components/CustomerSourcingRequests";
import { type Locale } from "@/i18n/config";
import { redirect } from "@/i18n/routing";
import { getCustomer } from "@/utilities/getCustomer";

export const dynamic = "force-dynamic";

const CustomerSourcingPage = async ({ params }: { params: Promise<{ locale: Locale }> }) => {
  const customer = await getCustomer();
  const { locale } = await params;
  if (!customer) return redirect({ locale, href: "/login" });
  return <CustomerSourcingRequests />;
};

export default CustomerSourcingPage;
