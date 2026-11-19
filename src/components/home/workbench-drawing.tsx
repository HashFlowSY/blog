import { Fragment, memo, useEffect, useId, useRef } from "react";

import styles from "./assembly-workbench.module.css";
import {
  artworkSettledAt,
  drawingObjects,
  drawingTime,
  pencilEase,
} from "./pencil-plan";
import {
  workbenchChairBackground,
  workbenchDrawingArt,
  workbenchSheet,
  workbenchSurfaceArt,
  workbenchTextureArt,
} from "./workbench-art";
import {
  drawingMarks,
  drawingParts,
  pegboardHoleRows,
  sharedReferenceEdges,
  tableCastShadow,
  toolRegions,
  workbenchStructure,
  yellowDrawer,
} from "./workbench-geometry";
import { hatchingPath, planHatching } from "./workbench-hatching";
import { WorkbenchPencil } from "./workbench-pencil";

import type { WorkbenchSurfaceLayer } from "./workbench-art";
import type { DrawingMark } from "./workbench-geometry";
import type { ReactNode } from "react";

const { width, height, top, sceneHeight } = workbenchSheet;
const viewBox = `0 ${top} ${width} ${sceneHeight}`;
const paperColor = "#fbf4e9";
const drawer = { x: 998, y: 552, width: 156, height: 106 };
const chairStart = drawingObjects.find(({ id }) => id === "chair")!.start;
const chairBackground = workbenchChairBackground.box;
const outsideChairBackground = `M0 0H${width}V${height}H0Z M${chairBackground.x} ${chairBackground.y}h${chairBackground.width}v${chairBackground.height}h${-chairBackground.width}Z`;

function contactWindow(marks: readonly DrawingMark[]) {
  return { marks, start: marks[0]!.fromMs, end: marks.at(-1)!.toMs };
}

const referenceAreas = drawingParts.flatMap(
  ({ id, object, clip, bounds, marks, strokeWidth }) =>
    clip && bounds && strokeWidth !== undefined
      ? [
          {
            id,
            object,
            clip,
            bounds,
            strokeWidth,
            ...contactWindow(
              marks.filter(
                ({ layer }) => layer === "reference" || layer === "yellow",
              ),
            ),
          },
        ]
      : [],
);
const backdropForeground = referenceAreas.filter(
  ({ id }) => id !== "table-cast-shadow",
);
const partsDrawnLeftToRight = new Set(["books", "shelf-boxes", "display"]);
const referenceParts = referenceAreas.map((part, index) => {
  const [left, top, right, bottom] = part.bounds;
  const overlaps = ({
    bounds: [x1, y1, x2, y2],
  }: (typeof referenceAreas)[number]) =>
    left < x2 && right > x1 && top < y2 && bottom > y1;
  return {
    ...part,
    toolNeighbors:
      part.object === "tools"
        ? referenceAreas.filter(
            (other) =>
              other.object === "tools" &&
              other.id !== part.id &&
              overlaps(other),
          )
        : [],
    blockedBy: referenceAreas.slice(index + 1).filter((later) => {
      // Earlier marks sample the chair-free background in this area.
      if (later.object === "chair") return false;
      if (
        later.object === part.object &&
        !partsDrawnLeftToRight.has(part.object)
      )
        return false;
      return overlaps(later);
    }),
  };
});
const surfaceTextures = workbenchTextureArt.map(
  ({ id, src, owner, parts }) => ({
    id,
    src,
    owner,
    structure: contactWindow(
      drawingMarks.filter(
        ({ layer, object }) => layer === "surface" && object === owner,
      ),
    ),
    ...contactWindow(
      drawingMarks.filter(({ part }) =>
        parts.some((surface) => surface === part),
      ),
    ),
  }),
);
const holes = contactWindow(
  drawingMarks.filter(({ layer }) => layer === "holes"),
);
const pigment = contactWindow(
  drawingMarks.filter(({ layer }) => layer === "yellow"),
);
const drawerGraphite = contactWindow(
  drawingMarks.filter(
    ({ part, layer }) => part === "drawers" && layer === "reference",
  ),
);
const backgroundMarks = drawingMarks.filter(
  ({ object }) => object === "background",
);
const backgroundReference = contactWindow(
  backgroundMarks.filter(({ layer }) => layer === "reference"),
);
const backgroundGuides = contactWindow(
  backgroundMarks.filter(({ layer }) => layer === "ink"),
);
const ink = contactWindow(
  drawingMarks.filter(
    ({ object, layer }) => object !== "background" && layer === "ink",
  ),
);
const hatching = new Map(
  drawingMarks.flatMap((mark) =>
    mark.kind === "stroke" && mark.hatching
      ? [[mark.id, planHatching(mark.path, mark.width)] as const]
      : [],
  ),
);

