"use client";

import { useEffect, useId, useRef, useState } from "react";

import { assetPath } from "@/lib/site";

import styles from "./assembly-workbench.module.css";
import { drawingProgress, drawingTime } from "./pencil-plan";
import { workbenchPartArt } from "./workbench-art";
import { WorkbenchDrawing } from "./workbench-drawing";
import { WorkbenchInteractive } from "./workbench-interactive";

import type { KeyboardEvent } from "react";

const interactionArt = new Set(
  Object.values(workbenchPartArt).flatMap(({ sprite, cover, open }) =>
    [sprite, cover, open].flatMap((image) =>
      image ? [assetPath(image.src)] : [],
    ),
  ),
);

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
  const [artStatus, setArtStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [visit, setVisit] = useState(0);
  const [playback, setPlayback] = useState({ playing: true });
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const isPlaying = playback.playing;
  const sceneId = useId();
  const sceneRef = useRef<HTMLDivElement>(null);
  const touchButton = useRef<HTMLButtonElement>(null);
  const progressRef = useRef(0);
  const complete = progress >= 100;
  const finishing = progress >= 82;
  const interactiveReady = complete && artStatus === "ready";
  const stage = finishing
    ? "整件"
    : progress >= 58
      ? "面"
      : progress >= 18
        ? "线"
        : "点";

  useEffect(() => {
    let mounted = true;
    const images = [...interactionArt].map((src) => {
      const image = new Image();
      image.src = src;
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
      setVisit((revision) => revision + 1);
      setTouchActive(false);
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

  function exitTouchMode(event: KeyboardEvent<HTMLElement>) {
    if (!touchActive || event.key !== "Escape" || event.defaultPrevented)
      return;
    event.preventDefault();
    setTouchActive(false);
    touchButton.current?.focus();
  }

  return (
    <section
      className={styles["workbench"]}
      aria-labelledby="assembly-title"
      data-touch-active={touchActive}
      onKeyDown={exitTouchMode}
    >
      <h2 id="assembly-title" className={styles["srOnly"]}>
        交互工作台
      </h2>
      <div className={styles["controls"]}>
        {complete ? (
          interactiveReady ? (
            <>
              <p className={styles["desktopHint"]}>点按部件试试</p>
              <button
                ref={touchButton}
                className={styles["touchMode"]}
                type="button"
                aria-controls={sceneId}
                aria-pressed={touchActive}
                onClick={() => setTouchActive((active) => !active)}
              >
                {touchActive ? "退出操作" : "操作工作台"}
              </button>
            </>
          ) : null
        ) : hasEnteredView ? (
          <button
            className={styles["buildButton"]}
            type="button"
            onClick={() =>
              setPlayback(({ playing }) => ({ playing: !playing }))
            }
          >
            {isPlaying ? "暂停构建" : "继续构建"}
          </button>
        ) : null}
      </div>
      <div
        id={sceneId}
        ref={sceneRef}
        className={styles["scene"]}
        data-complete={complete}
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
                : hasEnteredView
                  ? `工作台构建：${stage}阶段`
                  : "待绘制的工作台"
          }
        >
          {complete ? (
            <WorkbenchInteractive
              key={visit}
              enabled={interactiveReady}
              touchActive={touchActive}
            />
          ) : (
            <WorkbenchDrawing progress={progress} />
          )}
        </div>
      </div>
      <span className={styles["srOnly"]} role="status">
        {complete
          ? interactiveReady
            ? "工作台绘制完成，可以操作部件"
            : artStatus === "failed"
              ? "工作台绘制完成，部件素材未能载入"
              : "工作台绘制完成，正在载入部件素材"
          : hasEnteredView
            ? isPlaying
              ? "正在绘制工作台"
              : "绘制已暂停"
            : "等待绘制"}
      </span>
    </section>
  );
}
