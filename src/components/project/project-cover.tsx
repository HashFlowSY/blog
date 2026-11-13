"use client";

import Image from "next/image";
import { useRef, useState } from "react";

interface ProjectCoverProps {
  src: string;
  title: string;
}

export function ProjectCover({ src, title }: ProjectCoverProps) {
  const preview = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const alt = `${title}项目界面预览`;

  return (
    <>
      <figure className="portfolio-case-cover">
        <button
          ref={trigger}
          type="button"
          className="case-cover-trigger"
          aria-haspopup="dialog"
          aria-label="查看项目大图"
          onClick={() => preview.current?.showModal()}
        >
          <span className="case-cover-image">
            <Image
              src={src}
              alt={alt}
              fill
              preload
              sizes="(max-width: 760px) 100vw, 48vw"
            />
          </span>
          <span className="case-cover-caption">
            查看项目大图 <span aria-hidden="true">↗</span>
          </span>
        </button>
      </figure>
      <dialog
        ref={preview}
        className="case-preview"
        aria-label={`${title}项目大图`}
        onClose={() => {
          setExpanded(false);
          trigger.current?.focus({ preventScroll: true });
        }}
      >
        <div className="case-preview-toolbar">
          <span>{title}</span>
          <div>
            <button
              type="button"
              className="case-preview-button"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "适应窗口" : "放大"}
            </button>
            <form method="dialog">
              <button className="case-preview-button" type="submit">
                关闭
              </button>
            </form>
          </div>
        </div>
        <div
          className="case-preview-viewport"
          role="region"
          aria-label="项目截图"
          tabIndex={expanded ? 0 : undefined}
        >
          <div className="case-preview-image" data-expanded={expanded}>
            <Image src={src} alt={alt} fill sizes="100vw" />
          </div>
        </div>
      </dialog>
    </>
  );
}
