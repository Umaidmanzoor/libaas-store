import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Libaas — A little of the valley, always.",
  "Explore Kashmiri-inspired shawls, phirans, suits and stoles. Clothing inspired by the valley’s textile traditions.",
  "/",
);
import Home from "@/components/home";
export default function Page() {
  return <Home />;
}
