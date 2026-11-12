import { Color, MathUtils, type Vector3 } from "three";

import {
  actionForPart,
  drawerActions,
  viseScrewPitch,
} from "./workbench-parts";
import { createKeyFeedback, createMouseFeedback } from "./workbench-press";
import { createViseMechanism, maximumOpening } from "./workbench-vise";

import type { WorkbenchModel } from "./workbench-model";
import type {
  WorkbenchAction,
  WorkbenchDevice,
  WorkbenchDrawer,
  WorkbenchPart,
} from "./workbench-parts";
import type {
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
} from "three";

type KeyFeedback = ReturnType<typeof createKeyFeedback>;
interface Blueprint {
  panel: Object3D;
  update(clearInk: number, progress: number): void;
  dispose(): void;
}

const keyInterval = 205;
const keyPulse = 199;
const drawingDuration = 2750;
const actionLabels = {
  "mouse-left": "鼠标左键",
  "mouse-right": "鼠标右键",
  "drawer-0": "上抽屉",
  "drawer-1": "中抽屉",
  "drawer-2": "黄色抽屉",
};

export function createWorkbenchInteractions(
  model: WorkbenchModel,
  createBlueprint: (device: WorkbenchDevice) => Blueprint,
  reducedMotion: Pick<MediaQueryList, "matches">,
  onMessage: (message: string) => void,
  requestRender: () => void,
) {
  function part(name: WorkbenchPart) {
    const body = model.parts.get(name);
    if (!body) throw new Error(`Missing workbench part ${name}`);
    return body;
  }

  function partMesh(name: WorkbenchPart) {
    return part(name).children[0] as Mesh<BufferGeometry, MeshBasicMaterial>;
  }

  const caseLid = part("case-lid");
  const latches = part("case-latches");
  const stool = part("stool");
  const diffuser = partMesh("lamp-diffuser").material;
  const lampLit = new Color(0xffffff);
  const lampOff = new Color(0x9e9483);
  const leaves = [...model.parts.values()].filter((body) =>
    body.name.startsWith("leaf-"),
  );
  const drawers = drawerActions.map((name) => ({
    name,
    body: part(name),
    slide: 0,
  }));
  const vise = createViseMechanism(
    part("vise-slide"),
    part("vise-handle"),
    part("vise-grip"),
    part("vise-stock"),
    model,
  );
  model.group.add(vise.shadow);
  const springs = new Map<
    Group,
    { angle: number; speed: number; entered: number; leaf: boolean }
  >();
  const keys = new Map<WorkbenchDevice, KeyFeedback[]>();
  const mouse = new Map(
    [...model.mouse].map(([name, contact]) => [
      name,
      createMouseFeedback(part(name), contact),
    ]),
  );
  const sketches = new Map<WorkbenchDevice, Blueprint>();

  let message = "";
  let lampOn = true;
  let caseOpen = false;
  let activeDrawer: WorkbenchDrawer | undefined;
  let stoolOut = false;
  let selected: WorkbenchAction | undefined;
  let lid = 0;
  let latch = 0;
  let stoolSlide = 0;
  let light = 1;
  let typing:
    | {
        device: WorkbenchDevice;
        start: number;
        sequence: KeyFeedback[];
        drawing: boolean;
      }
    | undefined;
  let mousePress: { feedback: KeyFeedback; start: number } | undefined;
  let viseMotion:
    | { from: number; target: number; start: number; duration: number }
    | undefined;

  function publish(next: string) {
    if (next === message) return;
    message = next;
    onMessage(next);
  }

  function swing(body: Group, sign: number, strength = 1) {
    if (reducedMotion.matches) return;
    const leaf = body.name.startsWith("leaf-");
    const now = performance.now();
    const spring = springs.get(body) ?? {
      angle: 0,
      speed: 0,
      entered: -Infinity,
      leaf,
    };
    if (now - spring.entered < 280) return;
    const impulse = leaf
      ? 1.7
      : /^(wrench|hammer)-/.test(body.name)
        ? 0.85
        : 1.1;
    spring.speed = MathUtils.clamp(
      spring.speed + sign * strength * impulse,
      -2.05,
      2.05,
    );
    spring.entered = now;
    springs.set(body, spring);
  }

  function sweep(name: WorkbenchPart, sign: number) {
    const action = actionForPart(name);
    if (action === "plant") {
      const leaf = part(name);
      swing(leaf, sign);
      swing(leaves[(leaves.indexOf(leaf) + 1) % leaves.length]!, -sign, 0.35);
    } else if (action === "tools") swing(part(name), sign);
  }

  function startTyping(device: WorkbenchDevice) {
    if (reducedMotion.matches) {
      publish("图纸已就绪");
      return;
    }
    let feedback = keys.get(device);
    if (!feedback) {
      feedback = [...model.keys].flatMap(([name, contact]) =>
        name.startsWith(`${device}-key-`)
          ? [createKeyFeedback(part(name), contact)]
          : [],
      );
      keys.set(device, feedback);
    }
    let sketch = sketches.get(device);
    if (!sketch) {
      sketch = createBlueprint(device);
      model.group.add(sketch.panel);
      sketches.set(device, sketch);
    }
    const available = [...feedback];
    const sequence = Array.from(
      { length: 9 },
      () =>
        available.splice(Math.floor(Math.random() * available.length), 1)[0]!,
    );
    sketch.update(0, 0);
    sketch.panel.visible = true;
    typing = { device, start: performance.now(), sequence, drawing: false };
    publish(`${device === "laptop" ? "笔记本" : "外接键盘"}正在打字`);
  }

  function reportVise() {
    if (selected !== "vise") return;
    const messages = {
      held: vise.opening === 0 ? "钳口已合拢，木块已复位" : "钳口停在当前位置",
      falling: "木块正在落下",
      grounded: "木块已落到地面",
      returning: "木块正在复位",
    };
    publish(messages[vise.stockPhase]);
  }

  function toggleVise() {
    const target =
      (viseMotion?.target ?? vise.requestedOpening) > 0.001
        ? 0
        : maximumOpening;
    const now = performance.now();
    if (reducedMotion.matches) {
      viseMotion = undefined;
      vise.move(target, now, true);
      vise.drawStock(now, true);
    } else {
      const from = vise.opening;
      viseMotion = {
        from,
        target,
        start: now,
        duration: 340 + (1420 * Math.abs(target - from)) / maximumOpening,
      };
    }
    publish(target ? "台钳正在松开" : "台钳正在合拢");
    if (reducedMotion.matches) reportVise();
  }

  function activate(name: WorkbenchPart) {
    const action = actionForPart(name);
    if (!action || (typing && (action === "laptop" || action === "display")))
      return;
    selected = action;
    switch (action) {
      case "plant":
        sweep(name, 1);
        publish(reducedMotion.matches ? "树叶保持静止" : "树叶轻摆");
        break;
      case "tools":
        sweep(name, 1);
        publish(reducedMotion.matches ? "挂件保持静止" : "挂件轻摆");
        break;
      case "lamp":
        lampOn = !lampOn;
        publish(lampOn ? "工作灯已开启" : "工作灯已关闭");
        break;
      case "case":
        caseOpen = !caseOpen;
        publish(caseOpen ? "打开工具箱" : "合上工具箱");
        break;
      case "stool":
        stoolOut = !stoolOut;
        publish(stoolOut ? "挪开圆凳" : "圆凳回位");
        break;
      case "laptop":
      case "display":
        startTyping(action);
        break;
      case "mouse-left":
      case "mouse-right":
        mousePress?.feedback.set(0, 0);
        mousePress = { feedback: mouse.get(action)!, start: performance.now() };
        publish(`${actionLabels[action]}已点击`);
        break;
      case "vise":
        toggleVise();
        break;
      default:
        activeDrawer = activeDrawer === action ? undefined : action;
        publish(`${activeDrawer ? "拉出" : "合上"}${actionLabels[action]}`);
    }
    requestRender();
  }

  function tickTyping(now: number) {
    if (!typing) return false;
    const session = typing;
    const elapsed = now - session.start;
    const lastKey = (session.sequence.length - 1) * keyInterval + keyPulse;
    const sketch = sketches.get(session.device)!;
    if (reducedMotion.matches || elapsed >= lastKey + drawingDuration) {
      sketch.panel.visible = false;
      for (const key of session.sequence) key.set(0, 0);
      typing = undefined;
      if (selected === session.device) publish("图纸绘制完成");
      return false;
    }
    if (elapsed < lastKey) {
      sketch.update(MathUtils.smoothstep(elapsed, 65, 390), 0);
      for (const [index, key] of session.sequence.entries()) {
        const age = elapsed - index * keyInterval;
        key.set(
          MathUtils.smoothstep(age, 0, 36) *
            (1 - MathUtils.smoothstep(age, 144, 193)),
          MathUtils.smoothstep(age, 0, 24) *
            (1 - MathUtils.smoothstep(age, 152, keyPulse)),
        );
      }
    } else {
      if (!session.drawing) {
        session.drawing = true;
        for (const key of session.sequence) key.set(0, 0);
        if (selected === session.device) publish("正在逐笔绘图");
      }
      sketch.update(1, (elapsed - lastKey) / drawingDuration);
    }
    return true;
  }

  function tickMouse(now: number) {
    if (!mousePress) return false;
    const elapsed = now - mousePress.start;
    if (elapsed >= 540) {
      mousePress.feedback.set(0, 0);
      mousePress = undefined;
      return false;
    }
    const press =
      MathUtils.smoothstep(elapsed, 0, 53) *
      (1 - MathUtils.smoothstep(elapsed, 128, 236));
    const glow =
      MathUtils.smoothstep(elapsed, 0, 35) *
      (1 - MathUtils.smoothstep(elapsed, 300, 540));
    mousePress.feedback.set(reducedMotion.matches ? 0 : press, glow);
    return true;
  }

  function tickVise(now: number) {
    const previousPhase = vise.stockPhase;
    const previousOpening = vise.opening;
    if (viseMotion) {
      const { from, target, start, duration } = viseMotion;
      const progress = reducedMotion.matches
        ? 1
        : MathUtils.smoothstep(now - start, 0, duration);
      vise.move(
        MathUtils.lerp(from, target, progress),
        now,
        reducedMotion.matches,
      );
      if (progress === 1 && vise.opening === target) viseMotion = undefined;
    }
    const stockMoving = vise.drawStock(now, reducedMotion.matches);
    if (
      previousPhase !== vise.stockPhase ||
      (previousOpening !== vise.opening && !viseMotion)
    )
      reportVise();
    return Boolean(viseMotion) || stockMoving;
  }

  function tick(now: number, dt: number) {
    let moving = false;
    function approach(value: number, target: number, speed: number) {
      const next =
        reducedMotion.matches || Math.abs(value - target) < 0.004
          ? target
          : MathUtils.damp(value, target, speed, dt);
      moving ||= next !== target;
      return next;
    }
    for (const [body, spring] of springs) {
      const steps = Math.ceil(dt / 0.008);
      const step = dt / steps;
      const limit = spring.leaf
        ? 0.125
        : body.name.startsWith("wrench-")
          ? 0.059
          : 0.088;
      const stiffness = spring.leaf
        ? 100
        : body.name.startsWith("hammer-")
          ? 145
          : 215;
      for (let i = 0; i < steps; i++) {
        spring.speed -= (spring.angle * stiffness + spring.speed * 8.9) * step;
        spring.angle = MathUtils.clamp(
          spring.angle + spring.speed * step,
          -limit,
          limit,
        );
      }
      if (
        reducedMotion.matches ||
        (Math.abs(spring.angle) < 0.001 && Math.abs(spring.speed) < 0.018)
      ) {
        body.rotation.set(0, 0, 0);
        springs.delete(body);
      } else {
        body.rotation.x = spring.leaf ? spring.angle * 0.32 : 0;
        body.rotation.z = spring.angle;
        moving = true;
      }
    }

    latch = approach(
      latch,
      Number(caseOpen || (!reducedMotion.matches && lid > 0.036)),
      15,
    );
    lid = approach(lid, Number(caseOpen && latch > 0.68), 7.4);
    caseLid.rotation.x = -lid * MathUtils.degToRad(68);
    latches.rotation.x = latch * MathUtils.degToRad(24);
    stoolSlide = approach(stoolSlide, Number(stoolOut), 7.6);
    stool.position.x = -0.72 * stoolSlide;
    light = approach(light, Number(lampOn), 15);
    diffuser.color.copy(lampOff).lerp(lampLit, light);

    const canOpenDrawer =
      reducedMotion.matches ||
      drawers.every(({ name, slide }) => name === activeDrawer || slide === 0);
    for (const drawer of drawers) {
      drawer.slide = approach(
        drawer.slide,
        Number(canOpenDrawer && drawer.name === activeDrawer),
        8.5,
      );
      drawer.body.position.z = drawer.slide * 0.74;
    }
    // If the old tray seated on this frame, start the next tray on the following frame.
    moving ||= Boolean(activeDrawer) && !canOpenDrawer;
    moving ||= !caseOpen && lid === 0 && latch > 0;

    const typingMoving = tickTyping(now);
    const mouseMoving = tickMouse(now);
    const viseMoving = tickVise(now);
    return moving || typingMoving || mouseMoving || viseMoving;
  }

  return {
    activate,
    sweep,
    tick,
    get changedPose() {
      return (
        lid > 0 ||
        latch > 0 ||
        stoolSlide > 0 ||
        light < 1 ||
        drawers.some((drawer) => drawer.slide > 0) ||
        vise.opening > 0 ||
        vise.stockPhase !== "held"
      );
    },
    visePivot(out: Vector3) {
      return out.copy(vise.axis).setZ(vise.axis.z + vise.opening);
    },
    startTurningVise() {
      viseMotion = undefined;
      selected = "vise";
      publish("正在转动台钳");
    },
    turnVise(radians: number) {
      vise.move(
        vise.requestedOpening + (radians * viseScrewPitch) / (Math.PI * 2),
        performance.now(),
        reducedMotion.matches,
      );
      requestRender();
    },
    stopTurningVise: reportVise,
    dispose() {
      for (const sketch of sketches.values()) sketch.dispose();
      for (const feedback of keys.values())
        for (const key of feedback) key.dispose();
      for (const button of mouse.values()) button.dispose();
      vise.shadow.removeFromParent();
      vise.shadow.geometry.dispose();
      vise.shadow.material.dispose();
    },
  };
}
