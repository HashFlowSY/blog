"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { preload } from "react-dom";

import { assetPath } from "@/lib/site";

import styles from "./assembly-workbench.module.css";
import { drawingObjectAt, drawingProgress, drawingTime } from "./pencil-plan";
import {
  workbenchDrawingArt,
  workbenchInteractionArt,
  workbenchSurfaceArt,
} from "./workbench-art";
import { WorkbenchWaitingPaper } from "./workbench-drawing";
import { WorkbenchInteractive } from "./workbench-interactive";

import type {
  WorkbenchArtworkLayer,
  WorkbenchArtworkResult,
} from "./workbench-drawing";
import type { ReactNode } from "react";

type DrawingState =
  | { phase: "waiting"; progress: 0 }
  | { phase: "drawing"; progress: number }
  | { phase: "complete"; progress: 100 };

type WorkbenchMotion = "pending" | "animated" | "still";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const visitKey = `workbench-visited:${assetPath("/")}`;

function hasVisitedWorkbench() {
  try {
    return (
      typeof window !== "undefined" && sessionStorage.getItem(visitKey) === "1"
    );
  } catch {
    return false;
  }
}

const animatedImagePreload = {
  as: "image",
  type: "image/webp",
  media: "(prefers-reduced-motion: no-preference)",
} as const;

const animatedArtworkLayers = [
  "paper",
  ...workbenchSurfaceArt.map(({ id }) => id),
] as const;

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia?.(reducedMotionQuery);
  preference?.addEventListener?.("change", onChange);
  return () => preference?.removeEventListener?.("change", onChange);
}

function getMotionPreference(): WorkbenchMotion {
  return window.matchMedia?.(reducedMotionQuery).matches ? "still" : "animated";
}

