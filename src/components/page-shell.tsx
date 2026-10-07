import { MobileMotion } from "./mobile-motion";
import { Header } from "./header";
import { Footer } from "./footer";
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <MobileMotion />
      <main id="main" className="page-main section-pad">
        {children}
      </main>
      <Footer />
    </>
  );
}
