import { LETTERS, type Letter, type Question } from '../types';
import { translationOf, useShowTranslation } from '../translation';

interface Props {
  q: Question;
  /** Исходные буквы в порядке показа; по умолчанию — как в PDF. */
  order?: Letter[];
  /** Выбранная исходная буква. */
  chosen?: Letter | null;
  /** Подсветить правильный (и неверно выбранный) вариант. */
  reveal?: boolean;
  onChoose?: (letter: Letter) => void;
  /** Разрешить показ перевода вариантов (в экзамене — нет). */
  translatable?: boolean;
}

export function Options({ q, order = LETTERS, chosen = null, reveal = false, onChoose, translatable = true }: Props) {
  const show = useShowTranslation() && translatable;
  const tr = show ? translationOf(q.id) : undefined;
  return (
    <ol className="options" role="list">
      {order.map((orig, i) => {
        const opt = q.options.find((o) => o.key === orig)!;
        const isAnswer = orig === q.answer;
        let state = '';
        if (reveal && isAnswer) state = 'correct';
        else if (reveal && orig === chosen) state = 'wrong';
        else if (!reveal && orig === chosen) state = 'selected';
        const content = (
          <>
            <span className="opt-letter ka">{LETTERS[i]}</span>
            <span className="opt-text ka">
              {opt.text}
              {tr && <span className="tr opt-tr">{tr.options[orig]}</span>}
            </span>
            {state === 'correct' && <span className="opt-mark" aria-label="верный ответ">✓</span>}
            {state === 'wrong' && <span className="opt-mark" aria-label="ваш ответ">✗</span>}
          </>
        );
        return (
          <li key={orig}>
            {onChoose ? (
              <button type="button" className={`option ${state}`} onClick={() => onChoose(orig)} aria-pressed={orig === chosen}>
                {content}
              </button>
            ) : (
              <div className={`option static ${state}`}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
