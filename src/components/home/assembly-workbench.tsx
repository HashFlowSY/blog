"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./assembly-workbench.module.css";
import { drawingProgress, drawingTime } from "./pencil-plan";
import { WorkbenchDrawing } from "./workbench-drawing";
import { preloadWorkbenchScene, WorkbenchOrbit } from "./workbench-orbit";

import type { WorkbenchModelStatus } from "./workbench-orbit";

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
  const [progress, setProgress] = useState(0);
  const [modelStatus, setModelStatus] =
    useState<WorkbenchModelStatus>("loading");
  const [playback, setPlayback] = useState({ playing: true });
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const isPlaying = playback.playing;
  const sceneRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const complete = progress >= 100;
  const modelReady = complete && modelStatus === "ready";
  const stage =
    progress >= 82
      ? "整件"
      : progress >= 58
        ? "面"
        : progress >= 18
          ? "线"
          : "点";

  useEffect(() => {
    void preloadWorkbenchScene().catch(() => undefined);
  }, []);

  useEffect(() => {
    const reducedMotion = prefersReducedMotion();
    if (!isPlaying || (!hasEnteredView && !reducedMotion)) return;
    const initialTime = drawingTime(progressRef.current);
    const startedAt = performance.now();
    let frameId: number;

    function advance(time: number) {
      const next = reducedMotion
        ? 100
        : drawingProgress(initialTime + time - startedAt);
      progressRef.current = next;
      setProgress(next);
      if (next < 100) frameId = window.requestAnimationFrame(advance);
      else setPlayback({ playing: false });
    }

    frameId = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frameId);
  }, [hasEnteredView, playback, isPlaying]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let enteredView = false;
    let stopWatching: (() => void) | undefined;

    function watchScene(element: HTMLDivElement) {
      stopWatching?.();
      enteredView = false;
      if (prefersReducedMotion()) return;
      stopWatching = observeDrawingVisibility(element, () => {
        enteredView = true;
        setHasEnteredView(true);
      });
    }

    function pauseWhenHidden() {
      if (document.hidden && enteredView && progressRef.current < 100)
        setPlayback({ playing: false });
    }
    const restartWhenRestored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const next = prefersReducedMotion() ? 100 : 0;
      progressRef.current = next;
      setProgress(next);
      setPlayback({ playing: next < 100 });
      setHasEnteredView(false);
      if (next === 0) setModelStatus("loading");
      watchScene(scene);
    };
    watchScene(scene);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    window.addEventListener("pageshow", restartWhenRestored);
    return () => {
      stopWatching?.();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      window.removeEventListener("pageshow", restartWhenRestored);
    };
  }, []);

  return (
    <section className={styles["workbench"]} aria-labelledby="assembly-title">
      <div className={styles["heading"]}>
        <h2 id="assembly-title">交互工作台</h2>
        {complete ? (
          <span className={styles["viewMode"]} aria-hidden="true">
            {modelReady ? "360°" : modelStatus === "failed" ? "手绘" : "…"}
          </span>
        ) : hasEnteredView ? (
          <button
            className={styles["buildButton"]}
            type="button"
            onClick={() =>
              setPlayback(({ playing }) => ({ playing: !playing }))
            }
          >
            {isPlaying ? "暂停构建" : "继续构建"}
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
      <div
        ref={sceneRef}
        className={styles["scene"]}
        data-complete={complete}
        data-progress={progress}
        data-model-ready={modelReady}
      >
        <div
          className={styles["illustration"]}
          role={modelReady ? undefined : "img"}
          aria-hidden={modelReady || undefined}
          aria-label={
            modelReady
              ? undefined
              : complete
                ? "手绘工作台"
                : hasEnteredView
                  ? `工作台构建：${stage}阶段`
                  : "待绘制的工作台"
          }
        >
          <WorkbenchDrawing progress={progress} />
        </div>
        {progress >= 82 && (
          <WorkbenchOrbit active={complete} onStatus={setModelStatus} />
        )}
      </div>
      <span className={styles["srOnly"]} role="status">
        {complete
          ? modelReady
            ? "工作台绘制完成，可以360度旋转查看"
            : modelStatus === "failed"
              ? "已保留手绘工作台，当前设备无法启用三维视图"
              : "手绘完成，正在准备三维工作台"
          : hasEnteredView
            ? isPlaying
              ? "正在绘制工作台"
              : "绘制已暂停"
            : "等待绘制"}
      </span>
    </section>
  );
}
