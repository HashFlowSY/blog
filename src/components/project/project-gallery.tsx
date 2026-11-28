"use client";

import Image from "next/image";
import { useState } from "react";

import { assetPath } from "@/lib/site";

import { ProjectCover } from "./project-cover";
import styles from "./project-gallery.module.css";

import type { ProjectScreenshot } from "@/lib/content-contracts";

interface Props {
  slug: string;
  title: string;
  cover: string;
  screenshots?: readonly ProjectScreenshot[] | undefined;
}

export function ProjectGallery({
  slug,
  title,
  cover,
  screenshots = [],
}: Props) {
  const [choice, setChoice] = useState<number | null>(null);
  const selected = choice ?? 0;
  const images = [
    { src: cover, label: "项目封面", caption: `${title} · 项目封面` },
    ...screenshots,
  ];
  const current = images[selected]!;
  const source = assetPath(current.src);

  return (
    <figure className={styles["gallery"]} aria-label="项目图片">
      <a
        className={styles["original"]}
        href={source}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`查看原图：${current.label}（新窗口）`}
      >
        <ProjectCover slug={slug} className={styles["cover"]}>
          <Image
            key={current.src}
            className={choice !== null ? styles["selectedImage"] : undefined}
            src={source}
            alt={selected === 0 ? `${title}界面预览` : current.caption}
            fill
            preload={selected === 0}
            sizes="(max-width: 650px) 100vw, 47vw"
          />
        </ProjectCover>
        <span aria-hidden="true" className={styles["open"]}>
          查看原图 ↗
        </span>
      </a>
      <figcaption>
        <span aria-live="polite">{current.caption}</span>
        {screenshots.length > 0 && (
          <div
            className={styles["choices"]}
            role="group"
            aria-label="选择项目图片"
          >
            {images.map((image, index) => (
              <a
                key={image.src + index}
                href={assetPath(image.src)}
                aria-current={index === selected ? "true" : undefined}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.altKey ||
                    event.shiftKey ||
                    event.button !== 0
                  )
                    return;
                  event.preventDefault();
                  if (index !== selected) setChoice(index);
                }}
              >
                <Image
                  src={assetPath(image.src)}
                  width={52}
                  height={32}
                  alt=""
                />
                {image.label}
              </a>
            ))}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
