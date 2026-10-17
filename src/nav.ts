import { useSyncExternalStore } from 'react';
import type { SessionItem } from './quiz';

// ---------- Hash-маршрутизация (работает на GitHub Pages без настройки сервера) ----------

const subscribeHash = (l: () => void) => {
  window.addEventListener('hashchange', l);
  return () => window.removeEventListener('hashchange', l);
};

/** Текущий путь без «#», например «/q/I.1.6». */
export function useRoute(): string {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return decodeURIComponent(hash.replace(/^#/, '')) || '/';
}

export function navigate(path: string, replace = false) {
  const url = '#' + path;
  if (replace) window.location.replace(url);
  else window.location.hash = path;
  window.scrollTo(0, 0);
}

// ---------- Текущая сессия (тренировка / ошибки / экзамен) — только в памяти ----------

export type SessionKind = 'train' | 'mistakes' | 'exam' | 'cards';
export interface Session {
  kind: SessionKind;
  items: SessionItem[];
  startedAt: number;
}

let session: Session | null = null;
const listeners = new Set<() => void>();

export function startSession(kind: SessionKind, items: SessionItem[]) {
  session = { kind, items, startedAt: Date.now() };
  listeners.forEach((l) => l());
  navigate(kind === 'exam' ? '/exam/run' : kind === 'cards' ? '/cards/run' : '/session');
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}
