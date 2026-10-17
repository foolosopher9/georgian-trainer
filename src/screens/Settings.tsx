import { useRef, useState } from 'react';
import { exportProgress, importProgress, resetProgress, updateSettings, useProgress } from '../store';
import type { Sampling, Theme } from '../types';
import { Header, NumberField } from '../components/ui';

export function SettingsScreen() {
  const p = useProgress();
  const s = p.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const doExport = () => {
    const blob = new Blob([exportProgress()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `georgian-trainer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: 'Файл прогресса сохранён.' });
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      if (!confirm('Заменить текущий прогресс (отметки, статистику, ошибки, историю, настройки) данными из файла?')) return;
      importProgress(text);
      setMsg({ ok: true, text: `Прогресс загружен из «${file.name}».` });
    } catch (e) {
      setMsg({ ok: false, text: `Не удалось импортировать: ${(e as Error).message}` });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="screen">
      <Header title="Настройки" back="/" />

      <section className="card form">
        <h2>Тренировка</h2>
        <label className="field">
          <span>Вопросов в тренировке</span>
          <NumberField value={s.trainCount} min={1} max={200} onChange={(v) => updateSettings({ trainCount: v })} />
        </label>
        <label className="field">
          <span>Перемешивать варианты ответов</span>
          <input type="checkbox" className="switch" checked={s.shuffle} onChange={(e) => updateSettings({ shuffle: e.target.checked })} />
        </label>
      </section>

      <section className="card form">
        <h2>Экзамен</h2>
        <label className="field">
          <span>Число вопросов</span>
          <NumberField value={s.examCount} min={1} max={200} onChange={(v) => updateSettings({ examCount: v })} />
        </label>
        <label className="field">
          <span>
            Проходной балл
            <small className="muted"> (верных из {s.examCount})</small>
          </span>
          <NumberField value={s.passScore} min={0} max={s.examCount} onChange={(v) => updateSettings({ passScore: v })} />
        </label>
        <label className="field">
          <span>
            Таймер, минут
            <small className="muted"> (0 — выключен)</small>
          </span>
          <NumberField value={s.timerMinutes} min={0} max={180} onChange={(v) => updateSettings({ timerMinutes: v })} />
        </label>
        <label className="field column">
          <span>Выборка вопросов</span>
          <select className="input" value={s.sampling} onChange={(e) => updateSettings({ sampling: e.target.value as Sampling })}>
            <option value="random">Полностью случайно</option>
            <option value="proportional">Пропорционально по разделам</option>
          </select>
          <small className="muted">
            «Пропорционально» — поровну из каждого подраздела (при 10 вопросах — по одному из каждого из 10).
          </small>
        </label>
      </section>

      <section className="card form">
        <h2>Оформление</h2>
        <div className="chips" role="radiogroup" aria-label="Тема">
          {(
            [
              ['system', 'Как в системе'],
              ['light', 'Светлая'],
              ['dark', 'Тёмная'],
            ] as [Theme, string][]
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={s.theme === v} className={`chip ${s.theme === v ? 'active' : ''}`} onClick={() => updateSettings({ theme: v })}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card form">
        <h2>Прогресс</h2>
        <p className="muted small">
          Отметки, статистика, очередь ошибок, история экзаменов и настройки хранятся только в этом браузере. Сохраните файл, чтобы перенести их на
          другое устройство.
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={doExport}>
            Экспорт в файл
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Импорт из файла
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
          />
        </div>
        {msg && <p className={msg.ok ? 'ok-text' : 'bad-text'}>{msg.text}</p>}
        <button
          type="button"
          className="link danger"
          onClick={() => confirm('Сбросить весь прогресс? Настройки сохранятся.') && resetProgress()}
        >
          Сбросить прогресс
        </button>
      </section>
    </div>
  );
}
