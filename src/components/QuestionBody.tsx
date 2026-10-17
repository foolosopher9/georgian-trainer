import type { ReactNode } from 'react';
import type { Question } from '../types';
import { promptTranslation, toggleTranslation, translationOf, useShowTranslation } from '../translation';

/** Текст с пропусками «----------» и выделенным подчёркнутым словом. */
function renderContext(text: string, underline?: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = underline
    ? new RegExp(`(-{3,})|(?<![ა-ჰ])(${underline})(?![ა-ჰ])`, 'g')
    : /(-{3,})/g;
  let last = 0;
  let underlined = false;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (m[2] && underlined) continue; // выделяем только первое вхождение
    parts.push(text.slice(last, idx));
    if (m[1]) parts.push(<span key={idx} className="gap" aria-label="пропуск" />);
    else {
      parts.push(
        <u key={idx} className="underline-word">
          {m[2]}
        </u>,
      );
      underlined = true;
    }
    last = idx + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

export function QuestionBody({ q, showId = true, translatable = true }: { q: Question; showId?: boolean; translatable?: boolean }) {
  const long = q.subsection === 'III.3';
  const show = useShowTranslation() && translatable;
  const tr = translationOf(q.id);
  return (
    <div className="qbody">
      {showId && (
        <div className="qmeta">
          <span className="qid">{q.id}</span>
          <span className="ka">{q.subsectionTitle}</span>
          {translatable && tr && (
            <button type="button" className={`tr-toggle ${show ? 'active' : ''}`} onClick={(e) => (e.stopPropagation(), toggleTranslation())} aria-pressed={show}>
              перевод
            </button>
          )}
        </div>
      )}
      <p className="qprompt ka">{q.prompt}</p>
      {show && promptTranslation(q.prompt) && <p className="tr tr-prompt">{promptTranslation(q.prompt)}</p>}
      {q.context && (
        <div className={`qcontext ka ${long ? 'long' : ''}`}>{renderContext(q.context, q.underline)}</div>
      )}
      {show && tr?.context && <div className="tr tr-context">{renderContext(tr.context)}</div>}
      {show && tr && <p className="ai-note">Перевод сгенерирован ИИ и может содержать неточности.</p>}
    </div>
  );
}
