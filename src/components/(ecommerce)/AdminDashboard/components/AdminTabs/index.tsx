"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const dashboardTabs = [
  { value: "overview", label: "Vue d'ensemble" },
  { value: "procurement", label: "Approvisionnement" },
  { value: "logistics", label: "Logistique" },
  { value: "customers", label: "Clients & commandes" },
  { value: "finance", label: "Finances" },
];

export const AdminTabs = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = dashboardTabs.some((tab) => tab.value === searchParams.get("view"))
    ? searchParams.get("view")!
    : "overview";

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={active} onValueChange={handleValueChange}>
      <TabsList className="flex h-fit flex-wrap justify-start gap-1 bg-payload-elevation-50 p-1.5">
        {dashboardTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg px-3 py-2 text-sm">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
