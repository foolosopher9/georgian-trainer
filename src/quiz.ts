import { subsections } from './data';
import { LETTERS, type Letter, type Question, type Sampling } from './types';

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = <T,>(arr: readonly T[], n: number): T[] => shuffle(arr).slice(0, n);

/** Вопрос в сессии: варианты в порядке показа, у каждого — исходная буква. */
export interface SessionItem {
  q: Question;
  /** Исходные буквы в порядке показа. Показываются с новыми буквами ა–დ по порядку. */
  order: Letter[];
}

export function makeItems(qs: Question[], shuffleOptions: boolean): SessionItem[] {
  return qs.map((q) => ({ q, order: shuffleOptions ? shuffle(LETTERS) : LETTERS.slice() }));
}

/**
 * Выборка вопросов экзамена.
 * proportional — поровну из каждого подраздела (методом наибольшего остатка; при 10 вопросах — по одному
 * из каждого из 10 подразделов), так что и разделы представлены пропорционально их размеру.
 */
export function pickExam(all: Question[], n: number, mode: Sampling): Question[] {
  n = Math.min(n, all.length);
  if (mode === 'random') return sample(all, n);
  const groups = subsections.map((s) => s.questions);
  const total = all.length;
  const quotas = groups.map((g) => (n * g.length) / total);
  const counts = quotas.map(Math.floor);
  let left = n - counts.reduce((a, b) => a + b, 0);
  // Остаток раздаём группам с наибольшей дробной частью, при равенстве — случайно.
  const order = shuffle(groups.map((_, i) => i)).sort((a, b) => (quotas[b] % 1) - (quotas[a] % 1));
  for (const i of order) {
    if (left <= 0) break;
    counts[i]++;
    left--;
  }
  return shuffle(groups.flatMap((g, i) => sample(g, counts[i])));
}

/** Доля тренировки, отдаваемая выученным вопросам, которым пора на повторение. */
export const REVIEW_SHARE = 0.3;

/**
 * Состав тренировки: вопросы «учу» + выученные, у которых наступил срок повторения
 * (самые просроченные первыми). Повторению отдаётся до 30% вопросов, а если «учу» не хватает — больше.
 */
export function buildTraining(learning: Question[], due: { q: Question; due: number }[], n: number) {
  const overdue = due.slice().sort((a, b) => a.due - b.due).map((d) => d.q);
  const k = Math.min(overdue.length, Math.max(Math.ceil(n * REVIEW_SHARE), n - learning.length));
  const rest = Math.min(learning.length, n - k);
  return { questions: shuffle([...sample(learning, rest), ...overdue.slice(0, k)]), review: k };
}
