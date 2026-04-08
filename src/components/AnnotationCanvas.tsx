import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { AnnotationTool } from './AnnotationToolbar';

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  type: AnnotationTool;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string;
}

export interface AnnotationCanvasHandle {
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface AnnotationCanvasProps {
  isActive: boolean;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export const AnnotationCanvas = forwardRef<AnnotationCanvasHandle, AnnotationCanvasProps>(
  function AnnotationCanvas({ isActive, tool, color, strokeWidth, onHistoryChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [history, setHistory] = useState<Annotation[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [textInput, setTextInput] = useState<{ x: number; y: number; text: string } | null>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      undo,
      redo,
      clearAll,
      get canUndo() { return historyIndex > 0; },
      get canRedo() { return historyIndex < history.length - 1; },
    }), [historyIndex, history.length]);

    // Notify parent of history state changes
    useEffect(() => {
      onHistoryChange?.(historyIndex > 0, historyIndex < history.length - 1);
    }, [historyIndex, history.length, onHistoryChange]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const handleResize = () => {
        if (!canvas) return;
        const tempAnnotations = [...annotations];
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        redrawAnnotations(tempAnnotations);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
      redrawAnnotations(annotations);
    }, [annotations]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z') {
            e.preventDefault();
            undo();
          } else if (e.key === 'y') {
            e.preventDefault();
            redo();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [historyIndex, history]);

    const redrawAnnotations = (anns: Annotation[]) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      anns.forEach((ann) => drawAnnotation(ctx, ann));
    };

    const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (ann.type) {
        case 'pen':
        case 'eraser':
          if (ann.points.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
          break;

        case 'highlighter':
          if (ann.points.length < 2) return;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = ann.strokeWidth * 3;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i].x, ann.points[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;

        case 'line':
          if (ann.points.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          ctx.lineTo(ann.points[ann.points.length - 1].x, ann.points[ann.points.length - 1].y);
          ctx.stroke();
          break;

        case 'arrow': {
          if (ann.points.length < 2) return;
          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          const angle = Math.atan2(end.y - start.y, end.x - start.x);
          const arrowLength = 20;
          ctx.beginPath();
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          break;
        }

        case 'rectangle': {
          if (ann.points.length < 2) return;
          const rectStart = ann.points[0];
          const rectEnd = ann.points[ann.points.length - 1];
          ctx.strokeRect(rectStart.x, rectStart.y, rectEnd.x - rectStart.x, rectEnd.y - rectStart.y);
          break;
        }

        case 'circle': {
          if (ann.points.length < 2) return;
          const circleStart = ann.points[0];
          const circleEnd = ann.points[ann.points.length - 1];
          const radius = Math.sqrt(
            Math.pow(circleEnd.x - circleStart.x, 2) + Math.pow(circleEnd.y - circleStart.y, 2)
          );
          ctx.beginPath();
          ctx.arc(circleStart.x, circleStart.y, radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }

        case 'text':
          if (ann.text && ann.points.length > 0) {
            ctx.font = `${ann.strokeWidth * 6}px Space Grotesk, sans-serif`;
            ctx.fillStyle = ann.color;
            ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
          }
          break;
      }
    };

    const addToHistory = (newAnnotations: Annotation[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isActive || tool === 'pointer') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (tool === 'text') {
        setTextInput({ x, y, text: '' });
        return;
      }

      setIsDrawing(true);
      setCurrentAnnotation({ type: tool, points: [{ x, y }], color, strokeWidth });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !currentAnnotation || !isActive) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const updatedAnnotation = {
        ...currentAnnotation,
        points: [...currentAnnotation.points, { x, y }],
      };

      setCurrentAnnotation(updatedAnnotation);
      redrawAnnotations([...annotations, updatedAnnotation]);
    };

    const handleMouseUp = () => {
      if (!isDrawing || !currentAnnotation) return;

      const newAnnotations = [...annotations, currentAnnotation];
      setAnnotations(newAnnotations);
      setIsDrawing(false);
      setCurrentAnnotation(null);
      addToHistory(newAnnotations);
    };

    const handleTextSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!textInput || !textInput.text.trim()) {
        setTextInput(null);
        return;
      }

      const newAnnotation: Annotation = {
        type: 'text',
        points: [{ x: textInput.x, y: textInput.y }],
        color,
        strokeWidth,
        text: textInput.text,
      };

      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      setTextInput(null);
      addToHistory(newAnnotations);
    };

    const undo = () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setAnnotations(history[newIndex]);
      }
    };

    const redo = () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setAnnotations(history[newIndex]);
      }
    };

    const clearAll = () => {
      setAnnotations([]);
      addToHistory([]);
    };

    if (!isActive) return null;

    return (
      <>
        <canvas
          ref={canvasRef}
          className="fixed inset-0 z-30 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: tool === 'pointer' ? 'default' :
                   tool === 'text' ? 'text' :
                   tool === 'eraser' ? 'not-allowed' : 'crosshair'
          }}
        />

        {textInput && (
          <form
            onSubmit={handleTextSubmit}
            className="fixed z-40 animate-fade-in"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              type="text"
              autoFocus
              value={textInput.text}
              onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
              onBlur={handleTextSubmit}
              className="px-3 py-2 bg-white/90 backdrop-blur-sm border-2 border-red-500 rounded-lg text-gray-900 focus:outline-none shadow-xl"
              placeholder="Type text..."
              style={{
                fontSize: `${strokeWidth * 6}px`,
                color: color,
                minWidth: '200px'
              }}
            />
          </form>
        )}
      </>
    );
  }
);
