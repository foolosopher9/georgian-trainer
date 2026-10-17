import { useEffect, useState } from 'react';
import { questions, subsections } from '../data';
import { navigate, startSession, useSession } from '../nav';
import { makeItems, sample } from '../quiz';
import { isDue, isStudied, recordFlashcard, updateSettings, useProgress } from '../store';
import type { Progress, Question } from '../types';
import { Options } from '../components/Options';
import { QuestionBody } from '../components/QuestionBody';
import { Bar, Header, NumberField, plural, useKeys } from '../components/ui';

type Source = 'learning' | 'studied' | 'due' | 'new' | 'mistakes' | 'all';
const SOURCES: { v: Source; label: string; test: (p: Progress, q: Question) => boolean }[] = [
  { v: 'learning', label: 'Учу', test: (p, q) => p.status[q.id] === 'learning' },
  { v: 'studied', label: 'Все изученные', test: (p, q) => isStudied(p, q.id) },
  { v: 'due', label: 'Пора повторить', test: (p, q) => isDue(p, q.id) },
  { v: 'new', label: 'Новые', test: (p, q) => !isStudied(p, q.id) },
  { v: 'mistakes', label: 'Ошибки', test: (p, q) => !!p.mistakes[q.id] },
  { v: 'all', label: 'Все 200', test: () => true },
];

const saved = { source: 'learning' as Source, sub: '' };

export function FlashcardsSetup() {
  const p = useProgress();
  const [source, setSource] = useState<Source>(saved.source);
  const [sub, setSub] = useState(saved.sub);
  saved.source = source;
  saved.sub = sub;
  const count = p.settings.trainCount;
  const test = SOURCES.find((s) => s.v === source)!.test;
  const pool = questions.filter((q) => (!sub || q.subsection === sub) && test(p, q));
  const n = Math.min(count, pool.length);

  return (
    <div className="screen">
      <Header title="Карточки" back="/" />
      <section className="card">
        <p className="muted small">
          Сначала вопрос, ответ — по нажатию. Оцените себя: «знаю» или «не знаю». Это самопроверка: она не меняет статистику точности, но «не знаю»
          отправляет вопрос в очередь ошибок, а для выученных вопросов сдвигает срок повторения.
        </p>
      </section>
      <section className="card form">
        <h2>Какие вопросы</h2>
        <div className="chips" role="radiogroup" aria-label="Источник">
          {SOURCES.map((s) => (
            <button key={s.v} type="button" role="radio" aria-checked={source === s.v} className={`chip ${source === s.v ? 'active' : ''}`} onClick={() => setSource(s.v)}>
              {s.label}
            </button>
          ))}
        </div>
        <label className="field column">
          <span>Подраздел</span>
          <select className="input" value={sub} onChange={(e) => setSub(e.target.value)}>
            <option value="">Все подразделы</option>
            {subsections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Количество карточек</span>
          <NumberField value={count} min={1} max={200} onChange={(v) => updateSettings({ trainCount: v })} />
        </label>
      </section>
      <div className="sticky-actions">
        <button type="button" className="btn primary big" disabled={n === 0} onClick={() => startSession('cards', makeItems(sample(pool, n), false))}>
          Начать: {n} {plural(n, 'карточка', 'карточки', 'карточек')}
          <small>подходящих вопросов: {pool.length}</small>
        </button>
      </div>
    </div>
  );
}

export function FlashcardsRunner() {
  const session = useSession();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [unknown, setUnknown] = useState<string[]>([]);
  const keys = useKeys();

  useEffect(() => {
    if (!session || session.kind !== 'cards') navigate('/', true);
    setIndex(0);
    setShown(false);
    setUnknown([]);
  }, [session]);
  if (!session || session.kind !== 'cards') return null;

  const { items } = session;
  if (index >= items.length) {
    keys.current = null;
    const known = items.length - unknown.length;
    return (
      <div className="screen">
        <Header title="Карточки" />
        <section className="card center">
          <div className="big-score">
            {known}/{items.length}
          </div>
          <p className="muted">«знаю»</p>
          <Bar value={known} total={items.length} tone="ok" />
        </section>
        {unknown.length > 0 && (
          <section className="card">
            <h2>«Не знаю» — добавлены в ошибки</h2>
            <p className="small">
              {unknown.map((id, i) => (
                <span key={id}>
                  {i > 0 && ', '}
                  <a href={`#/q/${id}`}>{id}</a>
                </span>
              ))}
            </p>
          </section>
        )}
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => navigate('/cards')}>
            Ещё карточки
          </button>
          <button type="button" className="btn" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  const item = items[index];
  const rate = (known: boolean) => {
    if (!shown) return;
    recordFlashcard(item.q.id, known);
    if (!known) setUnknown((u) => [...u, item.q.id]);
    setShown(false);
    setIndex(index + 1);
  };
  keys.current = (key) => {
    if (!shown && (key === ' ' || key === 'Enter')) setShown(true);
    else if (shown && (key === '1' || key === 'ArrowLeft')) rate(false);
    else if (shown && (key === '2' || key === 'ArrowRight')) rate(true);
  };

  return (
    <div className="screen quiz">
      <Header
        title="Карточки"
        back="/cards"
        right={
          <span className="muted">
            {index + 1}/{items.length}
          </span>
        }
      />
      <Bar value={index} total={items.length} />
      <article className="card" onClick={() => !shown && setShown(true)}>
        <QuestionBody q={item.q} />
        <Options q={item.q} reveal={shown} />
      </article>
      <div className="sticky-actions row">
        {shown ? (
          <>
            <button type="button" className="btn grow bad-btn" onClick={() => rate(false)}>
              Не знаю
            </button>
            <button type="button" className="btn grow ok-btn" onClick={() => rate(true)}>
              Знаю
            </button>
          </>
        ) : (
          <button type="button" className="btn primary big grow" onClick={() => setShown(true)}>
            Показать ответ
          </button>
        )}
      </div>
    </div>
  );
}
