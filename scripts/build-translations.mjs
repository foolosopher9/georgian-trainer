// Сборка src/data/translations.json из scripts/translations/*.json с проверкой полноты.
// Формат исходников: { "<id>": [context | null, "ა", "ბ", "გ", "დ"] }, prompts.json — переводы формулировок.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'scripts/translations';
const questions = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const prompts = JSON.parse(readFileSync(`${DIR}/prompts.json`, 'utf8'));
const src = {};
for (const f of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'prompts.json').sort()) {
  for (const [id, v] of Object.entries(JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')))) {
    if (src[id]) throw new Error(`${id} переведён дважды`);
    src[id] = v;
  }
}

const errors = [];
const gaps = (s) => (s?.match(/-{3,}/g) ?? []).length;
const items = {};
for (const q of questions) {
  if (!prompts[q.prompt]) errors.push(`нет перевода формулировки: ${q.prompt}`);
  const t = src[q.id];
  if (!t) { errors.push(`${q.id}: нет перевода`); continue; }
  const [context, ...opts] = t;
  if (opts.length !== 4 || opts.some((o) => typeof o !== 'string' || !o.trim())) errors.push(`${q.id}: нужно 4 непустых варианта`);
  if (!!q.context !== !!context) errors.push(`${q.id}: контекст ${q.context ? 'отсутствует' : 'лишний'}`);
  if (q.context && gaps(q.context) !== gaps(context)) errors.push(`${q.id}: пропусков ${gaps(context)}, в оригинале ${gaps(q.context)}`);
  if (q.context && q.context.split('\n').length !== context.split('\n').length) errors.push(`${q.id}: число строк (реплик) не совпадает`);
  items[q.id] = { ...(context ? { context } : {}), options: Object.fromEntries(q.options.map((o, i) => [o.key, opts[i]])) };
}
for (const id of Object.keys(src)) if (!items[id] && !errors.some((e) => e.startsWith(id))) errors.push(`${id}: нет такого вопроса`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync('src/data/translations.json', JSON.stringify({ prompts, items }, null, 2) + '\n');
console.log(`Переводы: ${Object.keys(items).length} вопросов, ${Object.keys(prompts).length} формулировок → src/data/translations.json`);
