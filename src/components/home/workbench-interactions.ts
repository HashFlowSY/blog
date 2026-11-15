import {
  actionForPart,
  drawerActions,
  viseScrewPitch,
} from "./workbench-parts";

import type {
  WorkbenchAction,
  WorkbenchDevice,
  WorkbenchDrawer,
  WorkbenchMouse,
  WorkbenchPart,
} from "./workbench-parts";

const keyInterval = 205;
const keyPulse = 199;
const drawingDuration = 2750;
const maximumCrankAngle = Math.PI * 6;
const releaseOpening = 0.039 / (viseScrewPitch * 3);
const returnOpening = 0.027 / (viseScrewPitch * 3);
const fallDuration = 1625;
const seatedAt = 1140;
const clampedAt = seatedAt + 185;

const actionLabels = {
  "mouse-left": "鼠标左键",
  "mouse-right": "鼠标右键",
  "drawer-0": "上抽屉",
  "drawer-1": "中抽屉",
  "drawer-2": "黄色抽屉",
};

export interface WorkbenchPose {
  drawers: Readonly<Record<WorkbenchDrawer, number>>;
  activeDrawer: WorkbenchDrawer | undefined;
  caseOpen: boolean;
  lid: number;
  latch: number;
  stoolOut: boolean;
  stoolSlide: number;
  lampOn: boolean;
  light: number;
  swings: ReadonlyMap<WorkbenchPart, number>;
  screen:
    | {
        device: WorkbenchDevice;
        clearInk: number;
        progress: number;
        keyIndex: number | undefined;
        keyPress: number;
        keyGlow: number;
      }
    | undefined;
  mouse: { part: WorkbenchMouse; press: number; glow: number } | undefined;
  vise: {
    opening: number;
    handleAngle: number;
    stock: {
      phase: "held" | "falling" | "grounded" | "returning";
      progress: number;
    };
  };
}

interface WorkbenchInteractionOptions {
  reducedMotion?: () => boolean;
  onMessage?: (message: string) => void;
  keyCount?: Readonly<Record<WorkbenchDevice, number>>;
  leaves?: readonly WorkbenchPart[];
  random?: () => number;
}