function decodeImage(src: string): Promise<void> {
  const image = new Image();
  if (typeof image.decode === "function") {
    image.src = src;
    return image.decode();
  }

  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function observeDrawingVisibility(scene: HTMLDivElement, start: () => void) {
  let observer: IntersectionObserver | undefined;
  let visible = false;
  let watching = true;
  const resizeObserver = new ResizeObserver(observe);

  function stop() {
    watching = false;
    observer?.disconnect();
    observer = undefined;
    resizeObserver.disconnect();
    window.removeEventListener("resize", observe);
    document.removeEventListener("visibilitychange", startWhenVisible);
  }

  function startWhenVisible() {
    if (!watching || !visible || document.hidden) return;
    stop();
    start();
  }

  function observe() {
    if (!watching) return;
    observer?.disconnect();
    observer = undefined;
    visible = false;
    const height = scene.clientHeight;
    const availableHeight = window.innerHeight;
    if (height <= 0 || availableHeight <= 0) return;

    // Short viewports can reveal less than the full height of the paper.
    const threshold = (0.6 * Math.min(height, availableHeight)) / height;
    const next = new IntersectionObserver(
      ([entry]) => {
        if (observer !== next || !entry) return;
        visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
        startWhenVisible();
      },
      { threshold },
    );
    observer = next;
    next.observe(scene);
  }

  resizeObserver.observe(scene);
  window.addEventListener("resize", observe);
  document.addEventListener("visibilitychange", startWhenVisible);
  observe();
  return stop;
}

export function AssemblyWorkbench({ children }: { children?: ReactNode }) {
  const motion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    (): WorkbenchMotion => "pending",
  );
  const [drawing, setDrawing] = useState<DrawingState>({
    phase: "waiting",
    progress: 0,
  });
  const [artwork, setArtwork] = useState<
    Partial<Record<WorkbenchArtworkLayer, WorkbenchArtworkResult>>
  >({});
  const [partsStatus, setPartsStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [visit, setVisit] = useState(0);
  const [finishedView, setFinishedView] = useState(hasVisitedWorkbench);
  const playbackButton = useRef<HTMLButtonElement>(null);
  const focusLamp = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const restStatus = artwork.rest;
  const staticArtwork =
    motion === "still" ||
    animatedArtworkLayers.some((layer) => artwork[layer] === "failed");
  const showStill = staticArtwork || finishedView;
  const canAnimate = motion === "animated" && !showStill;
  const artworkReady =
    restStatus === "ready" &&
    (showStill ||
      animatedArtworkLayers.every((layer) => artwork[layer] === "ready"));
  const phase =
    restStatus === "failed"
      ? "failed"
      : !artworkReady
        ? "waiting"
        : showStill
          ? "complete"
          : drawing.phase;
  const complete = phase === "complete";
  const progress = complete ? 100 : phase === "drawing" ? drawing.progress : 0;
  const interactiveReady = complete && partsStatus === "ready";

  useEffect(() => {
    try {
      sessionStorage.setItem(visitKey, "1");
    } catch {
      // The drawing and its controls also work when browser storage is blocked.
    }
    function restore(event: PageTransitionEvent) {
      if (!event.persisted) return;
      setFinishedView(true);
      setVisit((revision) => revision + 1);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  useEffect(() => {
    if (!interactiveReady || !focusLamp.current) return;
    focusLamp.current = false;
    if (document.activeElement === playbackButton.current)
      sceneRef.current
        ?.querySelector<HTMLButtonElement>('[data-part="lamp"]')
        ?.focus();
  }, [interactiveReady]);

  function togglePlayback() {
    if (!complete) {
      focusLamp.current = true;
      setFinishedView(true);
      return;
    }
    focusLamp.current = false;
    setDrawing({ phase: "waiting", progress: 0 });
    setVisit((revision) => revision + 1);
    setFinishedView(false);
  }

  preload(workbenchDrawingArt.rest, { as: "image", type: "image/webp" });
  preload(workbenchDrawingArt.paper, animatedImagePreload);
  preload(workbenchDrawingArt.pencil, animatedImagePreload);
  for (const { src } of workbenchSurfaceArt) preload(src, animatedImagePreload);

  const handleArtworkResult = useCallback(
    (layer: WorkbenchArtworkLayer, result: WorkbenchArtworkResult) => {
      setArtwork((current) =>
        current[layer] === result ? current : { ...current, [layer]: result },
      );
    },
    [],
  );

  useEffect(() => {
    if (!artworkReady) return;
    let mounted = true;
    void Promise.all(
      workbenchInteractionArt.map(({ src }) => decodeImage(assetPath(src))),
    ).then(
      () => {
        if (mounted) setPartsStatus("ready");
      },
      () => {
        if (mounted) setPartsStatus("failed");
      },
    );
    return () => {
      mounted = false;
    };
  }, [artworkReady]);

  useEffect(() => {
    const element = sceneRef.current;
    if (!element || !artworkReady) return;
    let frameId: number | undefined;
    let stopWatching: (() => void) | undefined;
    let elapsed = 0;
    let lastFrameAt: number | undefined;
    let playing = false;

    function stopFrame() {
      if (frameId === undefined) return;
      window.cancelAnimationFrame(frameId);
      frameId = undefined;
    }

    function advance(time: number) {
      frameId = undefined;
      if (lastFrameAt === undefined) return;
      elapsed += time - lastFrameAt;
      lastFrameAt = time;
      const next = drawingProgress(elapsed);
      if (next >= 100) {
        playing = false;
        lastFrameAt = undefined;
        setDrawing({ phase: "complete", progress: 100 });
        return;
      }
      setDrawing({ phase: "drawing", progress: next });
      frameId = window.requestAnimationFrame(advance);
    }

    function startDrawing() {
      stopWatching = undefined;
      elapsed = 0;
      playing = true;
      setDrawing({ phase: "drawing", progress: 0 });
      syncVisibility();
    }

    function stopPlayback() {
      stopWatching?.();
      stopWatching = undefined;
      playing = false;
      lastFrameAt = undefined;
      stopFrame();
    }

    function syncVisibility() {
      if (!playing) return;
      if (document.hidden) {
        lastFrameAt = undefined;
        stopFrame();
      } else if (lastFrameAt === undefined) {
        lastFrameAt = performance.now();
        frameId = window.requestAnimationFrame(advance);
      }
    }

    if (canAnimate)
      stopWatching = observeDrawingVisibility(element, startDrawing);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      stopPlayback();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [artworkReady, canAnimate, visit]);

  return (
    <figure className="paper-figure">
      <section className={styles["workbench"]} aria-labelledby="assembly-title">
        <h2 id="assembly-title" className={styles["srOnly"]}>
          交互工作台
        </h2>
        <div
          ref={sceneRef}
          className={styles["scene"]}
          data-drawing-state={phase}
          data-progress={progress}
          data-drawing-object={
            phase === "drawing"
              ? drawingObjectAt(drawingTime(progress))
              : undefined
          }
        >
          <div
            className={styles["sheet"]}
            role={interactiveReady || phase === "failed" ? undefined : "img"}
            aria-label={
              interactiveReady || phase === "failed"
                ? undefined
                : complete
                  ? "手绘工作台"
                  : phase === "drawing"
                    ? "正在绘制的工作台"
                    : "待绘制的工作台"
            }
          >
            {phase === "waiting" && <WorkbenchWaitingPaper />}
            {motion !== "pending" && phase !== "failed" && (
              <WorkbenchInteractive
                key={visit}
                enabled={interactiveReady}
                progress={progress}
                hidden={phase === "waiting"}
                loadPaper={canAnimate}
                onArtworkResult={handleArtworkResult}
              />
            )}
          </div>
        </div>
        <span className={styles["srOnly"]} role="status">
          {phase === "failed"
            ? "工作台画稿未能载入"
            : complete
              ? interactiveReady
                ? "工作台绘制完成，可以操作电脑、盆栽和工作灯"
                : partsStatus === "failed"
                  ? "工作台绘制完成，部件素材未能载入"
                  : "工作台绘制完成，正在载入部件素材"
              : phase === "drawing"
                ? "正在绘制工作台"
                : "等待绘制"}
        </span>
      </section>
      <figcaption>
        <span>
          <i lang="en">Fig. 1</i>{" "}
          {interactiveReady ? "试试开关工作灯" : "首页手绘工作台"}
        </span>
        {motion === "animated" && !staticArtwork && phase !== "failed" && (
          <button
            type="button"
            className={styles["playback"]}
            ref={playbackButton}
            onClick={togglePlayback}
          >
            {complete ? "重看绘制" : "直接体验"}
          </button>
        )}
        {children}
      </figcaption>
    </figure>
  );
}
