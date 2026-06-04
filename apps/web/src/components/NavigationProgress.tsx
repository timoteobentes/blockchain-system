'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    setWidth(0);
    setVisible(true);

    const t1 = setTimeout(() => setWidth(35), 60);
    const t2 = setTimeout(() => setWidth(65), 250);
    const t3 = setTimeout(() => setWidth(85), 600);
    const t4 = setTimeout(() => {
      setWidth(100);
      const t5 = setTimeout(() => { setVisible(false); setWidth(0); }, 280);
      timers.current.push(t5);
    }, 900);

    timers.current = [t1, t2, t3, t4];
    return () => timers.current.forEach(clearTimeout);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2, pointerEvents: 'none' }}>
      <div
        style={{
          height: '100%',
          background: '#c3e438',
          width: `${width}%`,
          transition: width === 0 ? 'none' : 'width 0.4s ease',
          boxShadow: '0 0 8px #c3e43880',
        }}
      />
    </div>
  );
}
