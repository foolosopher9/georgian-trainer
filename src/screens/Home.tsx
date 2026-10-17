import { useMemo } from 'react';
import { questions, sections } from '../data';
import { navigate } from '../nav';
import { estimateReadiness } from '../readiness';
import { isDue, isStudied, useProgress } from '../store';
import { Bar, fmtDate, Header } from '../components/ui';

export function Home() {
  const p = useProgress();
  const studiedTotal = questions.filter((q) => isStudied(p, q.id)).length;
  const learnedTotal = questions.filter((q) => p.status[q.id] === 'learned').length;
  const due = questions.filter((q) => isDue(p, q.id)).length;
  const mistakes = Object.keys(p.mistakes).length;
  const ready = useMemo(() => estimateReadiness(p), [p]);
  const pct = Math.round(ready.passProb * 100);
  const pctText = ready.passProb > 0 && pct < 1 ? '<1%' : ready.passProb < 1 && pct > 99 ? '>99%' : `${pct}%`;

  return (
    <div className="screen">
      <Header title="Тренажёр грузинского" />

      <section className="card">
        <div className="row-between">
          <h2>Изучено</h2>
          <strong>
            {studiedTotal} из {questions.length}
          </strong>
        </div>
        <Bar value={studiedTotal} total={questions.length} />
        <p className="muted small">
          из них выучено: {learnedTotal}
          {due > 0 && <> · пора повторить: <b className="warn-text">{due}</b></>}
        </p>
        <div className="section-progress">
          {sections.map((s) => {
            const n = s.questions.filter((q) => isStudied(p, q.id)).length;
            return (
              <button key={s.id} type="button" className="sp-row" onClick={() => navigate('/catalog')}>
                <span className="sp-title">
                  <b>{s.id}.</b> <span className="ka">{s.title}</span>
                </span>
                <span className="sp-count">
                  {n}/{s.questions.length}
                </span>
                <Bar value={n} total={s.questions.length} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="card readiness">
        <h2>Готовность к экзамену</h2>
        <div className="ready-grid">
          <div>
            <span className="ready-num">{ready.expected.toFixed(1)}</span>
            <span className="muted small">ожидаемый балл из {ready.total}</span>
          </div>
          <div>
            <span className={`ready-num ${pct >= 80 ? 'ok-text' : pct >= 50 ? 'warn-text' : 'bad-text'}`}>{pctText}</span>
            <span className="muted small">
              шанс набрать {ready.passScore}+
            </span>
          </div>
        </div>
        <details className="small muted">
          <summary>Как считается</summary>
          Для изученных вопросов берётся ваша точность (сглаженная: (верных + 0,25) / (попыток + 1)), для неизученных и ещё не проверенных — 25%
          (угадывание). Вероятность сдать оценена симуляцией 10 000 экзаменов с текущими настройками.
        </details>
      </section>

      <div className="actions">
        <button type="button" className="btn primary big" onClick={() => navigate('/train')}>
          Тренировка
          <small>
            учу: {studiedTotal - learnedTotal}
            {due > 0 ? ` · повторить: ${due}` : ''}
          </small>
        </button>
        <button type="button" className="btn big" onClick={() => navigate('/exam')}>
          Экзамен
          <small>{p.settings.examCount} случайных вопросов</small>
        </button>
        <button type="button" className="btn big" onClick={() => navigate('/mistakes')} disabled={mistakes === 0}>
          Ошибки ({mistakes})
          <small>{mistakes ? 'работа над ошибками' : 'очередь пуста'}</small>
        </button>
        <button type="button" className="btn big" onClick={() => navigate('/cards')}>
          Карточки
          <small>вопрос → ответ</small>
        </button>
        <button type="button" className="btn big" onClick={() => navigate('/notes')}>
          Шпаргалки
          <small>правила по подразделам</small>
        </button>
        <button type="button" className="btn big" onClick={() => navigate('/catalog')}>
          Каталог
          <small>все 200 вопросов</small>
        </button>
      </div>

      <section className="card">
        <h2>Последние экзамены</h2>
        {p.exams.length === 0 ? (
          <p className="muted">Пока не было ни одного экзамена.</p>
        ) : (
          <ul className="exam-list">
            {p.exams.slice(0, 5).map((e, i) => (
              <li key={e.date}>
                <button type="button" className="exam-row" onClick={() => navigate(`/exam/result/${i}`)}>
                  <span className={`pill ${e.passed ? 'ok' : 'bad'}`}>{e.passed ? 'сдан' : 'не сдан'}</span>
                  <span className="exam-score">
                    {e.score}/{e.total}
                  </span>
                  <span className="muted">{fmtDate(e.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
