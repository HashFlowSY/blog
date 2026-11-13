"use client";

import { useEffect, useId, useRef, useState } from "react";
import { preload } from "react-dom";

import styles from "./assembly-workbench.module.css";
import { drawingProgress, drawingTime } from "./pencil-plan";
import { WorkbenchDrawing } from "./workbench-drawing";
import { preloadWorkbenchScene, WorkbenchOrbit } from "./workbench-orbit";
import { workbenchTexture } from "./workbench-textures";

import type { WorkbenchModelStatus } from "./workbench-orbit";
import type { KeyboardEvent } from "react";

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
  const [touchActive, setTouchActive] = useState(false);
  const isPlaying = playback.playing;
  const sceneId = useId();
  const sceneRef = useRef<HTMLDivElement>(null);
  const touchButton = useRef<HTMLButtonElement>(null);
  const progressRef = useRef(0);
  const complete = progress >= 100;
  const finishing = progress >= 82;
  const modelReady = complete && modelStatus === "ready";
  const stage = finishing
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
    if (!finishing) return;
    preload(workbenchTexture, {
      as: "image",
      type: "image/webp",
      crossOrigin: "anonymous",
    });
  }, [finishing]);

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
      if (next === 0) {
        setModelStatus("loading");
        setTouchActive(false);
      }
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
      <div className={styles["heading"]}>
        <h2 id="assembly-title">交互工作台</h2>
        {complete ? (
          modelReady ? (
            <>
              <p className={styles["desktopHint"]}>试试交互</p>
              <button
                ref={touchButton}
                className={styles["touchMode"]}
                type="button"
                aria-controls={sceneId}
                onClick={() => setTouchActive((active) => !active)}
              >
                {touchActive ? "退出操作" : "操作工作台"}
              </button>
            </>
          ) : (
            <span className={styles["viewMode"]} aria-hidden="true">
              {modelStatus === "failed" ? "手绘" : "…"}
            </span>
          )
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
        id={sceneId}
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
        {complete && (
          <WorkbenchOrbit onStatus={setModelStatus} touchActive={touchActive} />
        )}
      </div>
      <span className={styles["srOnly"]} role="status">
        {complete
          ? modelReady
            ? "工作台绘制完成，可以旋转查看"
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