export type WorkbenchArtworkLayer = "rest" | "paper" | WorkbenchSurfaceLayer;
export type WorkbenchArtworkResult = "ready" | "failed";

type DecodableArtwork = SVGImageElement & { decode?: () => Promise<void> };

const ContactShape = memo(function ContactShape({
  mark,
  fraction,
  maskInk,
}: {
  mark: DrawingMark;
  fraction: number;
  maskInk?: "white" | "black" | undefined;
}) {
  const hatchId = useId();
  const color =
    maskInk ?? (mark.layer === "ink" ? (mark.color ?? "#7c705f") : "white");
  const attrs = maskInk
    ? {}
    : {
        "data-drawing-mark": mark.id,
        "data-mark-kind": mark.kind,
        "data-mark-object": mark.object,
        "data-mark-part": mark.part,
      };

  if (mark.kind === "point") {
    return (
      <circle
        {...attrs}
        cx={mark.point[0]}
        cy={mark.point[1]}
        r={mark.width / 2}
        fill={color}
        data-pencil-point={maskInk ? undefined : mark.id}
        opacity={mark.opacity * fraction}
      />
    );
  }

  // By the end of the mark the overlapping hatches already cover its stroke.
  const hatch = fraction < 1 ? hatching.get(mark.id) : undefined;
  const texture = hatch && mark.hatching === "texture";
  const centerline = (
    <path
      {...attrs}
      d={mark.path}
      data-pencil-path={maskInk ? undefined : mark.id}
      fill="none"
      opacity={mark.opacity}
      stroke={texture ? "none" : color}
      strokeWidth={mark.width}
      strokeLinejoin="round"
      strokeLinecap="round"
      pathLength="1"
      strokeDasharray="1 1"
      strokeDashoffset={1 - fraction}
      clipPath={hatch && !texture ? `url(#${hatchId})` : undefined}
    />
  );
  if (!hatch) return centerline;

  return (
    <>
      <clipPath id={hatchId} clipPathUnits="userSpaceOnUse">
        <path
          d={hatchingPath(hatch, fraction)}
          transform={`rotate(${hatch.angle})`}
        />
      </clipPath>
      {(!texture || !maskInk) && centerline}
      {texture && (
        <path
          d={mark.path}
          fill="none"
          opacity={mark.opacity}
          stroke={color}
          strokeWidth={mark.width}
          strokeLinecap="round"
          clipPath={`url(#${hatchId})`}
        />
      )}
    </>
  );
});

const Contacts = memo(function Contacts({
  marks,
  time,
  maskInk,
}: {
  marks: readonly DrawingMark[];
  time: number;
  maskInk?: "white" | "black";
}) {
  return (
    <>
      {marks.map((mark) => {
        if (time <= mark.fromMs) return null;
        const fraction = pencilEase(
          (time - mark.fromMs) / (mark.toMs - mark.fromMs),
        );
        return (
          <ContactShape
            key={mark.id}
            mark={mark}
            fraction={fraction}
            maskInk={maskInk}
          />
        );
      })}
    </>
  );
});

function DrawingMask({
  id,
  children,
  type = "alpha",
}: {
  id: string;
  children: ReactNode;
  type?: "alpha" | "luminance";
}) {
  return (
    <mask
      id={id}
      x="0"
      y="0"
      width={width}
      height={height}
      maskUnits="userSpaceOnUse"
      maskContentUnits="userSpaceOnUse"
      style={{ maskType: type }}
    >
      {children}
    </mask>
  );
}

