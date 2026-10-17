import raw from './data/questions.json';
import type { Question } from './types';

export const questions = raw as Question[];
export const byId = new Map(questions.map((q) => [q.id, q]));

export interface Subsection {
  id: string;
  title: string;
  questions: Question[];
}
export interface Section {
  id: string;
  title: string;
  subsections: Subsection[];
  questions: Question[];
}

export const sections: Section[] = [];
for (const q of questions) {
  let s = sections.find((x) => x.id === q.section);
  if (!s) sections.push((s = { id: q.section, title: q.sectionTitle, subsections: [], questions: [] }));
  let sub = s.subsections.find((x) => x.id === q.subsection);
  if (!sub) s.subsections.push((sub = { id: q.subsection, title: q.subsectionTitle, questions: [] }));
  sub.questions.push(q);
  s.questions.push(q);
}
export const subsections = sections.flatMap((s) => s.subsections);
export const subsectionById = new Map(subsections.map((s) => [s.id, s]));
