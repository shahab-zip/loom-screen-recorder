import { useEffect, useRef, useState, useCallback } from 'react';
import { GripHorizontal } from 'lucide-react';

interface CameraBubbleProps {
  stream: MediaStream | null;
}

type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

const CORNER_STYLES: Record<Corner, React.CSSProperties> = {
  'bottom-right': { bottom: 24, right: 24 },
  'bottom-left':  { bottom: 24, left:  24 },
  'top-right':    { top:    24, right: 24 },
  'top-left':     { top:    24, left:  24 },
};

/** Draggable PiP camera bubble shown during screen + camera recordings */
export function CameraBubble({ stream }: CameraBubbleProps) {
  // Always-present video ref — never conditionally rendered
  const videoRef = useRef<HTMLVideoElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [corner, setCorner] = useState<Corner>('bottom-right');
  const [isDragging, setIsDragging] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Pipe the stream into the video element whenever it changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream && stream.getVideoTracks().length > 0) {
      video.srcObject = stream;
      video.play()
        .then(() => setIsLive(true))
        .catch((err) => {
          console.warn('CameraBubble: video.play() failed', err);
          setIsLive(false);
        });
    } else {
      video.srcObject = null;
      setIsLive(false);
    }

    return () => {
      if (video) {
        video.srcObject = null;
        setIsLive(false);
      }
    };
  }, [stream]);

  // Snap cursor position to the nearest screen corner
  const snapToCorner = useCallback((clientX: number, clientY: number) => {
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    if (clientX < midX && clientY < midY) setCorner('top-left');
    else if (clientX >= midX && clientY < midY) setCorner('top-right');
    else if (clientX < midX && clientY >= midY) setCorner('bottom-left');
    else setCorner('bottom-right');
  }, []);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const bubble = bubbleRef.current;

    const onMove = (ev: MouseEvent) => {
      if (!bubble) return;
      const hw = bubble.offsetWidth / 2;
      const hh = bubble.offsetHeight / 2;
      // Clamp within viewport
      const x = Math.max(hw, Math.min(window.innerWidth - hw, ev.clientX));
      const y = Math.max(hh, Math.min(window.innerHeight - hh, ev.clientY));
      bubble.style.left   = `${x - hw}px`;
      bubble.style.top    = `${y - hh}px`;
      bubble.style.right  = 'auto';
      bubble.style.bottom = 'auto';
    };

    const onUp = (ev: MouseEvent) => {
      setIsDragging(false);
      if (bubble) {
        bubble.style.left = bubble.style.top = bubble.style.right = bubble.style.bottom = '';
      }
      snapToCorner(ev.clientX, ev.clientY);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [snapToCorner]);

  // Touch drag
  const handleTouchStart = useCallback((_e: React.TouchEvent) => {
    const bubble = bubbleRef.current;

    const onMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const t = ev.touches[0];
      if (!bubble) return;
      const hw = bubble.offsetWidth / 2;
      const hh = bubble.offsetHeight / 2;
      const x = Math.max(hw, Math.min(window.innerWidth - hw, t.clientX));
      const y = Math.max(hh, Math.min(window.innerHeight - hh, t.clientY));
      bubble.style.left   = `${x - hw}px`;
      bubble.style.top    = `${y - hh}px`;
      bubble.style.right  = 'auto';
      bubble.style.bottom = 'auto';
    };

    const onEnd = (ev: TouchEvent) => {
      const t = ev.changedTouches[0];
      if (bubble) {
        bubble.style.left = bubble.style.top = bubble.style.right = bubble.style.bottom = '';
      }
      snapToCorner(t.clientX, t.clientY);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [snapToCorner]);

  if (!stream) return null;

  return (
    <div
      ref={bubbleRef}
      className="fixed z-[60] select-none"
      style={{
        ...CORNER_STYLES[corner],
        transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className={`relative w-44 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 bg-gray-900 ${
          isDragging ? 'border-blue-400 scale-105' : 'border-white/30'
        }`}
        style={{ transition: isDragging ? 'none' : 'border-color 0.2s, transform 0.2s' }}
      >
        {/* ── Always-rendered video element ── */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} /* mirror front-facing cam */
          autoPlay
          muted
          playsInline
        />

        {/* Placeholder shown while camera isn't live yet */}
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-500 fill-current">
                <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </div>
            <span className="text-gray-500 text-[11px]">Starting camera…</span>
          </div>
        )}

        {/* Live badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full z-10">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-[10px] font-semibold tracking-wide">LIVE</span>
        </div>

        {/* Drag handle */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-1.5
                     bg-gradient-to-t from-black/60 to-transparent cursor-grab active:cursor-grabbing z-10"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          title="Drag to move"
        >
          <GripHorizontal className="w-4 h-4 text-white/50" />
        </div>
      </div>
    </div>
  );
}
