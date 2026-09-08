import { useEffect, useRef, useState } from 'react';

export function useDeleteUndo(enabled: boolean) {
  const entries = useRef<{ label: string; restore: () => void }[]>([]);
  const [label, setLabel] = useState('');
  const clear = () => { entries.current = []; setLabel(''); };
  useEffect(() => { if (!enabled) clear(); }, [enabled]);
  const register = (label: string, restore: () => void) => {
    entries.current = [...entries.current.slice(-9), { label, restore }];
    setLabel(label);
  };
  const undo = () => {
    if (!enabled) return;
    const entry = entries.current.at(-1);
    if (!entry) return;
    // Keep the entry if persistence fails, so it can be retried.
    entry.restore();
    entries.current.pop();
    setLabel(entries.current.at(-1)?.label ?? '');
  };
  return { label, register, undo, clear };
}
