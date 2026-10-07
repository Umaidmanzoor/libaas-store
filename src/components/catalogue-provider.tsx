"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { catalogueAccess, type CatalogueSnapshot } from "@/lib/catalogue";
const Context = createContext<ReturnType<typeof catalogueAccess> | null>(null);
export function CatalogueProvider({ data, children }: { data: CatalogueSnapshot; children: ReactNode }) {
  const value = useMemo(() => catalogueAccess(data), [data]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCatalogue() {
  const value = useContext(Context);
  if (!value) throw new Error("Catalogue provider missing");
  return value;
}
