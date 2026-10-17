import { useCallback, useEffect, useRef, useState } from 'react';
import { questions } from '../data';
import { navigate, startSession, useSession } from '../nav';
import { makeItems, pickExam } from '../quiz';
import { addExam, recordAnswers, useProgress } from '../store';
import type { ExamRecord, Letter } from '../types';
import { Options } from '../components/Options';
import { QuestionBody } from '../components/QuestionBody';
import { fmtDuration, Header, plural, useKeys } from '../components/ui';

export function ExamSetup() {
  const { settings: s } = useProgress();
  const pass = Math.min(s.passScore, s.examCount);
  const start = () => startSession('exam', makeItems(pickExam(questions, s.examCount, s.sampling), s.shuffle));
  return (
    <div className="screen">
      <Header title="Экзамен" back="/" />
      <section className="card">
        <p>
          {s.examCount} {plural(s.examCount, 'случайный вопрос', 'случайных вопроса', 'случайных вопросов')} из всех {questions.length} — без учёта
          отметок «изучено». Результат и разбор — только в конце.
        </p>
        <dl className="kv">
          <dt>Проходной балл</dt>
          <dd>
            {pass} из {s.examCount}
          </dd>
          <dt>Таймер</dt>
          <dd>{s.timerMinutes ? `${s.timerMinutes} мин` : 'выключен'}</dd>
          <dt>Выборка</dt>
          <dd>{s.sampling === 'random' ? 'полностью случайно' : 'пропорционально по разделам'}</dd>
          <dt>Перемешивание вариантов</dt>
          <dd>{s.shuffle ? 'да' : 'нет'}</dd>
        </dl>
        <a href="#/settings" className="link">
          Изменить в настройках
        </a>
      </section>
      <div className="sticky-actions">
        <button type="button" className="btn primary big" onClick={start}>
          Начать экзамен
        </button>
      </div>
    </div>
  );
}

export function ExamRunner() {
  const session = useSession();
  const { settings } = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(Letter | null)[]>([]);
  const [now, setNow] = useState(Date.now());
  const finished = useRef(false);
  const keys = useKeys();

  useEffect(() => {
    if (!session || session.kind !== 'exam') navigate('/', true);
    finished.current = false;
    setIndex(0);
    setAnswers([]);
  }, [session]);

  const deadline = session && settings.timerMinutes > 0 ? session.startedAt + settings.timerMinutes * 60_000 : null;

  const finish = useCallback(
    (timedOut: boolean) => {
      if (!session || finished.current) return;
      finished.current = true;
      const results = session.items.map((it, i) => ({
        id: it.q.id,
        chosen: answers[i] ?? null,
        correct: answers[i] === it.q.answer,
      }));
      // В статистику идут только данные ответы; пропущенные (например, из-за таймера) считаются ошибкой только в балле.
      recordAnswers(results.filter((r) => r.chosen !== null));
      const score = results.filter((r) => r.correct).length;
      const passScore = Math.min(settings.passScore, results.length);
      const rec: ExamRecord = {
        date: new Date().toISOString(),
        score,
        total: results.length,
        passScore,
        passed: score >= passScore,
        durationSec: Math.round((Date.now() - session.startedAt) / 1000),
        timedOut,
        answers: results,
      };
      addExam(rec);
      navigate('/exam/result/0', true);
    },
    [session, answers, settings.passScore],
  );

  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  useEffect(() => {
    if (deadline && now >= deadline) finish(true);
  }, [now, deadline, finish]);

  if (!session || session.kind !== 'exam') return null;
  const { items } = session;
  const item = items[index];
  const answeredCount = answers.filter((a) => a != null).length;

  const choose = (l: Letter) => {
    const next = answers.slice();
    next[index] = l;
    setAnswers(next);
  };

  keys.current = (key) => {
    const n = Number(key);
    if (n >= 1 && n <= 4) choose(item.order[n - 1]);
    else if (key === 'ArrowRight' || key === 'Enter') index + 1 < items.length && setIndex(index + 1);
    else if (key === 'ArrowLeft') index > 0 && setIndex(index - 1);
  };

  const tryFinish = () => {
    const left = items.length - answeredCount;
    if (left > 0 && !confirm(`Без ответа: ${left}. Завершить экзамен?`)) return;
    finish(false);
  };
  const quit = () => {
    if (confirm('Прервать экзамен? Результат не сохранится.')) navigate('/');
  };

  const remaining = deadline ? Math.max(0, (deadline - now) / 1000) : null;

  return (
    <div className="screen quiz">
      <header className="header">
        <button type="button" className="icon-btn" onClick={quit} aria-label="Прервать экзамен">
          ✕
        </button>
        <h1>Экзамен</h1>
        <div className="header-right">
          {remaining !== null && <span className={`timer ${remaining < 60 ? 'bad-text' : ''}`}>⏱ {fmtDuration(remaining)}</span>}
        </div>
      </header>

      <div className="qnav" aria-label="Вопросы экзамена">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`qnav-btn ${i === index ? 'current' : ''} ${answers[i] != null ? 'done' : ''}`}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <article className="card">
        <QuestionBody q={item.q} translatable={false} />
        <Options q={item.q} order={item.order} chosen={answers[index] ?? null} onChoose={choose} translatable={false} />
      </article>

      <div className="sticky-actions row">
        <button type="button" className="btn" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ←
        </button>
        {index + 1 < items.length ? (
          <button type="button" className="btn primary grow" onClick={() => setIndex(index + 1)}>
            Далее
          </button>
        ) : (
          <button type="button" className="btn primary grow" onClick={tryFinish}>
            Завершить ({answeredCount}/{items.length})
          </button>
        )}
      </div>
      {index + 1 < items.length && (
        <button type="button" className="link center-block" onClick={tryFinish}>
          Завершить досрочно
        </button>
      )}
    </div>
  );
}
