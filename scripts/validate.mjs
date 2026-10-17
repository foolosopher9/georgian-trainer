// Проверка src/data/questions.json. Выход с кодом 1 при ошибках.
// Флаги: --sample  — вывести 10 случайных и все «проблемные» вопросы для ручной сверки.
import { readFileSync } from 'node:fs';

const questions = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const HEADER_PARTS = ['ტესტები საქართველოს', 'მოქალაქეობის მოპოვებისათვის', 'ქართულ ენაში'];
const LETTERS = ['ა', 'ბ', 'გ', 'დ'];
const SUBSECTIONS = ['I.1', 'I.2', 'I.3', 'I.4', 'II.1', 'II.2', 'II.3', 'III.1', 'III.2', 'III.3'];
const errors = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);

if (questions.length !== 200) err('*', `вопросов ${questions.length}, ожидалось 200`);

const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) err(q.id, 'повторяющийся id');
  ids.add(q.id);

  for (const f of ['id', 'section', 'sectionTitle', 'subsection', 'subsectionTitle', 'prompt', 'answer']) {
    if (typeof q[f] !== 'string' || !q[f].trim()) err(q.id, `пустое поле ${f}`);
  }
  if (!q.id.startsWith(q.subsection + '.') || !q.subsection.startsWith(q.section + '.'))
    err(q.id, `id не согласован с section/subsection`);

  if (!Array.isArray(q.options) || q.options.length !== 4) err(q.id, `вариантов ${q.options?.length}`);
  else {
    const keys = q.options.map((o) => o.key).join('');
    if (keys !== LETTERS.join('')) err(q.id, `буквы вариантов «${keys}»`);
    q.options.forEach((o) => {
      if (!o.text?.trim()) err(q.id, `пустой вариант ${o.key}`);
      if (/[;.!]$/.test(o.text)) err(q.id, `вариант ${o.key} заканчивается пунктуацией: «${o.text}»`);
      if (/(^|\s)[ა-დ]\)/.test(o.text)) err(q.id, `в варианте ${o.key} остался маркер другого варианта`);
    });
    if (new Set(q.options.map((o) => o.text)).size !== 4) err(q.id, 'одинаковые тексты вариантов');
  }
  if (!LETTERS.includes(q.answer)) err(q.id, `ответ «${q.answer}» не из ა/ბ/გ/დ`);

  if (q.underline !== undefined && !new RegExp(`(?<![ა-ჰ])${q.underline}(?![ა-ჰ])`).test(q.context ?? ''))
    err(q.id, `underline «${q.underline}» не найден в context`);

  const fields = [q.prompt, q.context ?? '', ...(q.options ?? []).map((o) => o.text)];
  for (const s of fields) {
    for (const h of HEADER_PARTS) if (s.includes(h)) err(q.id, `остаток колонтитула: «${s.slice(0, 80)}»`);
    if (/I{1,3}\.\d\.\d+\.?\s*-\s*[ა-დ]\)/.test(s)) err(q.id, `остаток строки ключа: «${s.slice(0, 80)}»`);
    if (/ერთერთ|მოსწავლეახალგაზრდ/.test(s)) err(q.id, 'склеенное слово после переноса');
    if (/\s{2,}|^\s|\s$/.test(s.replace(/\n/g, ''))) err(q.id, 'лишние пробелы');
  }
}

for (const sub of SUBSECTIONS) {
  const n = questions.filter((q) => q.subsection === sub).length;
  if (n !== 20) err(sub, `в подразделе ${n} вопросов, ожидалось 20`);
  for (let i = 1; i <= 20; i++) if (!ids.has(`${sub}.${i}`)) err(sub, `нет вопроса ${sub}.${i}`);
}
for (const id of ['I.1.6', 'I.1.7', 'I.1.8', 'I.1.9', 'I.1.10', 'I.1.11']) {
  if (!questions.find((q) => q.id === id)?.underline) err(id, 'нет underline');
}

// Шпаргалки и переводы (этап 2): полнота покрытия.
const notes = JSON.parse(readFileSync('src/data/notes.json', 'utf8'));
for (const sub of SUBSECTIONS) if (!notes[sub]?.blocks?.length) err(sub, 'нет шпаргалки в notes.json');
const tr = JSON.parse(readFileSync('src/data/translations.json', 'utf8'));
for (const q of questions) {
  const t = tr.items[q.id];
  if (!t) err(q.id, 'нет перевода в translations.json');
  else if (LETTERS.some((l) => !t.options?.[l])) err(q.id, 'перевод: не все варианты');
  if (!tr.prompts[q.prompt]) err(q.id, 'нет перевода формулировки вопроса');
}

const dist = Object.fromEntries(LETTERS.map((l) => [l, questions.filter((q) => q.answer === l).length]));
console.log(`Вопросов: ${questions.length}, уникальных id: ${ids.size}`);
console.log(`Распределение ответов: ${LETTERS.map((l) => `${l}=${dist[l]}`).join(' ')}`);

if (process.argv.includes('--sample')) {
  const show = (q) => {
    console.log(`\n=== ${q.id} (${q.subsectionTitle}) ===`);
    console.log(q.prompt);
    if (q.context) console.log(q.context.replace(/^/gm, '  | '));
    if (q.underline) console.log(`  [underline: ${q.underline}]`);
    for (const o of q.options) console.log(`  ${o.key === q.answer ? '✔' : ' '} ${o.key}) ${o.text}`);
  };
  const problem = new Set([
    'I.1.6', 'I.1.7', 'I.1.8', 'I.1.9', 'I.1.10', 'I.1.11', 'I.2.5',
    ...Array.from({ length: 7 }, (_, i) => `II.1.${13 + i}`),
    ...Array.from({ length: 20 }, (_, i) => `III.3.${i + 1}`),
  ]);
  const pool = questions.filter((q) => !problem.has(q.id));
  const random = [];
  while (random.length < 10) {
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (!random.includes(q)) random.push(q);
  }
  console.log('\n######## 10 СЛУЧАЙНЫХ ########');
  random.sort((a, b) => questions.indexOf(a) - questions.indexOf(b)).forEach(show);
  console.log('\n######## ПРОБЛЕМНЫЕ ########');
  questions.filter((q) => problem.has(q.id)).forEach(show);
}

if (errors.length) {
  console.error(`\n✗ Ошибок: ${errors.length}`);
  errors.forEach((e) => console.error('  ' + e));
  process.exit(1);
}
console.log('✓ Все проверки пройдены');
