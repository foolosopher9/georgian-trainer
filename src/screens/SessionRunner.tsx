import { useEffect, useRef, useState } from 'react';
import { navigate, startSession, useSession } from '../nav';
import { makeItems, shuffle } from '../quiz';
import { getProgress, LEARNED_HINT_STREAK, MISTAKE_CLEAR_STREAK, recordAnswers, setStatus, statusOf, useProgress } from '../store';
import type { Letter } from '../types';
import { Options } from '../components/Options';
import { QuestionBody } from '../components/QuestionBody';
import { Bar, Header, useKeys } from '../components/ui';

/** Тренировка и работа над ошибками: ответ проверяется сразу. */
export function SessionRunner() {
  const session = useSession();
  const p = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(Letter | null)[]>([]);

  useEffect(() => {
    setIndex(0);
    setAnswers([]);
    reviewed.current = new Set();
  }, [session]);
  useEffect(() => {
    if (!session || session.kind === 'exam' || session.kind === 'cards') navigate('/', true);
  }, [session]);
  const keys = useKeys();
  /** Выученные вопросы, ответ на которые в этой сессии был повторением. */
  const reviewed = useRef(new Set<string>());
  if (!session || session.kind === 'exam' || session.kind === 'cards') return null;

  const { items, kind } = session;
  const title = kind === 'mistakes' ? 'Работа над ошибками' : 'Тренировка';
  const done = index >= items.length;

  if (done) {
    keys.current = null;
    const wrong = items.filter((it, i) => answers[i] !== it.q.answer);
    const score = items.length - wrong.length;
    const again = () => startSession('train', makeItems(shuffle(items.map((it) => it.q)), getProgress().settings.shuffle));
    return (
      <div className="screen">
        <Header title={title} />
        <section className="card center">
          <div className="big-score">
            {score}/{items.length}
          </div>
          <p className="muted">верных ответов</p>
          <Bar value={score} total={items.length} tone="ok" />
        </section>
        {wrong.length > 0 && (
          <section className="card">
            <h2>Ошибки</h2>
            <ul className="plain-list">
              {wrong.map((it) => (
                <li key={it.q.id}>
                  <a href={`#/q/${it.q.id}`}>{it.q.id}</a> — <span className="ka">{it.q.options.find((o) => o.key === it.q.answer)!.text}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="actions">
          {kind === 'mistakes' && Object.keys(p.mistakes).length > 0 && (
            <button type="button" className="btn primary" onClick={() => navigate('/mistakes')}>
              Ошибки: осталось {Object.keys(p.mistakes).length}
            </button>
          )}
          {kind === 'train' && (
            <button type="button" className="btn primary" onClick={again}>
              Ещё раз эти же вопросы
            </button>
          )}
          {kind === 'train' && (
            <button type="button" className="btn" onClick={() => navigate('/train')}>
              Новая тренировка
            </button>
          )}
          <button type="button" className="btn" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  const item = items[index];
  const chosen = answers[index] ?? null;
  const answered = chosen !== null;
  const correct = chosen === item.q.answer;

  const choose = (l: Letter) => {
    if (answered) return;
    const next = answers.slice();
    next[index] = l;
    setAnswers(next);
    if (getProgress().status[item.q.id] === 'learned') reviewed.current.add(item.q.id);
    recordAnswers([{ id: item.q.id, correct: l === item.q.answer }]);
  };

  const next = () => answered && setIndex(index + 1);
  keys.current = (key) => {
    const n = Number(key);
    if (n >= 1 && n <= 4 && !answered) choose(item.order[n - 1]);
    else if (key === 'Enter' || key === 'ArrowRight') next();
  };

  const st = p.stats[item.q.id];
  const status = statusOf(p, item.q.id);
  const srs = p.srs[item.q.id];
  const inMistakes = !!p.mistakes[item.q.id];

  return (
    <div className="screen quiz">
      <Header
        title={title}
        back="/"
        right={
          <span className="muted">
            {index + 1}/{items.length}
          </span>
        }
      />
      <Bar value={index + (answered ? 1 : 0)} total={items.length} />
      <article className="card">
        <QuestionBody q={item.q} />
        <Options q={item.q} order={item.order} chosen={chosen} reveal={answered} onChoose={answered ? undefined : choose} />
      </article>

      {answered && (
        <div className={`feedback ${correct ? 'ok' : 'bad'}`} role="status">
          <b>{correct ? 'Верно!' : 'Неверно'}</b>
          {kind === 'mistakes' &&
            (inMistakes ? (
              <span> Осталось верных подряд до выхода из очереди: {Math.max(0, MISTAKE_CLEAR_STREAK - (st?.streak ?? 0))}</span>
            ) : correct ? (
              <span> Вопрос убран из очереди ошибок.</span>
            ) : null)}
          {reviewed.current.has(item.q.id) &&
            (status === 'learned' && srs ? (
              <span> Повторение выученного: следующее через {srs.interval} дн.</span>
            ) : (
              <span> Выученный вопрос возвращён в «учу».</span>
            ))}
          {status === 'new' && (
            <button type="button" className="link" onClick={() => setStatus([item.q.id], 'learning')}>
              Отметить «учу»
            </button>
          )}
          {correct && status !== 'learned' && (st?.streak ?? 0) >= LEARNED_HINT_STREAK && (
            <span className="hint-inline">
              {st!.streak} верных подряд —{' '}
              <button type="button" className="link" onClick={() => setStatus([item.q.id], 'learned')}>
                отметить «выучен»
              </button>
            </span>
          )}
        </div>
      )}

      <div className="sticky-actions">
        <button type="button" className="btn primary big" disabled={!answered} onClick={next}>
          {index + 1 < items.length ? 'Далее' : 'Результат'}
        </button>
      </div>
    </div>
  );
}
