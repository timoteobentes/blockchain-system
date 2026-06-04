'use client';
import { useConnectionMode } from '@/hooks/useConnectionMode';

export function ModeIndicator({ compact = false }: { compact?: boolean }) {
  const info = useConnectionMode();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '4px 10px' : '5px 12px',
        borderRadius: 20,
        background: `${info.color}12`,
        border: `1px solid ${info.color}28`,
        cursor: 'default',
      }}
      title={info.description}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: info.color,
          flexShrink: 0,
          boxShadow: `0 0 5px ${info.color}80`,
        }}
      />
      <span
        style={{
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
          color: info.color,
          whiteSpace: 'nowrap',
        }}
      >
        {info.label}
      </span>
    </div>
  );
}
