import React, { useEffect, useState } from 'react';

interface DeferredMountProps {
  children: React.ReactNode;
  strategy?: 'idle' | 'raf' | 'timeout';
  timeoutMs?: number;
  placeholder?: React.ReactNode;
}

/**
 * Defers mounting of heavy children to reduce input blocking time.
 * Default: requestIdleCallback with 200ms timeout fallback -> rAF -> setTimeout.
 */
export const DeferredMount: React.FC<DeferredMountProps> = ({
  children,
  strategy = 'idle',
  timeoutMs = 200,
  placeholder = null
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (strategy === 'idle' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(() => setReady(true), { timeout: timeoutMs });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    if (strategy === 'raf') {
      let frame: number;
      const loop = () => { frame = requestAnimationFrame(() => { setReady(true); }); };
      loop();
      return () => cancelAnimationFrame(frame);
    }
    const t = setTimeout(() => setReady(true), timeoutMs);
    return () => clearTimeout(t);
  }, [strategy, timeoutMs]);
  return <>{ready ? children : placeholder}</>;
};
