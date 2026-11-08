import { memo } from "react";
import { preload } from "react-dom";

import { assetPath } from "@/lib/site";

import { pencilEase, pencilPasses, strokeFraction } from "./pencil-plan";

import type { WorkbenchPart } from "./pencil-plan";

const parts: readonly WorkbenchPart[] = ["tools", "foundation", "surface"];

function BrushPass({
  pass,
  progress,
  color,
  id,
}: {
  pass: (typeof pencilPasses)[number];
  progress: number;
  color: "white" | "black";
  id: string;
}) {
  return (
    <g clipPath={`url(#${id}-${pass.id}-clip)`}>
      {pass.strokes.map((stroke) => {
        const fraction = strokeFraction(progress, stroke);
        return (
          <use
            key={stroke.id}
            href={`#${id}-${stroke.id}`}
            stroke={color}
            strokeWidth={stroke.kind === "hatch" ? 9 : 15}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1"
            strokeDashoffset={1 - fraction}
            opacity={fraction > 0 ? 1 : 0}
          />
        );
      })}
    </g>
  );
}

export const WorkbenchReveal = memo(function WorkbenchReveal({
  progress,
  id,
}: {
  progress: number;
  id: string;
}) {
  for (const part of parts)
    preload(assetPath(`/assets/workbench-${part}.webp`), {
      as: "image",
      type: "image/webp",
    });
  // A final soft pass only restores the faint paper/shadow outside the object masks.
  const paperFinish = pencilEase((progress - 99.75) / 0.25);

  return (
    <>
      <defs>
        {pencilPasses.map((pass) => (
          <g key={pass.id}>
            {pass.strokes.map((stroke) => (
              <path
                key={stroke.id}
                id={`${id}-${stroke.id}`}
                d={stroke.path}
                pathLength="1"
                data-pencil-path={stroke.id}
              />
            ))}
            <clipPath
              id={`${id}-${pass.id}-clip`}
              clipPathUnits="userSpaceOnUse"
            >
              <path
                d={pass.clip}
                clipRule={pass.shape ? "nonzero" : "evenodd"}
                fillRule={pass.shape ? "nonzero" : "evenodd"}
              />
            </clipPath>
          </g>
        ))}
        <mask
          id={`${id}-remaining`}
          x="0"
          y="0"
          width="1536"
          height="1024"
          maskUnits="userSpaceOnUse"
          style={{ maskType: "luminance" }}
        >
          <rect width="1536" height="1024" fill="white" />
          {pencilPasses.map((pass) => (
            <BrushPass
              key={pass.id}
              pass={pass}
              progress={progress}
              color="black"
              id={id}
            />
          ))}
          <rect width="1536" height="1024" fill="black" opacity={paperFinish} />
        </mask>
        {parts.map((part) => (
          <mask
            id={`${id}-${part}-ink`}
            key={part}
            x="0"
            y="0"
            width="1536"
            height="1024"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "luminance" }}
          >
            {pencilPasses
              .filter((pass) => pass.part === part)
              .map((pass) => (
                <BrushPass
                  key={pass.id}
                  pass={pass}
                  progress={progress}
                  color="white"
                  id={id}
                />
              ))}
            <rect
              width="1536"
              height="1024"
              fill="white"
              opacity={paperFinish}
            />
          </mask>
        ))}
      </defs>
      <g
        data-construction-layer="finish"
        style={{ opacity: progress > 82 ? 1 : 0 }}
        aria-hidden="true"
      >
        {parts.map((part) => (
          <image
            key={part}
            href={assetPath(`/assets/workbench-${part}.webp`)}
            width="1536"
            height="1024"
            mask={`url(#${id}-${part}-ink)`}
          />
        ))}
      </g>
    </>
  );
});
