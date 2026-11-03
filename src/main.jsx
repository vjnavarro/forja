import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  LayoutDashboard,
  Library,
  Plus,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import './fonts.css';
import { weights, sessions } from './demo';
import { readDemo, saveDemo, resetDemo } from './storage';
import { formatNumber } from './progress';
import { Brand } from './components/Brand';
import { Dashboard } from './components/Dashboard';
import { WeekPlan } from './components/WeekPlan';
import { ExerciseLibrary } from './components/ExerciseLibrary';
import { WeightDialog } from './components/WeightDialog';
import './style.css';

const navigation = [
  ['dashboard', 'Mi progreso', LayoutDashboard],
  ['week', 'Mi semana', Activity],
  ['library', 'Biblioteca', Library],
];
const headings = {
  dashboard: [
    'Cada paso cuenta.',
    'Tu evolución, tus hábitos y tu próximo objetivo. Todo en un mismo lugar.',
  ],
  week: [
    'Una semana. Cinco pasos.',
    'Natación, fuerza y core. Encuentra tu equilibrio, sesión a sesión.',
  ],
  library: [
    'Muévete con intención.',
    'Explora los movimientos y encuentra referencias para tu técnica.',
  ],
};

function App() {
  const [stored, setStored] = useState(readDemo);
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(false);
  const [notice, setNotice] = useState('');
  const heading = useRef(null);
  const records = stored.weights ?? weights;
  const completed =
    stored.completed ?? sessions.filter((session) => session.done).map((session) => session.id);
  const current = records.at(-1).kg;

  function navigate(nextTab) {
    if (nextTab === tab) return;
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => heading.current?.focus({ preventScroll: true }));
  }
  function update(patch, message) {
    const next = { ...stored, ...patch };
    setStored(next);
    setNotice(
      saveDemo(next)
        ? message
        : 'No se pudo guardar en este navegador. Los cambios durarán esta sesión.',
    );
  }
  function toggle(id) {
    const done = completed.includes(id);
    update(
      { completed: done ? completed.filter((value) => value !== id) : [...completed, id] },
      done ? 'Sesión desmarcada.' : 'Sesión completada. Un paso más en tu semana.',
    );
  }
  function reset() {
    if (!window.confirm('¿Restablecer todos los datos ficticios de la demo?')) return;
    if (resetDemo()) {
      setStored({});
      setNotice('Demo restablecida. Puedes empezar de nuevo.');
    } else setNotice('No se pudo restablecer el almacenamiento de este navegador.');
  }
  const navButtons = () =>
    navigation.map(([id, label, Icon]) => (
      <button
        key={id}
        className={tab === id ? 'active' : ''}
        aria-current={tab === id ? 'page' : undefined}
        onClick={() => navigate(id)}
      >
        <Icon size={20} />
        <span>{label}</span>
        {tab === id && <ChevronRight className="nav-chevron" size={16} />}
      </button>
    ));

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <button
          className="brand-home"
          aria-label="FORJA, ir a mi progreso"
          onClick={() => navigate('dashboard')}
        >
          <Brand />
          <span>MI TRANSFORMACIÓN</span>
        </button>
        <span className="nav-label">TU ESPACIO</span>
        <nav aria-label="Navegación principal">{navButtons()}</nav>
        <div className="sidebar-bottom">
          <Brand compact />
          <p>
            Tu camino.
            <br />
            <strong>A tu ritmo.</strong>
          </p>
          <span>Un espacio para seguir avanzando.</span>
        </div>
        <div className="sidebar-demo">
          <span className="status-dot" /> MODO DEMOSTRACIÓN
        </div>
      </aside>
      <main id="main-content">
        <header className="topbar">
          <button
            className="mobile-brand"
            aria-label="FORJA, ir a mi progreso"
            onClick={() => navigate('dashboard')}
          >
            <Brand />
          </button>
          <div className="breadcrumb">
            MI TRANSFORMACIÓN
            <ChevronRight size={13} />
            <span>{navigation.find(([id]) => id === tab)[1]}</span>
          </div>
          <div className="demo-indicator">
            <span className="status-dot" />
            <span>Datos de demo</span>
            <span className="profile-mark">
              <Brand compact />
            </span>
          </div>
        </header>
        <section className="page-heading">
          <div>
            <span className="eyebrow">FORJA · MI TRANSFORMACIÓN</span>
            <h1 ref={heading} tabIndex={-1}>
              {headings[tab][0]}
            </h1>
            <p>{headings[tab][1]}</p>
          </div>
          <button
            className="primary-button"
            aria-label="Registrar peso"
            onClick={() => setModal(true)}
          >
            <Plus size={18} />
            <span>Registrar peso</span>
          </button>
        </section>
        {notice && (
          <div className="notice" role="status">
            <Check size={17} />
            <span>{notice}</span>
            <button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard
            records={records}
            completed={completed}
            onRegister={() => setModal(true)}
            onShowWeek={() => navigate('week')}
          />
        )}
        {tab === 'week' && <WeekPlan completed={completed} onToggle={toggle} />}
        {tab === 'library' && <ExerciseLibrary />}
        <section className="local-note">
          <ShieldCheck size={17} />
          <span>Solo datos ficticios. Tus cambios se guardan en este navegador.</span>
          <span className="local-note-detail">Sin cuentas · Sin sincronización</span>
        </section>
        <footer>
          <div>
            <Brand compact />
            <span>
              FORJA <span>· Mi Transformación</span>
            </span>
          </div>
          <button onClick={reset}>
            <RotateCcw size={13} />
            Restablecer demo
          </button>
          <span>
            Un paso cada vez.
            <ArrowUpRight size={12} />
          </span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navButtons()}
      </nav>
      {modal && (
        <WeightDialog
          current={current}
          onClose={() => setModal(false)}
          onSave={(kg) => {
            update(
              { weights: [...records, { week: `Sem ${records.length + 1}`, kg }] },
              `Registro ficticio de ${formatNumber(kg)} kg añadido.`,
            );
            setModal(false);
          }}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
