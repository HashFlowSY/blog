import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <span>
        {SITE.name} / {SITE.role}
      </span>
      <span>
        求职或合作 /{" "}
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
