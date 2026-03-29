# 篆刻效果 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增"篆刻效果"模板选项（白色大理石背景 + 黑色篆刻字），作为和浅色宣纸/深色宣纸平行的一个模板选择。用户选择该模板后，导出/预览时笔画呈现凹陷的篆刻效果：正上方均匀光照阴影 + 笔画中心浅/边缘深的立体感 + 沟槽露出白色大理石本体。

**Architecture:**
- 篆刻效果仅在 `composeArtwork` / `composePreview` 阶段实现，对书写体验零侵入
- 通过新增 `Template['engraved']: boolean` 字段标识篆刻模板，compositor 检测该字段走专用渲染路径
- 篆刻笔画分三层叠加：阴影层（正下方模糊阴影）→ 主体层（渐变立体）→ 挖空层（`destination-out` 在笔画中心挖槽露出大理石底色）
- 大理石纹理复用已复制的 `public/textures/marble-white.png`

**Tech Stack:** Canvas 2D API, perfect-freehand, TypeScript

---

## File Map

| File | Role |
|------|------|
| `types/index.ts` | 给 `Template` 接口加 `engraved?: boolean` |
| `data/templates.ts` | 新增 `single-marble` 篆刻模板（单字 category） |
| `lib/beautify/brush-engine.ts` | 新增 `renderEngravedCharacter()` 函数 |
| `lib/beautify/index.ts` | 导出 `renderEngravedCharacter` |
| `lib/composition/compositor.ts` | 检测 `template.engraved`，调用篆刻专用渲染函数 |

---

## Task 1: Add `engraved` field to Template type

**Files:**
- Modify: `types/index.ts:60-69`

- [ ] **Step 1: Read types/index.ts to confirm current Template interface**

```typescript
// Template interface 当前最后几行：
export interface Template {
  id: string;
  name: string;
  categoryId: CategoryId;
  bgColor: string;
  bgImage?: string;
  borderStyle: string;
  textColor: string;
}
```

- [ ] **Step 2: Add `engraved?: boolean` field**

在 `textColor: string;` 后面加一行：
```typescript
  engraved?: boolean;
```

---

## Task 2: Add marble template to data/templates.ts

**Files:**
- Modify: `data/templates.ts` — 在 `single` 模板末尾添加新模板

- [ ] **Step 1: Add `single-marble` template after `single-red`**

在第109行后（`single-red` 模板结束后）插入：
```typescript
  // 单字模板 - 篆刻效果
  {
    id: 'single-marble',
    name: '篆刻效果',
    categoryId: 'single',
    bgColor: '#f0f0f0',
    bgImage: '/textures/marble-white.png',
    borderStyle: 'simple',
    textColor: '#1a1a1a',
    engraved: true,
  },
```

---

## Task 3: Create renderEngravedCharacter in brush-engine.ts

**Files:**
- Modify: `lib/beautify/brush-engine.ts` — 在文件末尾添加新函数

- [ ] **Step 1: Add renderEngravedCharacter function after existing renderCharacter**

```typescript
/**
 * 篆刻效果：渲染单个字的所有笔画
 * 三层叠加：
 * 1. 阴影层 - 正下方模糊阴影（体现光照感）
 * 2. 主体层 - 笔画中心浅/边缘深的渐变（体现立体感）
 * 3. 挖空层 - 在笔画中心用 destination-out 挖槽，露出背景白色（体现凹陷感）
 *
 * @param marbleBgCanvas 已绘制好大理石背景的离屏 canvas，用于挖空后露出底色
 */
export function renderEngravedCharacter(
  ctx: CanvasRenderingContext2D,
  strokes: { points?: Point[]; smoothedPath?: unknown[] }[],
  style: BrushStyle,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 1,
  inkColor: string = '#1a1a1a',
  marbleBgCanvas?: HTMLCanvasElement
): void {
  if (strokes.length === 0) return;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  for (const stroke of strokes) {
    const pts = stroke.points;
    if (!pts || pts.length < 2) continue;
    renderEngravedStroke(ctx, pts, style, inkColor, marbleBgCanvas);
  }

  ctx.restore();
}

/**
 * 篆刻效果单条笔画渲染
 */
function renderEngravedStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  style: BrushStyle,
  inkColor: string,
  marbleBgCanvas?: HTMLCanvasElement
): void {
  if (points.length < 2) return;

  const pfPoints = toPFPoints(points);
  const params = getPFStyleParams(style.id);
  const strokeOutline = getStroke(pfPoints, params) as [number, number][];
  if (strokeOutline.length < 2) return;

  const safeStroke = ensureMinOutlinePoints(strokeOutline);
  const d = quadraticBezierPath(safeStroke);
  const mainPath = new Path2D(d);

  // ---- 第一层：正下方阴影（体现正上方光照） ----
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.shadowBlur = 8 * style.opacity;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4 * style.opacity;
  ctx.fill(mainPath);
  ctx.restore();

  // ---- 第二层：渐变主体层（中心浅/边缘深，体现立体感） ----
  ctx.save();
  ctx.fillStyle = inkColor;
  // 创建一个离屏 canvas 来制作渐变
  const tmpCanvas = document.createElement('canvas');
  const tmpSize = 400;
  tmpCanvas.width = tmpSize;
  tmpCanvas.height = tmpSize;
  const tmpCtx = tmpCanvas.getContext('2d')!;

  // 先填充墨色
  tmpCtx.fillStyle = inkColor;
  tmpCtx.fill(mainPath);

  // 再用渐变做内阴影（中心浅 → 边缘深）
  tmpCtx.globalCompositeOperation = 'destination-in';
  const grad = tmpCtx.createRadialGradient(tmpSize / 2, tmpSize / 2, 0, tmpSize / 2, tmpSize / 2, tmpSize / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');      // 中心：保留更多墨色
  grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  grad.addColorStop(1, 'rgba(0,0,0,0.4)');             // 边缘：变深
  tmpCtx.fillStyle = grad;
  tmpCtx.fill(mainPath);

  // 绘制渐变层
  ctx.drawImage(tmpCanvas, 0, 0);
  ctx.restore();

  // ---- 第三层：挖空沟槽（露出大理石底色） ----
  if (marbleBgCanvas) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fill(mainPath);
    ctx.restore();
  }
}
```

