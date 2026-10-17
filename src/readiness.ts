import { questions } from './data';
import { pickExam } from './quiz';
import { isStudied } from './store';
import type { Progress } from './types';

const GUESS = 0.25;

/**
 * Вероятность ответить верно. Неизученный вопрос — угадывание (25%).
 * Изученный — личная точность, сглаженная к 25%: (верных + 0,25) / (показов + 1).
 * Так изученный, но ни разу не проверенный вопрос тоже считается угадыванием,
 * а одна случайная удача не даёт сразу 100%.
 */
export function answerProb(p: Progress, id: string): number {
  if (!isStudied(p, id)) return GUESS;
  const s = p.stats[id];
  if (!s || s.shown === 0) return GUESS;
  return (s.correct + GUESS) / (s.shown + 1);
}

export interface Readiness {
  expected: number;
  passProb: number;
  total: number;
  passScore: number;
}

/** Симуляция экзаменов с текущими настройками (число вопросов, способ выборки, проходной балл). */
export function estimateReadiness(p: Progress, runs = 10000): Readiness {
  const { examCount, sampling } = p.settings;
  const total = Math.min(examCount, questions.length);
  const passScore = Math.min(p.settings.passScore, total);
  const prob = new Map(questions.map((q) => [q.id, answerProb(p, q.id)]));
  let sum = 0;
  let passed = 0;
  for (let r = 0; r < runs; r++) {
    let score = 0;
    for (const q of pickExam(questions, total, sampling)) if (Math.random() < prob.get(q.id)!) score++;
    sum += score;
    if (score >= passScore) passed++;
  }
  return { expected: sum / runs, passProb: passed / runs, total, passScore };
}
