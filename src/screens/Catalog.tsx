import { useEffect, useMemo, useRef, useState } from 'react';
import { sections } from '../data';
import { navigate } from '../nav';
import { isDue, isStudied, setStudied, statusOf, useProgress } from '../store';
import type { Progress, Question, Status } from '../types';
import { Header } from '../components/ui';

type Filter = 'all' | Status | 'due' | 'mistakes';
const FILTERS: { v: Filter; label: string }[] = [
  { v: 'all', label: 'Все' },
  { v: 'new', label: 'Новые' },
  { v: 'learning', label: 'Учу' },
  { v: 'learned', label: 'Выученные' },
  { v: 'due', label: 'Пора повторить' },
  { v: 'mistakes', label: 'В ошибках' },
];

// Состояние каталога переживает переход к вопросу и обратно.
const saved = { query: '', filter: 'all' as Filter, open: new Set<string>(['I']) };

function TriCheckbox({ checked, indeterminate, onChange, label }: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="check"
      checked={checked}
      aria-label={label}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

const searchText = (q: Question) =>
  [q.prompt, q.context ?? '', ...q.options.map((o) => o.text)].join(' ').toLowerCase();

function matches(q: Question, query: string, filter: Filter, p: Progress) {
  if ((filter === 'new' || filter === 'learning' || filter === 'learned') && statusOf(p, q.id) !== filter) return false;
  if (filter === 'due' && !isDue(p, q.id)) return false;
  if (filter === 'mistakes' && !p.mistakes[q.id]) return false;
  if (!query) return true;
  const idQuery = query.replace(/\.$/, '');
  return q.id.toLowerCase() === idQuery || q.id.toLowerCase().startsWith(idQuery + '.') || q.id.endsWith('.' + idQuery) || searchText(q).includes(query);
}

/** Короткая подпись вопроса в списке. */
const snippet = (q: Question) => (q.context ?? q.options.map((o) => o.text).join(' · ')).split('\n')[0];

export function Catalog() {
  const p = useProgress();
  const [query, setQuery] = useState(saved.query);
  const [filter, setFilter] = useState<Filter>(saved.filter);
  const [open, setOpen] = useState(saved.open);
  saved.query = query;
  saved.filter = filter;
  saved.open = open;

  const q = query.trim().toLowerCase();
  const filtering = q !== '' || filter !== 'all';
  const visible = useMemo(
    () => new Set(sections.flatMap((s) => s.questions).filter((x) => matches(x, q, filter, p)).map((x) => x.id)),
    [q, filter, p],
  );

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groupCheckbox = (qs: Question[], label: string) => {
    const target = qs.filter((x) => visible.has(x.id));
    const n = target.filter((x) => isStudied(p, x.id)).length;
    return (
      <TriCheckbox
        label={label}
        checked={target.length > 0 && n === target.length}
        indeterminate={n > 0 && n < target.length}
        onChange={(v) => setStudied(target.map((x) => x.id), v)}
      />
    );
  };

  return (
    <div className="screen">
      <Header title="Каталог" back="/" />
      <div className="toolbar">
        <input
          type="search"
          className="input"
          placeholder="Поиск: номер (I.2.5) или текст"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips" role="radiogroup" aria-label="Фильтр по статусу">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              role="radio"
              aria-checked={filter === f.v}
              className={`chip ${filter === f.v ? 'active' : ''}`}
              onClick={() => setFilter(f.v)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.size === 0 && <p className="muted center">Ничего не найдено.</p>}

      {sections.map((s) => {
        const sVisible = s.questions.filter((x) => visible.has(x.id));
        if (!sVisible.length) return null;
        const sStudied = s.questions.filter((x) => isStudied(p, x.id)).length;
        const sOpen = filtering || open.has(s.id);
        return (
          <section key={s.id} className="tree-section">
            <div className="tree-head level1" onClick={() => toggle(s.id)}>
              {groupCheckbox(s.questions, `Отметить раздел ${s.id}`)}
              <span className="tree-title">
                <b>{s.id}.</b> <span className="ka">{s.title}</span>
              </span>
              <span className="counter">
                {sStudied}/{s.questions.length}
              </span>
              <span className={`chev ${sOpen ? 'open' : ''}`} aria-hidden>
                ›
              </span>
            </div>
            {sOpen &&
              s.subsections.map((sub) => {
                const subVisible = sub.questions.filter((x) => visible.has(x.id));
                if (!subVisible.length) return null;
                const subStudied = sub.questions.filter((x) => isStudied(p, x.id)).length;
                const subOpen = filtering || open.has(sub.id);
                return (
                  <div key={sub.id} className="tree-sub">
                    <div className="tree-head level2" onClick={() => toggle(sub.id)}>
                      {groupCheckbox(sub.questions, `Отметить подраздел ${sub.id}`)}
                      <span className="tree-title">
                        <b>{sub.id}</b> <span className="ka">{sub.title}</span>
                      </span>
                      <a href={`#/notes/${sub.id}`} className="notes-link" onClick={(e) => e.stopPropagation()} title="Шпаргалка по подразделу">
                        правила
                      </a>
                      <span className="counter">
                        {subStudied}/{sub.questions.length}
                      </span>
                      <span className={`chev ${subOpen ? 'open' : ''}`} aria-hidden>
                        ›
                      </span>
                    </div>
                    {subOpen && (
                      <ul className="qlist">
                        {subVisible.map((x) => {
                          const st = p.stats[x.id];
                          return (
                            <li key={x.id} className="qrow">
                              <input
                                type="checkbox"
                                className="check"
                                checked={isStudied(p, x.id)}
                                aria-label={`Изучено ${x.id}`}
                                onChange={(e) => setStudied([x.id], e.target.checked)}
                              />
                              <button type="button" className="qrow-main" onClick={() => navigate(`/q/${x.id}`)}>
                                <span className="qrow-id">
                                  {x.id}
                                  {p.mistakes[x.id] && <span className="dot bad" title="В очереди ошибок" />}
                                </span>
                                <span className="qrow-text ka">{snippet(x)}</span>
                                {p.status[x.id] === 'learned' && (
                                  <span className={`pill tiny ${isDue(p, x.id) ? 'warn' : 'ok'}`}>{isDue(p, x.id) ? 'повторить' : 'выучен'}</span>
                                )}
                                {st && (
                                  <span className="qrow-stat">
                                    <span className="ok-text">{st.correct}</span>/<span className="bad-text">{st.wrong}</span>
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
          </section>
        );
      })}
      {filtering && visible.size > 0 && (
        <p className="muted center small">
          Найдено: {visible.size}. Галочки разделов отмечают только найденные вопросы.
        </p>
      )}
    </div>
  );
}
