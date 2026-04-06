import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Placement = 'top' | 'bottom' | 'right';

interface TooltipProps {
  text: string;
  children: ReactNode;
  delay?: number;
  side?: Placement;
  className?: string;
}

function computePosition(rect: DOMRect, side: Placement) {
  switch (side) {
    case 'bottom':
      return { x: rect.left + rect.width / 2, y: rect.bottom };
    case 'right':
      return { x: rect.right, y: rect.top + rect.height / 2 };
    case 'top':
    default:
      return { x: rect.left + rect.width / 2, y: rect.top };
  }
}

const wrapperClass: Record<Placement, string> = {
  top: '-translate-x-1/2 -translate-y-full -mt-2',
  bottom: '-translate-x-1/2 mt-2',
  right: 'ml-2',
};

function Arrow({ side }: { side: Placement }) {
  switch (side) {
    case 'bottom':
      return <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-transparent border-b-satisfactory-orange/40" />;
    case 'right':
      return <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-transparent border-r-satisfactory-orange/40" />;
    case 'top':
    default:
      return <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-satisfactory-orange/40" />;
  }
}

export function Tooltip({ text, children, delay = 400, side = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const triggerRef = useRef<HTMLSpanElement>(null);

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPos(computePosition(rect, side));
      }
      setShow(true);
    }, delay);
  }, [delay, side]);

  const handleLeave = useCallback(() => {
    clearTimeout(timerRef.current);
    setShow(false);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className={className ?? 'inline-flex'}
      >
        {children}
      </span>
      {show && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-tooltip-in"
          style={{ left: pos.x, top: pos.y }}
        >
          <div className={`relative ${wrapperClass[side]} max-w-[260px]`}>
            <div
              className="bg-satisfactory-darker/95 border border-satisfactory-orange/40 px-2.5 py-1.5 shadow-lg"
              style={{ clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))' }}
            >
              <div className="text-[10px] text-satisfactory-text leading-relaxed font-industrial">
                {text}
              </div>
            </div>
            <Arrow side={side} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
