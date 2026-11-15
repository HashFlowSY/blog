"use client";

import { useEffect, useRef, useState } from "react";

import { assetPath } from "@/lib/site";

import styles from "./assembly-workbench.module.css";
import { drawingProgress } from "./pencil-plan";
import { workbenchInteractionArt } from "./workbench-art";
import { WorkbenchDrawing } from "./workbench-drawing";
import { WorkbenchInteractive } from "./workbench-interactive";

type DrawingState =
  | { phase: "waiting"; progress: 0 }
  | { phase: "drawing"; progress: number }
  | { phase: "complete"; progress: 100 };

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
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
    const inset = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--studio-header-height",
      ),
    );
    const availableHeight = window.innerHeight - inset;
    if (height <= 0 || availableHeight <= 0) return;

    // Short viewports can reveal less than the full height of the paper.
    const threshold = (0.6 * Math.min(height, availableHeight)) / height;
    const next = new IntersectionObserver(
      ([entry]) => {
        if (observer !== next || !entry) return;
        visible = entry.isIntersecting && entry.intersectionRatio >= threshold;
        startWhenVisible();
      },
      { rootMargin: `-${inset}px 0px 0px 0px`, threshold },
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

export function AssemblyWorkbench() {
  const [{ phase, progress }, setDrawing] = useState<DrawingState>({
    phase: "waiting",
    progress: 0,
  });
  const [artStatus, setArtStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [visit, setVisit] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const complete = phase === "complete";
  const interactiveReady = complete && artStatus === "ready";
  const stage =
    progress >= 82
      ? "整件"
      : progress >= 58
        ? "面"
        : progress >= 18
          ? "线"
          : "点";

  useEffect(() => {
    let mounted = true;
    const images = workbenchInteractionArt.map(({ src }) => {
      const image = new Image();
      image.src = assetPath(src);
      return typeof image.decode === "function"
        ? image.decode()
        : Promise.resolve();
    });
    void Promise.all(images).then(
      () => {
        if (mounted) setArtStatus("ready");
      },
      () => {
        if (mounted) setArtStatus("failed");
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const element = sceneRef.current;
    if (!element) return;
    let frameId: number | undefined;
    let stopWatching: (() => void) | undefined;

    function stopFrame() {
      if (frameId === undefined) return;
      window.cancelAnimationFrame(frameId);
      frameId = undefined;
    }

    function finishDrawing() {
      stopFrame();
      setDrawing({ phase: "complete", progress: 100 });
    }

    function startDrawing() {
      stopWatching = undefined;
      if (prefersReducedMotion()) {
        finishDrawing();
        return;
      }

      const startedAt = performance.now();
      setDrawing({ phase: "drawing", progress: 0 });

      function advance(time: number) {
        const next = drawingProgress(time - startedAt);
        if (next >= 100) {
          finishDrawing();
          return;
        }
        setDrawing({ phase: "drawing", progress: next });
        frameId = window.requestAnimationFrame(advance);
      }

      frameId = window.requestAnimationFrame(advance);
    }

    function stopPlayback() {
      stopWatching?.();
      stopWatching = undefined;
      stopFrame();
    }

    function finishWhenHidden() {
      if (document.hidden && frameId !== undefined) finishDrawing();
    }

    const restartWhenRestored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      stopPlayback();
      setVisit((revision) => revision + 1);
      if (prefersReducedMotion()) {
        finishDrawing();
      } else {
        setDrawing({ phase: "waiting", progress: 0 });
        stopWatching = observeDrawingVisibility(element, startDrawing);
      }
    };

    if (prefersReducedMotion()) {
      frameId = window.requestAnimationFrame(finishDrawing);
    } else {
      stopWatching = observeDrawingVisibility(element, startDrawing);
    }
    document.addEventListener("visibilitychange", finishWhenHidden);
    window.addEventListener("pageshow", restartWhenRestored);
    return () => {
      stopPlayback();
      document.removeEventListener("visibilitychange", finishWhenHidden);
      window.removeEventListener("pageshow", restartWhenRestored);
    };
  }, []);

  return (
    <section className={styles["workbench"]} aria-labelledby="assembly-title">
      <h2 id="assembly-title" className={styles["srOnly"]}>
        交互工作台
      </h2>
      <div
        ref={sceneRef}
        className={styles["scene"]}
        data-complete={complete}
        data-drawing-state={phase}
        data-progress={progress}
      >
        <div
          className={styles["sheet"]}
          role={interactiveReady ? undefined : "img"}
          aria-label={
            interactiveReady
              ? undefined
              : complete
                ? "手绘工作台"
                : phase === "drawing"
                  ? `工作台构建：${stage}阶段`
                  : "待绘制的工作台"
          }
        >
          {complete ? (
            <WorkbenchInteractive key={visit} enabled={interactiveReady} />
          ) : (
            <WorkbenchDrawing progress={progress} />
          )}
        </div>
      </div>
      <span className={styles["srOnly"]} role="status">
        {complete
          ? interactiveReady
            ? "工作台绘制完成，可以操作电脑、盆栽和工作灯"
            : artStatus === "failed"
              ? "工作台绘制完成，部件素材未能载入"
              : "工作台绘制完成，正在载入部件素材"
          : phase === "drawing"
            ? "正在绘制工作台"
            : "等待绘制"}
      </span>
    </section>
  );
}
