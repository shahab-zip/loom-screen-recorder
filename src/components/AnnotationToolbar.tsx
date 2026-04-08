import { useState } from 'react';
import { 
  Pencil, 
  Highlighter, 
  Square, 
  Circle, 
  ArrowRight, 
  Type, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2,
  X,
  MousePointer,
  Minus
} from 'lucide-react';

export type AnnotationTool = 
  | 'pointer' 
  | 'pen' 
  | 'highlighter' 
  | 'rectangle' 
  | 'circle' 
  | 'arrow' 
  | 'line'
  | 'text' 
  | 'eraser';

interface AnnotationToolbarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function AnnotationToolbar({
  isOpen,
  onClose,
  activeTool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
}: AnnotationToolbarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const colors = [
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
  ];

  const strokeWidths = [
    { label: 'Thin', value: 2 },
    { label: 'Medium', value: 4 },
    { label: 'Thick', value: 8 },
  ];

  const tools = [
    { id: 'pointer' as const, icon: MousePointer, label: 'Select', shortcut: 'V' },
    { id: 'pen' as const, icon: Pencil, label: 'Pen', shortcut: 'P' },
    { id: 'highlighter' as const, icon: Highlighter, label: 'Highlighter', shortcut: 'H' },
    { id: 'line' as const, icon: Minus, label: 'Line', shortcut: 'L' },
    { id: 'arrow' as const, icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { id: 'rectangle' as const, icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle' as const, icon: Circle, label: 'Circle', shortcut: 'O' },
    { id: 'text' as const, icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'eraser' as const, icon: Eraser, label: 'Eraser', shortcut: 'E' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-6 z-40 animate-slide-up">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-xl shadow-2xl p-2">
        <div className="flex items-center gap-2">
          {/* Drawing Tools */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-700">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              
              return (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  onMouseEnter={() => setShowTooltip(tool.id)}
                  onMouseLeave={() => setShowTooltip(null)}
                  className={`relative group p-1.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-4 h-4" />
                  
                  {showTooltip === tool.id && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                      {tool.label} <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">{tool.shortcut}</kbd>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
            <span className="text-xs text-gray-400 mr-1 text-[10px]" style={{ fontWeight: 600 }}>
              Color
            </span>
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => onColorChange(c.value)}
                onMouseEnter={() => setShowTooltip(`color-${c.value}`)}
                onMouseLeave={() => setShowTooltip(null)}
                className={`relative w-6 h-6 rounded-md transition-all duration-200 ${
                  color === c.value
                    ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-900 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: c.value,
                  border: c.value === '#FFFFFF' ? '1px solid #374151' : 'none'
                }}
                title={c.name}
              >
                {showTooltip === `color-${c.value}` && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                    {c.name}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Stroke Width */}
          <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
            <span className="text-xs text-gray-400 mr-1 text-[10px]" style={{ fontWeight: 600 }}>
              Size
            </span>
            {strokeWidths.map((sw) => (
              <button
                key={sw.value}
                onClick={() => onStrokeWidthChange(sw.value)}
                className={`relative px-2 py-1.5 rounded-lg transition-all duration-200 ${
                  strokeWidth === sw.value
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                title={sw.label}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: sw.value + 2, height: sw.value + 2 }}
                />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-700">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              onMouseEnter={() => setShowTooltip('undo')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                canUndo
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Undo"
            >
              <Undo className="w-4 h-4" />
              {showTooltip === 'undo' && canUndo && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                  Undo <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">⌘Z</kbd>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                </div>
              )}
            </button>
            
            <button
              onClick={onRedo}
              disabled={!canRedo}
              onMouseEnter={() => setShowTooltip('redo')}
              onMouseLeave={() => setShowTooltip(null)}
              className={`relative p-1.5 rounded-lg transition-all duration-200 ${
                canRedo
                  ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Redo"
            >
              <Redo className="w-4 h-4" />
              {showTooltip === 'redo' && canRedo && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                  Redo <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">⌘Y</kbd>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                </div>
              )}
            </button>

            <button
              onClick={onClear}
              onMouseEnter={() => setShowTooltip('clear')}
              onMouseLeave={() => setShowTooltip(null)}
              className="relative p-1.5 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4" />
              {showTooltip === 'clear' && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                  Clear All
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
                </div>
              )}
            </button>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            onMouseEnter={() => setShowTooltip('close')}
            onMouseLeave={() => setShowTooltip(null)}
            className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200"
            title="Close Annotations"
          >
            <X className="w-4 h-4" />
            {showTooltip === 'close' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in z-50">
                Close <kbd className="ml-1 px-1 py-0.5 bg-gray-700 rounded text-xs">Esc</kbd>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}