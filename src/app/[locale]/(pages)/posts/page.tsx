import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getAllPostsMeta, getAllTags } from "@/lib/posts";
import { PostListClient } from "./post-list-client";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "postPage" });
  return {
    title: t("title"),
    description: t("allPosts"),
  };
}

export default async function PostsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "postPage" });
  const posts = getAllPostsMeta();
  const tags = getAllTags();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold">{t("allPosts")}</h1>
      <PostListClient
        posts={posts}
        tags={tags}
        emptyText={t("empty")}
        updatedLabel={t("updatedAt")}
      />
    </div>
  );
}