---

## Task 4: Export renderEngravedCharacter

**Files:**
- Modify: `lib/beautify/index.ts`

- [ ] **Step 1: Add export**

在 `export { renderStroke, renderCharacter }` 同一行加入 `renderEngravedCharacter`：
```typescript
export { renderStroke, renderCharacter, renderEngravedCharacter } from './brush-engine';
```

---

## Task 5: Wire in compositor.ts

**Files:**
- Modify: `lib/composition/compositor.ts` — 在 `composeArtwork` 函数中，当 `template.engraved === true` 时调用篆刻专用渲染

- [ ] **Step 1: Read the current renderCharacter calls to understand where to add the conditional**

在 `compositor.ts` 中，`renderCharacter` 在两处被调用：
1. 第81行：春联分支 `renderCharacter(ctx, char.strokes, style, finalX, finalY, scale, template.textColor);`
2. 第126行：非春联分支 `renderCharacter(ctx, char.strokes, style, finalX, finalY, scale, template.textColor);`

- [ ] **Step 2: Import renderEngravedCharacter**

在 `compositor.ts` 第1行的 import 中，把 `renderCharacter` 改为：
```typescript
import { renderCharacter, renderEngravedCharacter } from '../beautify';
```

- [ ] **Step 3: Add engraved check before each renderCharacter call**

对于春联分支（第81行），在调用前加：
```typescript
      if (template.engraved) {
        renderEngravedCharacter(ctx, char.strokes, style, finalX, finalY, scale, template.textColor);
      } else {
        renderCharacter(ctx, char.strokes, style, finalX, finalY, scale, template.textColor);
      }
```

对于非春联分支（第126行），同样替换。

- [ ] **Step 4: For engraved effect, we need the marble background canvas for the carve layer**

`renderEngravedCharacter` 需要一个 `marbleBgCanvas` 参数（已经绘制好大理石背景的离屏 canvas）来做挖空。
需要在 `drawBackground` 之后创建一个离屏 canvas 保存背景，然后在调用 `renderEngravedCharacter` 时传入。

在 `composeArtwork` 函数开头，`await drawBackground` 之后，加入：
```typescript
  // 保存背景层（用于篆刻效果的挖空层）
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext('2d')!;
  bgCtx.drawImage(ctx.canvas, 0, 0);
```

然后在调用 `renderEngravedCharacter` 时传入 `bgCanvas`。

---

## Task 6: Build and test

- [ ] **Step 1: Run pnpm build to check for TypeScript errors**

```bash
cd calligraphy-app && pnpm build
```

- [ ] **Step 2: If there are TypeScript errors, read the error messages, identify the minimal fix, apply it**

Common issues:
- Missing import in compositor.ts
- Parameter type mismatch in renderEngravedCharacter

- [ ] **Step 3: Run pnpm dev and test manually**

1. Start dev server: `cd calligraphy-app && pnpm dev`
2. 在手机浏览器（或 Chrome DevTools 手机模拟器）打开
3. 选择"单字" category
4. 输入一个字，进入书写页，写一个字
5. 进入风格页，选择"自然"风格
6. 进入模板页，确认能看到"篆刻效果"选项
7. 选择篆刻效果，进入预览页，确认视觉效果
8. 进入导出页，确认导出图片的篆刻效果

---

## Self-Review Checklist

- [ ] Template `engraved` field is optional (`engraved?: boolean`)，不影响其他模板
- [ ] `renderEngravedCharacter` 仅在 `composeArtwork`/`composePreview` 阶段被调用，书写画布不受影响
- [ ] 篆刻效果使用的 `bgCanvas` 是 `ctx.canvas` 的快照，在 `drawBackground` 之后创建，正确捕获了大理石纹理
- [ ] `destination-out` 挖空后笔画中心露出的是白色大理石背景，而不是纯白，符合"露出大理石本体"的设定
- [ ] 正上方光照通过 `shadowOffsetY = 4` 的阴影实现（阴影在正下方 = 光线在正上方）
- [ ] 渐变立体感通过 `radialGradient` 从中心浅到边缘深实现
- [ ] 篆刻模板添加到 `single` category，不影响其他 category 的模板数量
