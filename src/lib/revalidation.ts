import "server-only";
import { revalidatePath } from "next/cache";
// Internal helper only: future admin actions must requireAdmin before calling.
export function revalidateStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
}
