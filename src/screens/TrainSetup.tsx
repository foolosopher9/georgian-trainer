import { useState } from 'react';
import { subsections } from '../data';
import { startSession } from '../nav';
import { buildTraining, makeItems } from '../quiz';
import { isDue, updateSettings, useProgress } from '../store';
import { Header, NumberField, plural } from '../components/ui';

// Выбор подразделов запоминается до перезагрузки страницы.
let savedSelection: Set<string> | null = null;

export function TrainSetup() {
  const p = useProgress();
  const [selected, setSelected] = useState<Set<string>>(() => savedSelection ?? new Set(subsections.map((s) => s.id)));
  savedSelection = selected;
  const count = p.settings.trainCount;
  const now = Date.now();

  const chosen = subsections.filter((s) => selected.has(s.id)).flatMap((s) => s.questions);
  const learning = chosen.filter((q) => p.status[q.id] === 'learning');
  const due = chosen.filter((q) => isDue(p, q.id, now)).map((q) => ({ q, due: Date.parse(p.srs[q.id].due) }));
  const plan = buildTraining(learning, due, count);
  const total = plan.questions.length;
  const studiedTotal = Object.keys(p.status).length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = () => startSession('train', makeItems(buildTraining(learning, due, count).questions, p.settings.shuffle));

  return (
    <div className="screen">
      <Header title="Тренировка" back="/" />
      {studiedTotal === 0 ? (
        <section className="card">
          <p>Тренировка идёт по изучаемым вопросам (статус «учу») и по выученным, которым пора на повторение. Пока ни один вопрос не отмечен.</p>
          <a className="btn primary" href="#/catalog">
            Открыть каталог
          </a>
        </section>
      ) : (
        <>
          <section className="card">
            <label className="field">
              <span>Количество вопросов</span>
              <NumberField value={count} min={1} max={200} onChange={(v) => updateSettings({ trainCount: v })} />
            </label>
            <p className="muted small">
              Ответ и правильный вариант показываются сразу. Выученные вопросы подмешиваются, когда подходит срок повторения (до 30% тренировки,
              больше — если вопросов «учу» не хватает). Варианты {p.settings.shuffle ? 'перемешиваются' : 'не перемешиваются'} (см. настройки).
            </p>
          </section>

          <section className="card">
            <div className="row-between">
              <h2>Подразделы</h2>
              <div className="link-row">
                <button type="button" className="link" onClick={() => setSelected(new Set(subsections.map((s) => s.id)))}>
                  все
                </button>
                <button type="button" className="link" onClick={() => setSelected(new Set())}>
                  ни одного
                </button>
              </div>
            </div>
            <ul className="sub-pick">
              {subsections.map((s) => {
                const l = s.questions.filter((q) => p.status[q.id] === 'learning').length;
                const d = s.questions.filter((q) => isDue(p, q.id, now)).length;
                const n = l + d;
                return (
                  <li key={s.id}>
                    <label className={n === 0 ? 'disabled' : ''}>
                      <input type="checkbox" className="check" checked={n > 0 && selected.has(s.id)} onChange={() => toggle(s.id)} disabled={n === 0} />
                      <b>{s.id}</b> <span className="ka">{s.title}</span>
                      <span className="counter">
                        {l}
                        {d > 0 && <span className="warn-text"> +{d}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="muted small">Число — вопросы «учу»; «+N» — выученные, которым пора на повторение.</p>
          </section>

          <div className="sticky-actions">
            <button type="button" className="btn primary big" disabled={total === 0} onClick={start}>
              Начать: {total} {plural(total, 'вопрос', 'вопроса', 'вопросов')}
              <small>
                {plan.review > 0 ? `из них на повторение: ${plan.review}` : `доступно «учу»: ${learning.length}`}
                {total < count && total > 0 ? ' — меньше, чем задано' : ''}
              </small>
            </button>
          </div>
          {total === 0 && (
            <p className="muted center small">В выбранных подразделах нет вопросов «учу» и нет выученных, которым пора на повторение.</p>
          )}
        </>
      )}
    </div>
  );
}
