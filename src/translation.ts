import { useSyncExternalStore } from 'react';
import raw from './data/translations.json';
import type { Letter } from './types';

export interface QTranslation {
  context?: string;
  options: Record<Letter, string>;
}
interface TranslationsFile {
  prompts: Record<string, string>;
  items: Record<string, QTranslation>;
}
const data = raw as unknown as TranslationsFile;

export const promptTranslation = (prompt: string) => data.prompts[prompt];
export const translationOf = (id: string): QTranslation | undefined => data.items[id];

// Показ перевода — общий переключатель (остаётся включённым при переходе к следующему вопросу).
const KEY = 'georgian-trainer:show-translation';
let show = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();
const listeners = new Set<() => void>();

export function toggleTranslation() {
  show = !show;
  try {
    localStorage.setItem(KEY, show ? '1' : '0');
  } catch {
    /* не критично */
  }
  listeners.forEach((l) => l());
}

export function useShowTranslation(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => show,
  );
}
