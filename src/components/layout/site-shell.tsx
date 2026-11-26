import { ProjectNavigation } from "@/components/project/project-navigation";
import { SITE } from "@/lib/site";

import { BackToTop } from "./back-to-top";
import { Footer } from "./footer";
import { Header } from "./header";
import { ScrollState } from "./scroll-state";

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
        <Header siteName={SITE.name} />
        <main id="content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>
      <BackToTop targetId="content" placement="site" />
      <ScrollState />
      <ProjectNavigation />
    </>
  );
}
