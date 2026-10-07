import { Announcement } from "./announcement";
import { CatalogueProvider } from "./catalogue-provider";
import { StoreProvider } from "./store";
import { StructuredData } from "./structured-data";
import { getSite, getStorefront } from "@/lib/data";
import { absolute } from "@/lib/seo";
export async function StorefrontLayout({children}:{children:React.ReactNode}){
  return <>
    <StructuredData data={{"@context":"https://schema.org","@type":"Organization",name:getSite().name,url:absolute(),logo:absolute("/brand/bl_withBg.png"),description:"Kashmiri-inspired shawls, phirans, suits and stoles."}}/>
    <CatalogueProvider data={await getStorefront()}><Announcement/><StoreProvider>{children}</StoreProvider></CatalogueProvider>
    <noscript><p className="no-js-note">JavaScript is needed for the bag and forms. You can still browse the collection.</p></noscript>
  </>;
}
