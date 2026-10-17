import { byId } from '../data';
import { startSession } from '../nav';
import { makeItems, shuffle } from '../quiz';
import { MISTAKE_CLEAR_STREAK, useProgress } from '../store';
import { fmtDate, Header, plural } from '../components/ui';

export function Mistakes() {
  const p = useProgress();
  const ids = Object.keys(p.mistakes).sort((a, b) => p.mistakes[b].localeCompare(p.mistakes[a]));
  const qs = ids.map((id) => byId.get(id)!);

  return (
    <div className="screen">
      <Header title={`Ошибки (${ids.length})`} back="/" />
      <section className="card">
        <p className="muted small">
          Сюда попадает каждый вопрос, на котором вы ошиблись (в тренировке, экзамене или здесь). Вопрос уходит из очереди после{' '}
          {MISTAKE_CLEAR_STREAK} верных ответов подряд.
        </p>
        {ids.length === 0 && <p>Очередь пуста — ошибок нет.</p>}
      </section>
      {ids.length > 0 && (
        <>
          <ul className="card plain-list mistakes-list">
            {qs.map((q) => {
              const left = Math.max(0, MISTAKE_CLEAR_STREAK - (p.stats[q.id]?.streak ?? 0));
              return (
                <li key={q.id}>
                  <a href={`#/q/${q.id}`} className="qrow-main">
                    <span className="qrow-id">{q.id}</span>
                    <span className="qrow-text ka">{(q.context ?? q.prompt).split('\n')[0]}</span>
                    <span className="qrow-stat" title={`Ошибка: ${fmtDate(p.mistakes[q.id])}`}>
                      ещё {left}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="sticky-actions">
            <button type="button" className="btn primary big" onClick={() => startSession('mistakes', makeItems(shuffle(qs), p.settings.shuffle))}>
              Начать: {qs.length} {plural(qs.length, 'вопрос', 'вопроса', 'вопросов')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
