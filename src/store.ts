import { useSyncExternalStore } from 'react';
import { byId } from './data';
import type { ExamRecord, Progress, QStat, Settings, Srs, Status } from './types';

const KEY = 'georgian-trainer:v1';
const MAX_EXAMS = 30;
/** Сколько верных ответов подряд нужно, чтобы вопрос ушёл из очереди ошибок. */
export const MISTAKE_CLEAR_STREAK = 2;
/** После стольких верных подряд предлагаем отметить вопрос «выученным». */
export const LEARNED_HINT_STREAK = 3;
const DAY = 24 * 60 * 60 * 1000;

export const defaultSettings: Settings = {
  trainCount: 10,
  shuffle: true,
  examCount: 10,
  passScore: 7,
  timerMinutes: 0,
  sampling: 'random',
  theme: 'system',
};

const empty = (): Progress => ({
  version: 2,
  status: {},
  srs: {},
  stats: {},
  mistakes: {},
  exams: [],
  settings: { ...defaultSettings },
});

/** Приводит произвольный объект (localStorage, импорт) к корректному Progress. Бросает ошибку, если это не наш формат. */
export function normalize(input: unknown): Progress {
  if (!input || typeof input !== 'object') throw new Error('Файл не содержит данных прогресса');
  const o = input as Omit<Partial<Progress>, 'version'> & { version?: number; studied?: Record<string, unknown> };
  if (o.version !== 1 && o.version !== 2) throw new Error('Неизвестная версия формата прогресса');
  const p = empty();
  // v1: отметка «изучено» → статус «учу».
  if (o.version === 1) for (const id of Object.keys(o.studied ?? {})) if (byId.has(id)) p.status[id] = 'learning';
  for (const [id, st] of Object.entries(o.status ?? {})) {
    if (byId.has(id) && (st === 'learning' || st === 'learned')) p.status[id] = st;
  }
  for (const [id, s] of Object.entries(o.srs ?? {})) {
    if (p.status[id] !== 'learned' || !s || typeof s !== 'object') continue;
    p.srs[id] = {
      ease: typeof s.ease === 'number' && s.ease >= 1.3 ? s.ease : 2.5,
      interval: num(s.interval),
      reps: num(s.reps),
      due: typeof s.due === 'string' ? s.due : new Date().toISOString(),
    };
  }
  for (const id of Object.keys(p.status)) if (p.status[id] === 'learned' && !p.srs[id]) p.srs[id] = newSrs();
  for (const [id, s] of Object.entries(o.stats ?? {})) {
    if (!byId.has(id) || !s || typeof s !== 'object') continue;
    p.stats[id] = {
      shown: num(s.shown),
      correct: num(s.correct),
      wrong: num(s.wrong),
      streak: num(s.streak),
      last: typeof s.last === 'string' ? s.last : undefined,
    };
  }
  for (const [id, t] of Object.entries(o.mistakes ?? {})) if (byId.has(id)) p.mistakes[id] = String(t);
  if (Array.isArray(o.exams)) p.exams = o.exams.filter((e) => e && Array.isArray(e.answers)).slice(0, MAX_EXAMS);
  p.settings = { ...defaultSettings, ...(o.settings ?? {}) };
  return p;
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

function load(): Progress {
  try {
    const s = localStorage.getItem(KEY);
    return s ? normalize(JSON.parse(s)) : empty();
  } catch {
    return empty();
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function set(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* переполнение или приватный режим — продолжаем в памяти */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => state);
}
export const getProgress = () => state;

// ---------- Статусы и интервальное повторение ----------

export const statusOf = (p: Progress, id: string): Status => p.status[id] ?? 'new';
/** «Изучено» = статус «учу» или «выучен». */
export const isStudied = (p: Progress, id: string) => !!p.status[id];
export const isDue = (p: Progress, id: string, now = Date.now()) =>
  p.status[id] === 'learned' && !!p.srs[id] && Date.parse(p.srs[id].due) <= now;

export const STATUS_LABEL: Record<Status, string> = { new: 'новый', learning: 'учу', learned: 'выучен' };

/** Первое повторение — через день после отметки «выучен». */
const newSrs = (): Srs => ({ ease: 2.5, interval: 1, reps: 0, due: new Date(Date.now() + DAY).toISOString() });

/**
 * Упрощённый SM-2. Верно: интервал 1 → 3 дня → ×ease (≈8, 20, 50 дней…), ease чуть растёт.
 * Неверно: вопрос возвращается в «учу» (расписание сбрасывается).
 */
function review(s: Srs, correct: boolean): Srs | null {
  if (!correct) return null;
  const reps = s.reps + 1;
  const interval = reps === 1 ? 3 : Math.round(Math.max(s.interval, 3) * s.ease);
  return { ease: Math.min(3, s.ease + 0.05), interval, reps, due: new Date(Date.now() + interval * DAY).toISOString() };
}

function applyReview(p: Progress, status: Progress['status'], srs: Progress['srs'], id: string, correct: boolean) {
  if (p.status[id] !== 'learned') return;
  const next = review(srs[id] ?? newSrs(), correct);
  if (next) srs[id] = next;
  else {
    delete srs[id];
    status[id] = 'learning';
  }
}

// ---------- Действия ----------

export function setStatus(ids: string[], value: Status) {
  const status = { ...state.status };
  const srs = { ...state.srs };
  for (const id of ids) {
    if (value === 'new') delete status[id];
    else status[id] = value;
    if (value === 'learned') srs[id] ??= newSrs();
    else delete srs[id];
  }
  set({ ...state, status, srs });
}

/** Галочка «изучено»: включение не понижает «выучен» до «учу». */
export function setStudied(ids: string[], value: boolean) {
  setStatus(value ? ids.filter((id) => !state.status[id]) : ids, value ? 'learning' : 'new');
}

export function updateSettings(patch: Partial<Settings>) {
  set({ ...state, settings: { ...state.settings, ...patch } });
}

/** Учитывает ответы: статистика, очередь ошибок, расписание повторения выученных. */
export function recordAnswers(results: { id: string; correct: boolean }[]) {
  const now = new Date().toISOString();
  const stats = { ...state.stats };
  const mistakes = { ...state.mistakes };
  const status = { ...state.status };
  const srs = { ...state.srs };
  for (const { id, correct } of results) {
    const s: QStat = { ...(stats[id] ?? { shown: 0, correct: 0, wrong: 0, streak: 0 }) };
    s.shown++;
    s.last = now;
    if (correct) {
      s.correct++;
      s.streak++;
      if (mistakes[id] && s.streak >= MISTAKE_CLEAR_STREAK) delete mistakes[id];
    } else {
      s.wrong++;
      s.streak = 0;
      mistakes[id] = now;
    }
    stats[id] = s;
    applyReview(state, status, srs, id, correct);
  }
  set({ ...state, stats, mistakes, status, srs });
}

/**
 * Самооценка в режиме карточек. Не влияет на статистику точности (это не проверенный ответ),
 * но «не знаю» отправляет вопрос в очередь ошибок, а для выученных сдвигает расписание повторения.
 */
export function recordFlashcard(id: string, known: boolean) {
  const mistakes = { ...state.mistakes };
  const status = { ...state.status };
  const srs = { ...state.srs };
  if (!known) mistakes[id] = new Date().toISOString();
  applyReview(state, status, srs, id, known);
  set({ ...state, mistakes, status, srs });
}

export function addExam(rec: ExamRecord) {
  set({ ...state, exams: [rec, ...state.exams].slice(0, MAX_EXAMS) });
}

export function exportProgress(): string {
  return JSON.stringify({ app: 'georgian-trainer', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importProgress(json: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Файл не является корректным JSON');
  }
  set(normalize(parsed));
}

export function resetProgress() {
  set({ ...empty(), settings: state.settings });
}
