import { useCallback, useEffect, useRef } from 'react';
import { useActivityStore } from '../store/activityStore';

export interface TimerState {
  topicRef: string | null;
  lastAt: number;
  lastInteractionAt: number;
  hidden: boolean;
}

export function advanceTimer(state: TimerState, now: number, hidden = state.hidden, idleMs = 60_000) {
  if (now < state.lastAt) return { state: { ...state, lastAt: now, hidden }, milliseconds: 0 };
  const end = Math.min(now, state.lastInteractionAt + idleMs);
  const milliseconds = state.topicRef && !state.hidden ? Math.max(0, end - state.lastAt) : 0;
  return { state: { ...state, lastAt: now, hidden }, milliseconds };
}

export function useStudyTimer(topicRef: string | null) {
  const recordInterval = useActivityStore((state) => state.recordInterval);
  const timer = useRef<TimerState>({ topicRef, lastAt: Date.now(), lastInteractionAt: Date.now(), hidden: document.hidden });
  const flush = useCallback(() => {
    const current = timer.current;
    const now = Date.now();
    const result = advanceTimer(current, now, document.hidden);
    if (result.milliseconds && current.topicRef) recordInterval(current.topicRef, current.lastAt, current.lastAt + result.milliseconds);
    timer.current = { ...result.state, topicRef };
  }, [recordInterval, topicRef]);
  useEffect(() => {
    timer.current = { topicRef, lastAt: Date.now(), lastInteractionAt: Date.now(), hidden: document.hidden };
    if (!topicRef) return undefined;
    const interact = () => { timer.current.lastInteractionAt = Date.now(); };
    const visibility = () => { flush(); timer.current.hidden = document.hidden; timer.current.lastAt = Date.now(); };
    const interval = window.setInterval(flush, 5_000);
    const pagehide = () => flush();
    window.addEventListener('mousemove', interact);
    window.addEventListener('keydown', interact);
    window.addEventListener('pointerdown', interact);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    return () => {
      flush();
      window.clearInterval(interval);
      window.removeEventListener('mousemove', interact);
      window.removeEventListener('keydown', interact);
      window.removeEventListener('pointerdown', interact);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
    };
  }, [flush, topicRef]);
}
