import { useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../nav';

export function Header({ title, back, right }: { title: ReactNode; back?: string; right?: ReactNode }) {
  return (
    <header className="header">
      {back !== undefined && (
        <button type="button" className="icon-btn" onClick={() => navigate(back)} aria-label="Назад">
          ←
        </button>
      )}
      <h1>{title}</h1>
      {right && <div className="header-right">{right}</div>}
    </header>
  );
}

export function Bar({ value, total, tone = 'accent' }: { value: number; total: number; tone?: 'accent' | 'ok' }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
      <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const dtf = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (iso?: string) => (iso ? dtf.format(new Date(iso)) : '—');

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Склонение: plural(5, 'вопрос', 'вопроса', 'вопросов'). */
export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const clamp = (v: number, min: number, max: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min;

/** Числовое поле: свободно редактируется, значение фиксируется (с ограничением) при потере фокуса. */
export function NumberField({ value, min, max, onChange, id }: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  id?: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = clamp(Number(text), min, max);
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      className="input num"
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Горячие клавиши для текущего экрана: присвойте обработчик в ref.current во время рендера. */
export function useKeys() {
  const handler = useRef<((key: string) => void) | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('input, textarea, select')) return;
      // Enter на сфокусированной кнопке пусть нажимает саму кнопку.
      if (e.key === 'Enter' && t?.closest('button, a')) return;
      if (!handler.current) return;
      if (e.key === ' ') e.preventDefault(); // пробел — действие, а не прокрутка страницы
      handler.current(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return handler;
}
