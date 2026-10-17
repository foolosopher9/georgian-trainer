export type Letter = 'ა' | 'ბ' | 'გ' | 'დ';
export const LETTERS: Letter[] = ['ა', 'ბ', 'გ', 'დ'];

export interface Option {
  key: Letter;
  text: string;
}

export interface Question {
  id: string;
  section: string;
  sectionTitle: string;
  subsection: string;
  subsectionTitle: string;
  prompt: string;
  context?: string;
  underline?: string;
  options: Option[];
  answer: Letter;
}

export interface QStat {
  shown: number;
  correct: number;
  wrong: number;
  /** Верных ответов подряд (сбрасывается при ошибке). */
  streak: number;
  /** ISO-время последней попытки. */
  last?: string;
}

export type Sampling = 'random' | 'proportional';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  trainCount: number;
  shuffle: boolean;
  examCount: number;
  /** Минимум верных ответов для «сдал». Ограничивается числом вопросов экзамена. */
  passScore: number;
  /** Таймер экзамена в минутах, 0 — выключен. */
  timerMinutes: number;
  sampling: Sampling;
  theme: Theme;
}

export interface ExamAnswer {
  id: string;
  /** Буква исходного варианта (до перемешивания), null — без ответа. */
  chosen: Letter | null;
  correct: boolean;
}

export interface ExamRecord {
  date: string;
  score: number;
  total: number;
  passScore: number;
  passed: boolean;
  durationSec: number;
  timedOut: boolean;
  answers: ExamAnswer[];
}

/** Статус вопроса. «new» не хранится: вопрос без записи в status — новый. */
export type Status = 'new' | 'learning' | 'learned';

/** Расписание интервального повторения (упрощённый SM-2) для выученных вопросов. */
export interface Srs {
  ease: number;
  /** Текущий интервал в днях. */
  interval: number;
  /** Успешных повторений подряд. */
  reps: number;
  /** ISO-время, когда вопрос пора повторить. */
  due: string;
}

export interface Progress {
  version: 2;
  status: Record<string, Exclude<Status, 'new'>>;
  srs: Record<string, Srs>;
  stats: Record<string, QStat>;
  /** Очередь «работы над ошибками»: id → время попадания. */
  mistakes: Record<string, string>;
  exams: ExamRecord[];
  settings: Settings;
}