const ReferenceStencil = memo(function ReferenceStencil({
  prefix,
  part,
}: {
  prefix: string;
  part: (typeof referenceParts)[number];
}) {
  const edges = sharedReferenceEdges[part.id];
  const edgeId = (later: string) => `${prefix}-overlap-${part.id}-${later}`;
  return (
    <>
      {edges &&
        Object.entries(edges).map(([later, outline]) => (
          <clipPath key={later} id={edgeId(later)}>
            <path d={outline} />
          </clipPath>
        ))}
      <DrawingMask id={`${prefix}-part-${part.id}`} type="luminance">
        <path
          d={part.clip}
          fill="white"
          stroke="white"
          strokeWidth={part.strokeWidth}
          strokeLinejoin="round"
        />
        <g fill="black" stroke="black" strokeLinejoin="round">
          {part.toolNeighbors.map((other) => (
            <path
              key={other.id}
              d={other.clip}
              clipPath={`url(#${prefix}-tool-${other.id})`}
              strokeWidth={8}
            />
          ))}
          {part.blockedBy.map((later) => (
            <path
              key={later.id}
              d={later.clip}
              clipPath={
                edges?.[later.id] ? `url(#${edgeId(later.id)})` : undefined
              }
              strokeWidth={Math.min(8, later.strokeWidth - 2)}
            />
          ))}
        </g>
      </DrawingMask>
    </>
  );
});

const BackdropOccluders = memo(function BackdropOccluders({
  prefix,
}: {
  prefix: string;
}) {
  return (
    <>
      <filter id={`${prefix}-shadow-edge`}>
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <clipPath id={`${prefix}-around-plant-guide`}>
        <path
          d={`M 0 0 H ${width} V ${height} H 0 Z M 802 82 H 812 V 95 H 802 Z M 806 109 H 809 V 117 H 806 Z`}
          clipRule="evenodd"
        />
      </clipPath>
      <path
        d={tableCastShadow}
        fill="black"
        stroke="black"
        strokeWidth="12"
        filter={`url(#${prefix}-shadow-edge)`}
      />
      <g fill="black" stroke="black" strokeLinejoin="round">
        {backdropForeground.map(({ id, clip, strokeWidth }) => (
          <path
            key={id}
            d={clip}
            strokeWidth={Math.min(8, strokeWidth - 2)}
            clipPath={
              id === "plant" ? `url(#${prefix}-around-plant-guide)` : undefined
            }
          />
        ))}
      </g>
    </>
  );
});

function WorkbenchSurface({
  owner,
  mask,
  prefix,
}: {
  owner: (typeof surfaceTextures)[number]["owner"];
  mask: string;
  prefix: string;
}) {
  const shapes = workbenchStructure;
  const hatching = `url(#${prefix}-graphite-hatching)`;
  return (
    <g
      data-workbench-surface={owner}
      mask={mask}
      stroke="#786c5c"
      strokeWidth="1.45"
      strokeOpacity=".73"
      strokeLinejoin="round"
    >
      {owner === "table" && (
        <>
          <g mask={`url(#${prefix}-recess-shade)`} stroke="none">
            <path d={shapes.tableRecess} fill="#99856e" />
            <path d={shapes.tableRecess} fill={hatching} />
          </g>
          <path d={shapes.cabinet} fill="#ebe3d6" />
          <path d={shapes.rearLeg} fill="#e5dacc" />
          <path d={shapes.lowerShelf} fill="#eee5d7" />
          <path d={shapes.lowerShelfEdge} fill="#e5dacc" />
          <path d={shapes.tabletop} fill={`url(#${prefix}-table-tone)`} />
          <path
            d={shapes.tabletopGrain}
            fill="none"
            stroke="#aa9a82"
            strokeWidth=".75"
            strokeOpacity=".3"
          />
        </>
      )}
      {owner === "pegboard" && (
        <>
          <path d={shapes.pegboard} fill={`url(#${prefix}-pegboard-tone)`} />
          <path d={shapes.pegboardPosts} fill="#e3dacb" />
          <path
            d="M 775 223 L 777 407 M 1211 227 L 1220 426 M 782 223 L 783 342"
            fill="none"
            stroke="#a89a84"
            strokeWidth=".9"
            strokeOpacity=".43"
          />
        </>
      )}
      {owner === "upper-shelf" && (
        <>
          <g mask={`url(#${prefix}-shelf-shade)`} stroke="none">
            <path d={shapes.shelfShadow} fill="#88745f" />
            <path d={shapes.shelfShadow} fill={hatching} />
          </g>
          <path d={shapes.upperShelf} fill="#e7dece" />
          <path
            d="M 738 210 L 1178 199 L 1224 207"
            fill="none"
            stroke="#a89a84"
            strokeWidth=".8"
          />
        </>
      )}
    </g>
  );
}

