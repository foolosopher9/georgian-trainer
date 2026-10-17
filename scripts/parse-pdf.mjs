// Разбор data/tests.pdf → src/data/questions.json.
// Требует pdftotext (poppler): brew install poppler
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PDF = 'data/tests.pdf';
const OUT = 'src/data/questions.json';
const HEADER = 'ტესტები საქართველოს მოქალაქეობის მოპოვებისათვის ქართულ ენაში';
const LETTERS = ['ა', 'ბ', 'გ', 'დ'];
const UNDERLINE_IDS = ['I.1.6', 'I.1.7', 'I.1.8', 'I.1.9', 'I.1.10', 'I.1.11'];

const pdftotext = (...args) =>
  execFileSync('pdftotext', [...args, '-enc', 'UTF-8', PDF, '-'], { encoding: 'utf8' });

const raw = pdftotext();
const layout = pdftotext('-layout');

// Слова, перенесённые с дефисом: в raw-режиме pdftotext склеивает их без дефиса
// («ერთ-\nერთი» → «ერთერთი»). Находим такие переносы в layout-режиме.
const hyphenFixes = [];
{
  const lines = layout.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const m = lines[i].match(/(\S+)-\s*$/);
    if (!m || /^[–-]$/.test(m[1])) continue;
    const next = lines[i + 1].trim().split(/\s+/)[0];
    if (!next) continue;
    const head = m[1];
    const tail = next.replace(/[.,;:!?»“"]+$/, '');
    hyphenFixes.push({ glued: head + tail, fixed: `${head}-${tail}` });
  }
}

// --- Очистка ---
let text = raw.replaceAll('\f', '\n');
// Колонтитул может стоять посреди строки — удаляем его везде.
text = text.split(HEADER).join('\n');
for (const { glued, fixed } of hyphenFixes) text = text.split(glued).join(fixed);

let lines = text
  .split('\n')
  .map((l) => l.replace(/\s+$/, ''))
  .filter((l) => l.trim() !== '' && !/^\s*\d+\s*$/.test(l)); // пустые строки и номера страниц

const start = lines.findIndex((l) => /^I\. /.test(l));
lines = lines.slice(start);

// --- Ключи: «I.1.1. - ბ)», «I.1.14 - გ)», «II.1.13. -ბ)», в т.ч. в конце строки варианта ---
const answers = {};
const KEY_RE = /(I{1,3}\.\d\.\d{1,2})\.?\s*-\s*([ა-დ])\)/g;
lines = lines
  .map((l) =>
    l.replace(KEY_RE, (_, id, letter) => {
      if (answers[id] && answers[id] !== letter) throw new Error(`Два разных ключа для ${id}`);
      answers[id] = letter;
      return '';
    }).replace(/\s+$/, ''),
  )
  .filter((l) => l.trim() !== '');

// --- Вопросы ---
const questions = [];
let section = null, sectionTitle = null, subNum = null, subsectionTitle = null;
let cur = null;

const flush = () => {
  if (cur) questions.push(cur);
  cur = null;
};

for (const line of lines) {
  let m;
  if ((m = line.match(/^(I{1,3})\. (.+)$/))) {
    flush();
    section = m[1];
    sectionTitle = m[2].trim();
    continue;
  }
  if ((m = line.match(/^(\d)\. (.+)$/))) {
    flush();
    subNum = m[1];
    subsectionTitle = m[2].trim();
    continue;
  }
  if ((m = line.match(/^(I{1,3}\.\d\.\d{1,2})\.\s+(.*)$/))) {
    flush();
    const id = m[1];
    const subsection = id.split('.').slice(0, 2).join('.');
    if (subsection !== `${section}.${subNum}`) throw new Error(`${id} вне своего подраздела`);
    cur = { id, section, sectionTitle, subsection, subsectionTitle, body: [m[2]] };
    continue;
  }
  if (!cur) throw new Error(`Строка вне вопроса: ${line}`);
  cur.body.push(line);
}
flush();

// Разбор тела вопроса на prompt / context / options.
const stripEnd = (s) => s.replace(/[\s;.!]+$/u, '').trim();
const oneLine = (s) => s.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();

function joinContext(ctxLines) {
  if (!ctxLines.length) return undefined;
  const isDialog = ctxLines[0].trim().startsWith('–');
  const out = [];
  for (const raw of ctxLines) {
    const l = raw.trim();
    if (out.length === 0 || (isDialog && l.startsWith('–'))) out.push(l);
    else out[out.length - 1] += ' ' + l; // перенос строки внутри реплики / абзаца
  }
  return out.join('\n');
}

const result = questions.map((q) => {
  const body = q.body.join('\n');
  // Маркеры вариантов «ა)» … «დ)» строго по порядку: в начале строки или после «;»/«?»/«.» (однострочные вопросы).
  const positions = [];
  let from = 0;
  for (const letter of LETTERS) {
    const re = new RegExp(`(^|\\n|[;?.!:]\\s*)${letter}\\)\\s*`, 'g');
    re.lastIndex = from;
    const mm = re.exec(body);
    if (!mm) throw new Error(`${q.id}: не найден вариант ${letter})\n${body}`);
    positions.push({ letter, cut: mm.index + mm[1].length, textStart: mm.index + mm[0].length });
    from = mm.index + mm[0].length;
  }
  const head = body.slice(0, positions[0].cut);
  const options = positions.map((p, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].cut : body.length;
    return { key: p.letter, text: oneLine(stripEnd(body.slice(p.textStart, end))) };
  });
  const headLines = head.split('\n').map((l) => l.trim()).filter(Boolean);
  const prompt = headLines[0];
  const context = joinContext(headLines.slice(1));

  const out = {
    id: q.id,
    section: q.section,
    sectionTitle: q.sectionTitle,
    subsection: q.subsection,
    subsectionTitle: q.subsectionTitle,
    prompt,
  };
  if (context) out.context = context;
  if (UNDERLINE_IDS.includes(q.id)) {
    const w = context?.match(/(?<![ა-ჰ])(მათ|მას)(?![ა-ჰ])/g) ?? [];
    if (w.length !== 1) throw new Error(`${q.id}: ожидалось одно მათ/მას, найдено ${w.length}`);
    out.underline = w[0];
  }
  out.options = options;
  out.answer = answers[q.id];
  if (!out.answer) throw new Error(`${q.id}: нет ключа`);
  return out;
});

const orphanKeys = Object.keys(answers).filter((id) => !result.some((q) => q.id === id));
if (orphanKeys.length) throw new Error(`Ключи без вопросов: ${orphanKeys.join(', ')}`);

writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
console.log(`Записано ${result.length} вопросов в ${OUT}`);
console.log(`Восстановлены переносы: ${hyphenFixes.map((f) => f.fixed).join(', ') || '—'}`);
