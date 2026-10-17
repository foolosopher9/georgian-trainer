import { useState } from 'react';
import { byId } from '../data';
import { navigate } from '../nav';
import { useProgress } from '../store';
import { Options } from '../components/Options';
import { QuestionBody } from '../components/QuestionBody';
import { Bar, fmtDate, fmtDuration, Header } from '../components/ui';

export function ExamReview({ index }: { index: number }) {
  const p = useProgress();
  const rec = p.exams[index];
  const [onlyErrors, setOnlyErrors] = useState(true);
  if (!rec) {
    return (
      <div className="screen">
        <Header title="Экзамен не найден" back="/" />
      </div>
    );
  }
  const errors = rec.answers.filter((a) => !a.correct);
  const shown = onlyErrors ? errors : rec.answers;

  return (
    <div className="screen">
      <Header title="Результат экзамена" back="/" />
      <section className={`card center result ${rec.passed ? 'ok' : 'bad'}`}>
        <div className="big-score">
          {rec.score}/{rec.total}
        </div>
        <div className={`pill ${rec.passed ? 'ok' : 'bad'}`}>{rec.passed ? 'Сдан' : 'Не сдан'}</div>
        <Bar value={rec.score} total={rec.total} tone="ok" />
        <p className="muted small">
          Проходной балл: {rec.passScore} · время {fmtDuration(rec.durationSec)}
          {rec.timedOut ? ' (время вышло)' : ''} · {fmtDate(rec.date)}
        </p>
      </section>

      {errors.length > 0 && (
        <section className="card">
          <h2>Ошибки ({errors.length})</h2>
          <p className="small">
            {errors.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ', '}
                <a href={`#/q/${a.id}`}>{a.id}</a>
                {a.chosen === null && ' (без ответа)'}
              </span>
            ))}
          </p>
        </section>
      )}

      <div className="row-between">
        <h2>Разбор</h2>
        <label className="inline">
          <input type="checkbox" className="check" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />
          только ошибки
        </label>
      </div>
      {shown.length === 0 && <p className="muted center">Ошибок нет — отлично!</p>}
      {shown.map((a) => {
        const q = byId.get(a.id);
        if (!q) return null;
        return (
          <article key={a.id} className={`card review ${a.correct ? 'ok' : 'bad'}`}>
            <QuestionBody q={q} />
            <Options q={q} chosen={a.chosen} reveal />
            {a.chosen === null && <p className="bad-text small">Нет ответа</p>}
          </article>
        );
      })}

      <div className="actions">
        <button type="button" className="btn primary" onClick={() => navigate('/exam')}>
          Новый экзамен
        </button>
        <button type="button" className="btn" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    </div>
  );
}
