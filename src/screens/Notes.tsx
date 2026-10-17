import type { ReactNode } from 'react';
import raw from '../data/notes.json';
import { subsectionById, subsections } from '../data';
import { navigate } from '../nav';
import { Header } from '../components/ui';

type Block = { h: string } | { p: string } | { list: string[] } | { table: string[][] };
interface Note {
  summary: string;
  blocks: Block[];
}
const notes = raw as Record<string, Note>;

/** **жирный** внутри строки. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part,
  );
}

const AiNote = () => <p className="ai-note banner">Шпаргалки сгенерированы ИИ и могут содержать неточности. Ключи ответов взяты из официального PDF.</p>;

export function NotesIndex() {
  return (
    <div className="screen">
      <Header title="Шпаргалки" back="/" />
      <AiNote />
      <ul className="card plain-list notes-index">
        {subsections.map((s) => (
          <li key={s.id}>
            <button type="button" className="qrow-main" onClick={() => navigate(`/notes/${s.id}`)}>
              <span className="qrow-id">{s.id}</span>
              <span className="notes-index-text">
                <span className="ka">{s.title}</span>
                <span className="muted small">{notes[s.id]?.summary}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NotesView({ id }: { id: string }) {
  const sub = subsectionById.get(id);
  const note = notes[id];
  if (!sub || !note) {
    return (
      <div className="screen">
        <Header title="Шпаргалка не найдена" back="/notes" />
      </div>
    );
  }
  const idx = subsections.indexOf(sub);
  const prev = subsections[idx - 1];
  const next = subsections[idx + 1];
  return (
    <div className="screen">
      <Header
        title={
          <>
            {sub.id} <span className="ka">{sub.title}</span>
          </>
        }
        back="/notes"
      />
      <AiNote />
      <article className="card note">
        <p className="note-summary">{inline(note.summary)}</p>
        {note.blocks.map((b, i) => {
          if ('h' in b) return <h3 key={i}>{inline(b.h)}</h3>;
          if ('p' in b) return <p key={i}>{inline(b.p)}</p>;
          if ('list' in b)
            return (
              <ul key={i}>
                {b.list.map((li, j) => (
                  <li key={j}>{inline(li)}</li>
                ))}
              </ul>
            );
          return (
            <div key={i} className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {b.table[0].map((c, j) => (
                      <th key={j}>{inline(c)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.table.slice(1).map((row, r) => (
                    <tr key={r}>
                      {row.map((c, j) => (
                        <td key={j}>{inline(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </article>
      <a className="btn" href="#/catalog">
        Вопросы в каталоге
      </a>
      <div className="pager">
        <button type="button" className="btn" disabled={!prev} onClick={() => prev && navigate(`/notes/${prev.id}`, true)}>
          ← {prev?.id ?? ''}
        </button>
        <button type="button" className="btn" disabled={!next} onClick={() => next && navigate(`/notes/${next.id}`, true)}>
          {next?.id ?? ''} →
        </button>
      </div>
    </div>
  );
}
