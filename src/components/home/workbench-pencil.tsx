import { useLayoutEffect, useRef } from "react";
import { preload } from "react-dom";

import { assetPath } from "@/lib/site";

import styles from "./assembly-workbench.module.css";
import { pencilLength, pencilPosition } from "./pencil-route";

import type { PencilPoint } from "./pencil-plan";

export function WorkbenchPencil({ progress }: { progress: number }) {
  const cursor = useRef<SVGGElement>(null);
  const barrel = useRef<SVGGElement>(null);
  const contact = useRef<SVGEllipseElement>(null);
  const paths = useRef(
    new Map<string, { path: SVGPathElement; length: number }>(),
  );
  const source = assetPath("/assets/drawing-pencil.webp");
  const length = pencilLength(progress);
  // Crop the shaft without scaling the artwork or moving the contact point.
  // Once the shaft is gone, consume the tail and finally the wood/graphite tip.
  const capWidth = Math.min(9, Math.max(0, length - 28));
  const bodyEnd = length - capWidth;
  const bodyWidth = 13.006 + bodyEnd;
  preload(source, { as: "image", type: "image/webp" });

  useLayoutEffect(() => {
    const element = cursor.current;
    if (!element) return;
    function sample(
      stroke: { id: string; path: string },
      fraction: number,
    ): PencilPoint {
      let metric = paths.current.get(stroke.id);
      if (!metric) {
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );
        path.setAttribute("d", stroke.path);
        // JSDOM has no SVG geometry. The real geometry is checked in E2E.
        if (typeof path.getTotalLength !== "function") return [0, 0];
        metric = { path, length: path.getTotalLength() };
        paths.current.set(stroke.id, metric);
      }
      const point = metric.path.getPointAtLength(metric.length * fraction);
      return [point.x, point.y];
    }
    const pose = pencilPosition(progress, sample);
    element.setAttribute("opacity", pose ? String(pose.opacity) : "0");
    element.setAttribute("visibility", pose ? "visible" : "hidden");
    if (!pose) return;
    element.setAttribute("transform", `translate(${pose.x} ${pose.y})`);
    element.setAttribute("data-stroke", pose.stroke);
    element.setAttribute("data-phase", pose.phase);
    element.setAttribute("data-fraction", String(pose.fraction));
    barrel.current?.setAttribute("transform", `rotate(${pose.angle})`);
    contact.current?.setAttribute("opacity", String((1 - pose.lift) * 0.16));
  }, [progress]);

  return (
    <g
      ref={cursor}
      className={styles["pencil"]}
      data-construction-layer="pencil"
      data-pencil-length={length}
      aria-hidden="true"
      visibility="hidden"
      opacity="0"
    >
      <ellipse
        ref={contact}
        cx="0"
        cy="2"
        rx={Math.min(8, length)}
        ry="2.5"
        fill="#514a3d"
      />
      <g ref={barrel}>
        <svg
          x="-13.006"
          y="-42.012"
          width={bodyWidth}
          height="83.333"
          viewBox={`0 0 ${bodyWidth} 83.333`}
          style={{ overflow: "hidden" }}
          data-pencil-body="true"
        >
          <image href={source} width="250" height="83.333" />
        </svg>
        <svg
          x={bodyEnd}
          y="-42.012"
          width={capWidth}
          height="83.333"
          viewBox={`228.006 0 ${Math.max(0.001, capWidth)} 83.333`}
          style={{ overflow: "hidden" }}
          data-pencil-cap="true"
        >
          <image href={source} width="250" height="83.333" />
        </svg>
      </g>
    </g>
  );
}
