import Link from "next/link";

import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <Link className="footer-name" href="/">
        {SITE.name}
        <span aria-hidden="true">.</span>
      </Link>
      <span className="footer-contact">
        求职或合作
        <a
          href={SITE.githubProfile.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {SITE.githubProfile.label}
        </a>
      </span>
    </footer>
  );
}