function unit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number, start: number, end: number) {
  const t = unit((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

function smootherstep(value: number) {
  const t = unit(value);
  return t ** 3 * (10 + t * (-15 + t * 6));
}

type WorkbenchMotion = Omit<WorkbenchPose, "drawers" | "swings"> & {
  drawers: Record<WorkbenchDrawer, number>;
};

function initialPose(): WorkbenchMotion {
  return {
    drawers: { "drawer-0": 0, "drawer-1": 0, "drawer-2": 0 },
    activeDrawer: undefined,
    caseOpen: false,
    lid: 0,
    latch: 0,
    stoolOut: false,
    stoolSlide: 0,
    lampOn: true,
    light: 1,
    screen: undefined,
    mouse: undefined,
    vise: {
      opening: 0,
      handleAngle: 0,
      stock: { phase: "held", progress: 0 },
    },
  };
}

export function createWorkbenchInteractions({
  reducedMotion = () => false,
  onMessage = () => {},
  keyCount = { laptop: 9, display: 9 },
  leaves = [],
  random = Math.random,
}: WorkbenchInteractionOptions = {}) {
  const pose = initialPose();
  const springs = new Map<
    WorkbenchPart,
    { angle: number; speed: number; entered: number }
  >();
  let typing:
    | { device: WorkbenchDevice; start: number; sequence: number[] }
    | undefined;
  let mousePress: { part: WorkbenchMouse; start: number } | undefined;
  let viseMotion:
    | { from: number; target: number; start: number; duration: number }
    | undefined;
  let viseRequested = 0;
  let stockSince = 0;
  let selected: WorkbenchAction | undefined;
  let message = "";

  function publish(next: string) {
    if (next === message) return;
    message = next;
    onMessage(next);
  }

  function swing(part: WorkbenchPart, sign: number, now: number, strength = 1) {
    const spring = springs.get(part) ?? {
      angle: 0,
      speed: 0,
      entered: -Infinity,
    };
    if (now - spring.entered < 280) return;
    const impulse = part.startsWith("leaf-")
      ? 1.7
      : /^(wrench|hammer)-/.test(part)
        ? 0.85
        : 1.1;
    spring.speed = Math.min(
      2.05,
      Math.max(-2.05, spring.speed + sign * strength * impulse),
    );
    spring.entered = now;
    springs.set(part, spring);
  }

  function sweep(part: WorkbenchPart, sign: number, now: number) {
    if (reducedMotion()) return;
    const action = actionForPart(part);
    if (action === "plant") {
      swing(part, sign, now);
      const index = leaves.indexOf(part);
      const neighbor = leaves[(index + 1) % leaves.length];
      if (index >= 0 && neighbor && neighbor !== part)
        swing(neighbor, -sign, now, 0.35);
    } else if (action === "tools") {
      swing(part, sign, now);
    }
  }

  function startTyping(device: WorkbenchDevice, now: number) {
    if (reducedMotion()) {
      publish("图纸已就绪");
      return;
    }
    const available = Array.from({ length: keyCount[device] }, (_, i) => i);
    const sequence = Array.from(
      { length: Math.min(9, available.length) },
      () => {
        const index = Math.floor(random() * available.length);
        return available.splice(index, 1)[0]!;
      },
    );
    typing = { device, start: now, sequence };
    publish(`${device === "laptop" ? "笔记本" : "外接键盘"}正在打字`);
  }

  function setStock(
    phase: WorkbenchPose["vise"]["stock"]["phase"],
    now: number,
  ) {
    pose.vise.stock = { phase, progress: phase === "grounded" ? 1 : 0 };
    stockSince = now;
  }

  function releaseStock(now: number) {
    if (pose.vise.stock.phase === "held" && viseRequested >= releaseOpening)
      setStock("falling", now);
  }

  function setJaw(now: number, instant: boolean) {
    const { phase } = pose.vise.stock;
    let minimum = instant || phase === "held" ? 0 : releaseOpening;
    if (phase === "returning")
      minimum *= 1 - smoothstep(now - stockSince, seatedAt, clampedAt);
    const opening = Math.max(viseRequested, minimum);
    pose.vise.opening = opening;
    pose.vise.handleAngle = opening * maximumCrankAngle;
  }

  function reportVise() {
    if (selected !== "vise") return;
    const messages = {
      held:
        pose.vise.opening === 0 ? "钳口已合拢，木块已复位" : "钳口停在当前位置",
      falling: "木块正在落下",
      grounded: "木块已落到地面",
      returning: "木块正在复位",
    };
    publish(messages[pose.vise.stock.phase]);
  }

  function toggleVise(now: number) {
    const target = (viseMotion?.target ?? viseRequested) > 0.001 ? 0 : 1;
    const from = pose.vise.opening;
    viseMotion = {
      from,
      target,
      start: now,
      duration: 340 + 1420 * Math.abs(target - from),
    };
    publish(target ? "台钳正在松开" : "台钳正在合拢");
    if (reducedMotion()) tickVise(now, true);
  }

  function activate(part: WorkbenchPart, now: number) {
    const action = actionForPart(part);
    if (!action || (typing && (action === "laptop" || action === "display")))
      return;
    selected = action;
    switch (action) {
      case "plant":
        sweep(part, 1, now);
        publish(reducedMotion() ? "树叶保持静止" : "树叶轻摆");
        break;
      case "tools":
        sweep(part, 1, now);
        publish(reducedMotion() ? "挂件保持静止" : "挂件轻摆");
        break;
      case "lamp":
        pose.lampOn = !pose.lampOn;
        publish(pose.lampOn ? "工作灯已开启" : "工作灯已关闭");
        break;
      case "case":
        pose.caseOpen = !pose.caseOpen;
        publish(pose.caseOpen ? "打开工具箱" : "合上工具箱");
        break;
      case "stool":
        pose.stoolOut = !pose.stoolOut;
        publish(pose.stoolOut ? "挪开圆凳" : "圆凳回位");
        break;
      case "laptop":
      case "display":
        startTyping(action, now);
        break;
      case "mouse-left":
      case "mouse-right":
        mousePress = { part: action, start: now };
        publish(`${actionLabels[action]}已点击`);
        break;
      case "vise":
        toggleVise(now);
        break;
      default:
        pose.activeDrawer = pose.activeDrawer === action ? undefined : action;
        publish(
          `${pose.activeDrawer ? "拉出" : "合上"}${actionLabels[action]}`,
        );
    }
  }

  function tickTyping(now: number, instant: boolean) {
    if (!typing) return false;
    const { device, sequence, start } = typing;
    const elapsed = Math.max(0, now - start);
    const lastKey = Math.max(0, (sequence.length - 1) * keyInterval + keyPulse);
    if (instant || elapsed >= lastKey + drawingDuration) {
      pose.screen = undefined;
      typing = undefined;
      if (selected === device) publish("图纸绘制完成");
      return false;
    }
    if (elapsed < lastKey) {
      const index = Math.floor(elapsed / keyInterval);
      const age = elapsed - index * keyInterval;
      pose.screen = {
        device,
        clearInk: smoothstep(elapsed, 65, 390),
        progress: 0,
        keyIndex: sequence[index],
        keyPress: smoothstep(age, 0, 36) * (1 - smoothstep(age, 144, 193)),
        keyGlow: smoothstep(age, 0, 24) * (1 - smoothstep(age, 152, keyPulse)),
      };
    } else {
      if (selected === device) publish("正在逐笔绘图");
      pose.screen = {
        device,
        clearInk: 1,
        progress: unit((elapsed - lastKey) / drawingDuration),
        keyIndex: undefined,
        keyPress: 0,
        keyGlow: 0,
      };
    }
    return true;
  }

  function tickMouse(now: number, instant: boolean) {
    if (!mousePress) return false;
    const elapsed = Math.max(0, now - mousePress.start);
    if (elapsed >= 540) {
      pose.mouse = undefined;
      mousePress = undefined;
      return false;
    }
    pose.mouse = {
      part: mousePress.part,
      press: instant
        ? 0
        : smoothstep(elapsed, 0, 53) * (1 - smoothstep(elapsed, 128, 236)),
      glow: smoothstep(elapsed, 0, 35) * (1 - smoothstep(elapsed, 300, 540)),
    };
    return true;
  }

  function tickVise(now: number, instant: boolean) {
    const previousPhase = pose.vise.stock.phase;
    const previousOpening = pose.vise.opening;
    if (instant) {
      if (viseMotion) viseRequested = viseMotion.target;
      viseMotion = undefined;
      const staysHeld =
        previousPhase === "held"
          ? viseRequested < releaseOpening
          : viseRequested <= returnOpening;
      setStock(staysHeld ? "held" : "grounded", now);
      setJaw(now, true);
      if (
        previousPhase !== pose.vise.stock.phase ||
        previousOpening !== pose.vise.opening
      )
        reportVise();
      return false;
    }
    if (viseMotion) {
      const { from, target, start, duration } = viseMotion;
      const progress = smoothstep(now, start, start + duration);
      viseRequested = from + (target - from) * progress;
      if (progress === 1) viseMotion = undefined;
    }
    releaseStock(now);
    if (pose.vise.stock.phase === "falling") {
      const progress = unit((now - stockSince) / fallDuration);
      pose.vise.stock.progress = progress;
      if (progress === 1) setStock("grounded", now);
    }
    if (pose.vise.stock.phase === "grounded" && viseRequested <= returnOpening)
      setStock("returning", now);
    if (pose.vise.stock.phase === "returning") {
      const elapsed = now - stockSince;
      pose.vise.stock.progress = smootherstep(elapsed / seatedAt);
      if (elapsed >= clampedAt) {
        setStock("held", now);
        releaseStock(now);
      }
    }
    setJaw(now, false);
    if (
      previousPhase !== pose.vise.stock.phase ||
      (previousOpening !== pose.vise.opening && !viseMotion)
    )
      reportVise();
    return (
      Boolean(viseMotion) ||
      pose.vise.stock.phase === "falling" ||
      pose.vise.stock.phase === "returning"
    );
  }

  function tickSwings(dt: number, instant: boolean) {
    if (instant) {
      springs.clear();
      return;
    }
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const step = dt / steps;
    for (const [part, spring] of springs) {
      const leaf = part.startsWith("leaf-");
      const limit = leaf ? 0.125 : part.startsWith("wrench-") ? 0.059 : 0.088;
      const stiffness = leaf ? 100 : part.startsWith("hammer-") ? 145 : 215;
      for (let i = 0; i < steps; i++) {
        spring.speed -= (spring.angle * stiffness + spring.speed * 8.9) * step;
        spring.angle = Math.min(
          limit,
          Math.max(-limit, spring.angle + spring.speed * step),
        );
      }
      if (Math.abs(spring.angle) < 0.001 && Math.abs(spring.speed) < 0.018)
        springs.delete(part);
    }
  }

  function tick(now: number, dt: number) {
    const instant = reducedMotion();
    let moving = false;
    function approach(value: number, target: number, speed: number) {
      if (instant || Math.abs(value - target) < 0.004) return target;
      moving = true;
      return target + (value - target) * Math.exp(-speed * dt);
    }
    tickSwings(dt, instant);
    pose.latch = approach(
      pose.latch,
      Number(pose.caseOpen || (!instant && pose.lid > 0)),
      15,
    );
    pose.lid = approach(
      pose.lid,
      Number(pose.caseOpen && pose.latch > 0.68),
      7.4,
    );
    pose.stoolSlide = approach(pose.stoolSlide, Number(pose.stoolOut), 7.6);
    pose.light = approach(pose.light, Number(pose.lampOn), 15);

    const canOpenDrawer =
      instant ||
      drawerActions.every(
        (name) => name === pose.activeDrawer || pose.drawers[name] === 0,
      );
    for (const name of drawerActions)
      pose.drawers[name] = approach(
        pose.drawers[name],
        Number(canOpenDrawer && name === pose.activeDrawer),
        8.5,
      );
    const typingMoving = tickTyping(now, instant);
    const mouseMoving = tickMouse(now, instant);
    const viseMoving = tickVise(now, instant);
    return (
      moving ||
      springs.size > 0 ||
      typingMoving ||
      mouseMoving ||
      viseMoving ||
      (Boolean(pose.activeDrawer) && !canOpenDrawer) ||
      (!pose.caseOpen && pose.lid === 0 && pose.latch > 0)
    );
  }

  return {
    activate,
    sweep,
    tick,
    get pose(): WorkbenchPose {
      return {
        ...pose,
        drawers: { ...pose.drawers },
        swings: new Map(
          [...springs].map(([part, spring]) => [part, spring.angle]),
        ),
        vise: { ...pose.vise, stock: { ...pose.vise.stock } },
      };
    },
    startTurningVise() {
      viseMotion = undefined;
      selected = "vise";
      publish("正在转动台钳");
    },
    turnVise(deltaRadians: number, now: number) {
      viseRequested = unit(viseRequested + deltaRadians / maximumCrankAngle);
      if (reducedMotion()) tickVise(now, true);
      else {
        releaseStock(now);
        setJaw(now, false);
      }
    },
    stopTurningVise: reportVise,
  };
}
