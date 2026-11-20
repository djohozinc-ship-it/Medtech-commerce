import { CustomerSourcingRequests } from "@/components/CustomerSourcingRequests";
import { getCustomer } from "@/utilities/getCustomer";

export const dynamic = "force-dynamic";

const CustomerSourcingPage = async () => {
  const customer = await getCustomer();
  if (!customer) return null;
  return <CustomerSourcingRequests />;
};

export default CustomerSourcingPage;
