import { byId, questions } from '../data';
import { navigate } from '../nav';
import { isDue, LEARNED_HINT_STREAK, MISTAKE_CLEAR_STREAK, setStatus, STATUS_LABEL, statusOf, useProgress } from '../store';
import type { Status } from '../types';
import { Options } from '../components/Options';
import { QuestionBody } from '../components/QuestionBody';
import { fmtDate, Header } from '../components/ui';

const STATUSES: Status[] = ['new', 'learning', 'learned'];

export function StatusPicker({ id }: { id: string }) {
  const p = useProgress();
  const current = statusOf(p, id);
  return (
    <div className="segmented" role="radiogroup" aria-label="Статус вопроса">
      {STATUSES.map((s) => (
        <button key={s} type="button" role="radio" aria-checked={current === s} className={current === s ? `active ${s}` : ''} onClick={() => setStatus([id], s)}>
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function QuestionView({ id }: { id: string }) {
  const p = useProgress();
  const q = byId.get(id);
  if (!q) {
    return (
      <div className="screen">
        <Header title="Вопрос не найден" back="/catalog" />
      </div>
    );
  }
  const idx = questions.indexOf(q);
  const prev = questions[idx - 1];
  const next = questions[idx + 1];
  const st = p.stats[q.id];
  const status = statusOf(p, q.id);
  const srs = p.srs[q.id];

  return (
    <div className="screen">
      <Header title={q.id} back="/catalog" />
      <article className="card">
        <QuestionBody q={q} />
        <Options q={q} reveal />
      </article>

      <section className="card">
        <StatusPicker id={q.id} />
        {status !== 'learned' && (st?.streak ?? 0) >= LEARNED_HINT_STREAK && (
          <p className="hint">
            {st!.streak} верных подряд — можно отметить «выучен».{' '}
            <button type="button" className="link" onClick={() => setStatus([q.id], 'learned')}>
              Отметить
            </button>
          </p>
        )}
        {status === 'learned' && srs && (
          <p className="muted small">
            Повторение: {isDue(p, q.id) ? <b className="warn-text">пора повторить</b> : fmtDate(srs.due)} · интервал {srs.interval} дн.
          </p>
        )}
      </section>

      <section className="card stats-grid">
        <div>
          <span className="muted">Показов</span>
          <b>{st?.shown ?? 0}</b>
        </div>
        <div>
          <span className="muted">Верно</span>
          <b className="ok-text">{st?.correct ?? 0}</b>
        </div>
        <div>
          <span className="muted">Неверно</span>
          <b className="bad-text">{st?.wrong ?? 0}</b>
        </div>
        <div>
          <span className="muted">Серия</span>
          <b>{st?.streak ?? 0}</b>
        </div>
        <div className="wide">
          <span className="muted">Последняя попытка</span>
          <b>{fmtDate(st?.last)}</b>
        </div>
        {p.mistakes[q.id] && (
          <div className="wide bad-text">
            В очереди ошибок: нужно ещё {Math.max(0, MISTAKE_CLEAR_STREAK - (st?.streak ?? 0))} верных подряд
          </div>
        )}
      </section>

      <a className="btn" href={`#/notes/${q.subsection}`}>
        Шпаргалка: <span className="ka">{q.subsectionTitle}</span>
      </a>

      <div className="pager">
        <button type="button" className="btn" disabled={!prev} onClick={() => prev && navigate(`/q/${prev.id}`, true)}>
          ← {prev?.id ?? ''}
        </button>
        <button type="button" className="btn" disabled={!next} onClick={() => next && navigate(`/q/${next.id}`, true)}>
          {next?.id ?? ''} →
        </button>
      </div>
    </div>
  );
}