const HolePattern = memo(function HolePattern({ mask }: { mask: string }) {
  return (
    <g mask={mask} fill="#796e5d" opacity=".65">
      {pegboardHoleRows.flatMap((row, index) =>
        row.map(([x, y], column) => (
          <ellipse
            key={`${index}-${column}`}
            cx={x}
            cy={y}
            rx={1.22 + column * 0.012}
            ry={1.23}
          />
        )),
      )}
    </g>
  );
});

export function WorkbenchWaitingPaper() {
  return (
    <svg
      className={styles["drawing"]}
      data-workbench-waiting=""
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
    >
      <rect width={width} height={height} fill={paperColor} />
    </svg>
  );
}

export function WorkbenchDrawing({
  progress,
  hidden = false,
  loadPaper = true,
  onArtworkResult,
  children,
}: {
  progress: number;
  hidden?: boolean;
  loadPaper?: boolean;
  onArtworkResult?: (
    layer: WorkbenchArtworkLayer,
    result: WorkbenchArtworkResult,
  ) => void;
  children?: ReactNode;
}) {
  const id = useId();
  const restImage = useRef<DecodableArtwork>(null);
  const paperImage = useRef<DecodableArtwork>(null);
  const textureImages = useRef<
    Partial<Record<WorkbenchSurfaceLayer, DecodableArtwork>>
  >({});
  const time = Math.min(drawingTime(progress), artworkSettledAt);
  const complete = progress >= 100;
  const trace = loadPaper && !hidden;
  const shownReference = trace
    ? referenceParts.filter(({ start }) => time > start)
    : [];
  const earlierReference = shownReference.filter(
    ({ start }) => start < chairStart,
  );
  const laterReference = shownReference.filter(
    ({ start }) => start >= chairStart,
  );
  const shownSurfaces = trace
    ? surfaceTextures.filter(({ structure }) => time > structure.start)
    : [];
  const showHoles = trace && time > holes.start;
  const shadeDrawer =
    trace && time > drawerGraphite.start && time < pigment.end;

  useEffect(() => {
    if (!onArtworkResult) return;
    let mounted = true;
    // Chromium can reuse a decoded SVG image without another load event.
    const decodedArtwork: readonly (readonly [
      WorkbenchArtworkLayer,
      DecodableArtwork | null | undefined,
    ])[] = [
      ["rest", restImage.current],
      ["paper", paperImage.current],
      ...workbenchSurfaceArt.map(
        ({ id }) => [id, textureImages.current[id]] as const,
      ),
    ];
    for (const [layer, image] of decodedArtwork) {
      if (typeof image?.decode !== "function") continue;
      void image.decode().then(
        () => {
          if (mounted) onArtworkResult(layer, "ready");
        },
        () => {
          if (mounted) onArtworkResult(layer, "failed");
        },
      );
    }
    return () => {
      mounted = false;
    };
  }, [loadPaper, onArtworkResult]);

  return (
    <svg
      className={styles["drawing"]}
      data-workbench-drawing=""
      viewBox={viewBox}
      width={width}
      height={sceneHeight}
      aria-hidden="true"
      focusable="false"
      style={hidden ? { visibility: "hidden" } : undefined}
    >
      {trace && (
        <defs>
          <linearGradient id={`${id}-table-tone`} x2="0%" y2="100%">
            <stop stopColor="#e7ddcf" />
            <stop offset="1" stopColor="#f1eadf" />
          </linearGradient>
          <linearGradient id={`${id}-pegboard-tone`} x2="0%" y2="100%">
            <stop stopColor="#e9dfd0" />
            <stop offset=".32" stopColor="#f2ebdf" />
            <stop offset="1" stopColor="#f0e9dd" />
          </linearGradient>
          <linearGradient id={`${id}-table-recess`} x2="0%" y2="100%">
            <stop stopColor="white" stopOpacity=".36" />
            <stop offset=".55" stopColor="white" stopOpacity=".16" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <DrawingMask id={`${id}-recess-shade`}>
            <path
              d={workbenchStructure.tableRecess}
              fill={`url(#${id}-table-recess)`}
            />
          </DrawingMask>
          <pattern
            id={`${id}-graphite-hatching`}
            width="18"
            height="11"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M -3 11 L 16 1 M -4 7 L 7 1 M 6 13 L 21 6 M 12 8 L 19 4"
              fill="none"
              stroke="#57493b"
              strokeWidth=".8"
              strokeOpacity=".43"
            />
          </pattern>
          <linearGradient id={`${id}-shelf-falloff`} x2="0%" y2="100%">
            <stop stopColor="white" stopOpacity=".64" />
            <stop offset=".46" stopColor="white" stopOpacity=".26" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <DrawingMask id={`${id}-shelf-shade`}>
            <path
              d={workbenchStructure.shelfShadow}
              fill={`url(#${id}-shelf-falloff)`}
            />
          </DrawingMask>
          <filter
            id={`${id}-soft-lead`}
            filterUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={width}
            height={height}
          >
            <feGaussianBlur stdDeviation="1.15" />
          </filter>
          {shownReference.some(({ object }) => object === "tools") &&
            Object.entries(toolRegions).map(([tool, outline]) => (
              <clipPath key={tool} id={`${id}-tool-${tool}`}>
                <path d={outline} />
              </clipPath>
            ))}
          {shownReference.map((part) => (
            <ReferenceStencil key={part.id} prefix={id} part={part} />
          ))}
          <DrawingMask id={`${id}-backdrop`} type="luminance">
            <rect width={width} height={height} fill="white" />
            <BackdropOccluders prefix={id} />
          </DrawingMask>
          <clipPath id={`${id}-outside-chair-background`}>
            <path d={outsideChairBackground} clipRule="evenodd" />
          </clipPath>
          <DrawingMask id={`${id}-chair-background`}>
            {earlierReference.map((part) => (
              <g key={part.id} mask={`url(#${id}-part-${part.id})`}>
                <Contacts
                  marks={part.marks}
                  time={Math.min(time, part.end)}
                  maskInk="white"
                />
              </g>
            ))}
          </DrawingMask>
          <DrawingMask id={`${id}-graphite`}>
            <g clipPath={`url(#${id}-outside-chair-background)`}>
              {earlierReference.map((part) => (
                <g key={part.id} mask={`url(#${id}-part-${part.id})`}>
                  <Contacts
                    marks={part.marks}
                    time={Math.min(time, part.end)}
                  />
                </g>
              ))}
            </g>
            {laterReference.map((part) => (
              <g key={part.id} mask={`url(#${id}-part-${part.id})`}>
                <Contacts marks={part.marks} time={Math.min(time, part.end)} />
              </g>
            ))}
            <g mask={`url(#${id}-backdrop)`}>
              <rect width="480" height={height} fill="white" />
              <Contacts
                marks={backgroundReference.marks}
                time={Math.min(time, backgroundReference.end)}
              />
            </g>
          </DrawingMask>
          {shownSurfaces.map(({ owner, structure }) => (
            <DrawingMask key={owner} id={`${id}-surface-${owner}`}>
              <g filter={`url(#${id}-soft-lead)`}>
                <Contacts
                  marks={structure.marks}
                  time={Math.min(time, structure.end)}
                />
              </g>
            </DrawingMask>
          ))}
          {surfaceTextures.map(
            ({ id: texture, marks, start, end }) =>
              time > start && (
                <DrawingMask key={texture} id={`${id}-${texture}`}>
                  <Contacts
                    marks={marks}
                    time={Math.min(time, end)}
                    maskInk="white"
                  />
                </DrawingMask>
              ),
          )}
          {showHoles && (
            <DrawingMask id={`${id}-holes`}>
              <Contacts marks={holes.marks} time={Math.min(time, holes.end)} />
            </DrawingMask>
          )}
          {shadeDrawer && (
            <>
              <clipPath id={`${id}-drawer-face`}>
                <path d={yellowDrawer} clipRule="evenodd" />
              </clipPath>
              <DrawingMask id={`${id}-drawer-sketch`}>
                <Contacts
                  marks={drawerGraphite.marks}
                  time={Math.min(time, drawerGraphite.end)}
                  maskInk="white"
                />
              </DrawingMask>
              <DrawingMask id={`${id}-drawer-uncolored`} type="luminance">
                <rect {...drawer} fill="white" />
                <Contacts marks={pigment.marks} time={time} maskInk="black" />
              </DrawingMask>
            </>
          )}
        </defs>
      )}
      {loadPaper && (
        <g>
          <rect width={width} height={height} fill={paperColor} />
          <image
            ref={paperImage}
            href={workbenchDrawingArt.paper}
            width={width}
            height={height}
            opacity="0.12"
            preserveAspectRatio="xMidYMid slice"
            onLoad={() => onArtworkResult?.("paper", "ready")}
            onError={() => onArtworkResult?.("paper", "failed")}
          />
          {trace && (
            <Contacts
              marks={backgroundGuides.marks}
              time={Math.min(time, backgroundGuides.end)}
            />
          )}
        </g>
      )}
      {loadPaper &&
        surfaceTextures.map(({ id: texture, src, owner, structure, start }) => {
          const visible = trace && time > start;
          return (
            <Fragment key={texture}>
              {trace && time > structure.start && (
                <WorkbenchSurface
                  owner={owner}
                  mask={`url(#${id}-surface-${owner})`}
                  prefix={id}
                />
              )}
              {owner === "pegboard" && showHoles && (
                <HolePattern mask={`url(#${id}-holes)`} />
              )}
              <image
                ref={(element) => {
                  if (element) textureImages.current[texture] = element;
                  else delete textureImages.current[texture];
                }}
                href={src}
                width={width}
                height={height}
                visibility={visible ? undefined : "hidden"}
                mask={visible ? `url(#${id}-${texture})` : undefined}
                onLoad={() => onArtworkResult?.(texture, "ready")}
                onError={() => onArtworkResult?.(texture, "failed")}
              />
            </Fragment>
          );
        })}
      {trace && time > ink.start && (
        <Contacts marks={ink.marks} time={Math.min(time, ink.end)} />
      )}
      {loadPaper && (
        <image
          ref={(element) => {
            if (element)
              textureImages.current[workbenchChairBackground.id] = element;
            else delete textureImages.current[workbenchChairBackground.id];
          }}
          href={workbenchChairBackground.src}
          width={width}
          height={height}
          visibility={trace ? undefined : "hidden"}
          mask={trace ? `url(#${id}-chair-background)` : undefined}
          onLoad={() => onArtworkResult?.(workbenchChairBackground.id, "ready")}
          onError={() =>
            onArtworkResult?.(workbenchChairBackground.id, "failed")
          }
        />
      )}
      <g mask={trace ? `url(#${id}-graphite)` : undefined}>
        <image
          ref={restImage}
          href={workbenchDrawingArt.rest}
          width={width}
          height={height}
          visibility={hidden ? "hidden" : undefined}
          data-workbench-art={complete ? "rest" : undefined}
          onLoad={() => onArtworkResult?.("rest", "ready")}
          onError={() => onArtworkResult?.("rest", "failed")}
        />
      </g>
      {shadeDrawer && (
        <g
          mask={`url(#${id}-drawer-sketch)`}
          style={{ mixBlendMode: "saturation" }}
        >
          <rect
            {...drawer}
            fill="#b7b7b7"
            clipPath={`url(#${id}-drawer-face)`}
            mask={`url(#${id}-drawer-uncolored)`}
          />
        </g>
      )}
      {complete ? children : !hidden && <WorkbenchPencil progress={progress} />}
    </svg>
  );
}
