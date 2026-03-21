'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { Point, Stroke, BrushStyle } from '@/types';
import { BRUSH_STYLES } from '@/lib/beautify/styles';
import { renderStroke } from '@/lib/beautify/brush-engine';

interface WritingCanvasProps {
  onComplete?: () => void;
}

export function WritingCanvas({ onComplete }: WritingCanvasProps) {
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    characters,
    currentCharIndex,
    styleId,
    updateCharacterStrokes,
    saveDraft,
  } = useProjectStore();

  const currentChar = characters[currentCharIndex];
  const style = BRUSH_STYLES[styleId];

  // 当前笔画的点数据
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  // 画布尺寸
  const [canvasSize, setCanvasSize] = useState(320);

  // RAF 相关
  const rafIdRef = useRef<number>(0);
  const pendingRedrawRef = useRef(false);

  // 自适应画布大小
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const size = Math.min(containerWidth - 32, 400);
        setCanvasSize(size);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 辅助：设置 canvas DPR 并返回 ctx
  const setupCanvas = useCallback((canvas: HTMLCanvasElement | null, size: number) => {
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.scale(dpr, dpr);
    return ctx;
  }, []);

  // 绘制米字格（只画一次到 gridCanvas）
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, canvasSize);
    if (!ctx) return;

    const s = canvasSize;
    const lineColor = 'rgba(200, 180, 160, 0.4)';
    const dashColor = 'rgba(200, 180, 160, 0.25)';

    ctx.clearRect(0, 0, s, s);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, s - 4, s - 4);

    ctx.strokeStyle = dashColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, s / 2);
    ctx.lineTo(s, s / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(s / 2, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(0, s);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [canvasSize, setupCanvas]);

  // 绘制已完成笔画到 bgCanvas
  const renderBgCanvas = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas || !currentChar) return;
    const ctx = setupCanvas(canvas, canvasSize);
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const brushStyle: BrushStyle = {
      id: styleId as BrushStyle['id'],
      name: style.name,
      smoothing: style.smoothing,
      widthRange: style.widthRange as [number, number],
      opacity: style.opacity,
      textureType: style.textureType as BrushStyle['textureType'],
    };

    for (const stroke of currentChar.strokes) {
      if (stroke.points && stroke.points.length > 0) {
        renderStroke(ctx, stroke.points, stroke.smoothedPath, brushStyle);
      }
    }
  }, [currentChar, styleId, style, canvasSize, setupCanvas]);

  // 绘制当前笔画到 fgCanvas
  const renderFgCanvas = useCallback(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas || !currentChar) return;
    const ctx = setupCanvas(canvas, canvasSize);
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    const pts = currentStrokeRef.current;
    if (pts.length < 2) return;

    const brushStyle: BrushStyle = {
      id: styleId as BrushStyle['id'],
      name: style.name,
      smoothing: style.smoothing,
      widthRange: style.widthRange as [number, number],
      opacity: style.opacity,
      textureType: style.textureType as BrushStyle['textureType'],
    };

    renderStroke(ctx, pts, [], brushStyle);
  }, [currentChar, styleId, style, canvasSize, setupCanvas]);

  // 统一的 redraw：重绘 fg 层（实时笔画）
  const redrawFg = useCallback(() => {
    renderFgCanvas();
  }, [renderFgCanvas]);

  // RAF 调度：避免每帧多次重绘
  const scheduleRedraw = useCallback(() => {
    if (pendingRedrawRef.current) return;
    pendingRedrawRef.current = true;
    rafIdRef.current = requestAnimationFrame(() => {
      pendingRedrawRef.current = false;
      redrawFg();
    });
  }, [redrawFg]);

  // currentChar 切换时重绘 bg
  useEffect(() => {
    renderBgCanvas();
  }, [renderBgCanvas]);

  // 从 touch 事件获取 canvas 内的坐标
  const getPointFromTouch = (e: Touch, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: Date.now(),
    };
  };

  // 贝塞尔平滑
  const smoothPoints = (points: Point[]): Point[] => {
    if (points.length < 3) return points;
    const smoothed: Point[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      smoothed.push({
        x: (points[i - 1].x + points[i].x * 2 + points[i + 1].x) / 4,
        y: (points[i - 1].y + points[i].y * 2 + points[i + 1].y) / 4,
        t: points[i].t,
        pressure: points[i].pressure,
      });
    }
    smoothed.push(points[points.length - 1]);
    return smoothed;
  };

  const makeBezierPath = (points: Point[]) => {
    const smoothed = smoothPoints(points);
    const paths: { p0: Point; p1: Point; p2: Point; p3: Point }[] = [];
    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p3 = smoothed[i + 1];
      const p1 = { x: (p0.x * 2 + p3.x) / 3, y: (p0.y * 2 + p3.y) / 3, t: p0.t };
      const p2 = { x: (p0.x + p3.x * 2) / 3, y: (p0.y + p3.y * 2) / 3, t: p3.t };
      paths.push({ p0, p1, p2, p3 });
    }
    return paths;
  };

  // 绑定原生 touch 事件
  useEffect(() => {
    const canvas = fgCanvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) return;
      isDrawingRef.current = true;
      const point = getPointFromTouch(e.touches[0], canvas);
      currentStrokeRef.current = [point];
      // 立即重绘 fg
      scheduleRedraw();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current || e.touches.length === 0) return;
      const point = getPointFromTouch(e.touches[0], canvas);
      const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      if (dist < 2) return;
      currentStrokeRef.current.push(point);
      // RAF 调度，不直接重绘
      scheduleRedraw();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const points = currentStrokeRef.current;
      if (points.length < 2) return;

      const stroke: Stroke = {
        id: Math.random().toString(36).substring(2),
        points,
        smoothedPath: makeBezierPath(points),
      };

      const newStrokes = [...currentChar.strokes, stroke];
      updateCharacterStrokes(currentCharIndex, newStrokes);
      currentStrokeRef.current = [];

      // 合并到 bgCanvas
      const bgCanvas = bgCanvasRef.current;
      const canvas = fgCanvasRef.current;
      if (bgCanvas && canvas) {
        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) {
          const dpr = window.devicePixelRatio || 1;
          // 把当前笔画合并到 bg
          const brushStyle: BrushStyle = {
            id: styleId as BrushStyle['id'],
            name: style.name,
            smoothing: style.smoothing,
            widthRange: style.widthRange as [number, number],
            opacity: style.opacity,
            textureType: style.textureType as BrushStyle['textureType'],
          };
          renderStroke(bgCtx, points, stroke.smoothedPath, brushStyle);
        }
        // 清除 fg
        const fgCtx = canvas.getContext('2d');
        if (fgCtx) {
          fgCtx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      saveDraft();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [currentChar, currentCharIndex, updateCharacterStrokes, saveDraft, styleId, style, scheduleRedraw]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
      {/* 当前字提示 */}
      <div className="text-center">
        <span className="text-sm text-ink/50">当前字</span>
        <div className="text-4xl font-bold text-ink mt-1">{currentChar?.character || '?'}</div>
        <span className="text-xs text-ink/40">{currentCharIndex + 1} / {characters.length}</span>
      </div>

      {/* 三层画布容器 */}
      <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
        {/* 米字格层（底层，只画一次） */}
        <canvas
          ref={gridCanvasRef}
          className="absolute top-0 left-0"
          style={{ touchAction: 'none' }}
        />
        {/* 已完成笔画层（中层） */}
        <canvas
          ref={bgCanvasRef}
          className="absolute top-0 left-0"
          style={{ touchAction: 'none' }}
        />
        {/* 当前笔画层（顶层，RAF 重绘） */}
        <canvas
          ref={fgCanvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-ink/40 text-center">
        {isDrawingRef.current ? '书写中...' : '在方格内书写或触摸书写'}
      </p>
    </div>
  );
}
