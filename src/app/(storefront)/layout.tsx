import { StorefrontLayout } from "@/components/storefront-layout";
export const revalidate=60;
export default function Layout({children}:{children:React.ReactNode}){return <StorefrontLayout>{children}</StorefrontLayout>}
