import { useEffect } from 'react';
import { navigate, useRoute } from './nav';
import { useProgress } from './store';
import { Home } from './screens/Home';
import { Catalog } from './screens/Catalog';
import { QuestionView } from './screens/QuestionView';
import { TrainSetup } from './screens/TrainSetup';
import { SessionRunner } from './screens/SessionRunner';
import { Mistakes } from './screens/Mistakes';
import { ExamSetup, ExamRunner } from './screens/Exam';
import { ExamReview } from './screens/ExamReview';
import { SettingsScreen } from './screens/Settings';
import { FlashcardsRunner, FlashcardsSetup } from './screens/Flashcards';
import { NotesIndex, NotesView } from './screens/Notes';

const TABS = [
  { path: '/', label: 'Главная', icon: '⌂' },
  { path: '/catalog', label: 'Каталог', icon: '☰' },
  { path: '/mistakes', label: 'Ошибки', icon: '✗' },
  { path: '/settings', label: 'Настройки', icon: '⚙' },
];

function useTheme() {
  const { theme } = useProgress().settings;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}

function route(path: string) {
  const [, a, b] = path.split('/');
  switch (a) {
    case '':
      return <Home />;
    case 'catalog':
      return <Catalog />;
    case 'q':
      return <QuestionView id={b} />;
    case 'train':
      return <TrainSetup />;
    case 'session':
      return <SessionRunner />;
    case 'mistakes':
      return <Mistakes />;
    case 'exam':
      if (b === 'run') return <ExamRunner />;
      if (b === 'result') return <ExamReview index={Number(path.split('/')[3] ?? 0)} />;
      return <ExamSetup />;
    case 'settings':
      return <SettingsScreen />;
    case 'cards':
      return b === 'run' ? <FlashcardsRunner /> : <FlashcardsSetup />;
    case 'notes':
      return b ? <NotesView id={b} /> : <NotesIndex />;
    default:
      return <Home />;
  }
}

export default function App() {
  useTheme();
  const path = useRoute();
  const mistakesCount = Object.keys(useProgress().mistakes).length;
  const inQuiz = path === '/session' || path === '/exam/run' || path === '/cards/run';
  const tabPath = path.startsWith('/q/') ? '/catalog' : path;
  const activeTab = TABS.slice()
    .reverse()
    .find((t) => (t.path === '/' ? tabPath === '/' : tabPath.startsWith(t.path)));

  return (
    <div className="app">
      <main className="main">{route(path)}</main>
      {!inQuiz && (
        <nav className="tabbar" aria-label="Основная навигация">
          {TABS.map((t) => (
            <button
              key={t.path}
              type="button"
              className={`tab ${activeTab?.path === t.path ? 'active' : ''}`}
              onClick={() => navigate(t.path)}
            >
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              <span>
                {t.label}
                {t.path === '/mistakes' && mistakesCount > 0 && <span className="badge">{mistakesCount}</span>}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
