import { SITE } from "@/lib/site";

import { BackToTop } from "./back-to-top";
import { Footer } from "./footer";
import { Header } from "./header";
import { RouteState } from "./route-state";

interface SiteShellProps {
  children: React.ReactNode;
}

export function SiteShell({ children }: SiteShellProps) {
  return (
    <>
      <a className="skip-link" href="#content">
        跳到内容
      </a>
      <div className="site-frame">
        <Header siteName={SITE.name} siteRole={SITE.role} />
        <main id="content">{children}</main>
        <Footer />
      </div>
      <BackToTop />
      <RouteState />
    </>
  );
}
