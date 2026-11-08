import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Eye,
  EyeOff,
  HeartPulse,
  LayoutDashboard,
  Library,
  Plus,
  SlidersHorizontal,
  Scale,
  Upload,
  X,
} from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { AccountMenu } from '../components/AccountMenu.jsx';
import { TransformationDashboard } from './TransformationDashboard.jsx';
import { Dialog, ProfileForm, SessionForm, WeightForm } from './Forms.jsx';
import { AppearanceForm } from './AvatarPicker.jsx';
import {
  HealthContext,
  ReliableLibrary,
  WeeklyExport,
  WeeklyPlan,
  WeightHistory,
} from './Views.jsx';

export function TransformationSpace({ cloud, user, path, navigate, onLogout, errorText }) {
  const [profiles, setProfiles] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    setProfiles(null);
    setError('');
    return cloud.watchTransformations(user.uid, setProfiles, (err) => setError(errorText(err)));
  }, [cloud, user.uid, errorText]);
  async function create(profile) {
    setBusy(true);
    setError('');
    try {
      const id = await cloud.createTransformation(user.uid, profile);
      setCreating(false);
      navigate(`/transformaciones/${id}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('El archivo supera el tamaño admitido.');
      const raw = JSON.parse(await file.text());
      const id = await cloud.importTransformation(user, raw);
      navigate(`/transformaciones/${id}`);
    } catch (err) {
      setError(err instanceof SyntaxError ? 'No se pudo leer el archivo JSON.' : errorText(err));
    } finally {
      setBusy(false);
    }
  }
  if (error && !profiles)
    return (
      <section className="access-card">
        <h1>No se pudo abrir tu espacio</h1>
        <p role="alert">{error}</p>
        <button className="outline-button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </section>
    );
  if (!profiles)
    return (
      <section className="access-card" role="status">
        Cargando tu espacio privado…
      </section>
    );
  const id = path.split('/')[2];
  const profile = profiles.find((row) => row.id === id);
  if (id && profile)
    return (
      <PrivateTransformation
        key={`${user.uid}:${id}`}
        profile={profile}
        cloud={cloud}
        user={user}
        navigate={navigate}
        onLogout={onLogout}
        errorText={errorText}
      />
    );
  return (
    <div className="portal-page">
      <header className="portal-header">
        <button aria-label="Volver al portal FORJA" onClick={() => navigate('/')}>
          <Brand />
        </button>
        <AccountMenu user={user} onLogout={onLogout} />
      </header>
      <main className="portal-main">
        <section className="portal-heading">
          <span className="eyebrow">MI ESPACIO PRIVADO</span>
          <h1>Mis transformaciones</h1>
          <p>Cada transformación tiene su historial, sus objetivos y su seguimiento.</p>
        </section>
        {id && !profile && (
          <p className="form-error" role="alert">
            La transformación no está disponible en tu cuenta.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {creating ? (
          <ProfileForm
            onSave={create}
            onCancel={() => setCreating(false)}
            busy={busy}
            error={error}
          />
        ) : (
          <>
            <div className="space-actions">
              <button className="primary-button" onClick={() => setCreating(true)} disabled={busy}>
                <Plus size={18} />
                Nueva transformación
              </button>
              <label className={`outline-button import-button ${busy ? 'is-disabled' : ''}`}>
                <Upload size={16} />
                {busy ? 'Importando…' : 'Importar historial privado'}
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={importFile}
                />
              </label>
            </div>
            <div className="transformation-list">
              {profiles.map((row) => (
                <article className="card transformation-card" key={row.id}>
                  <span className="module-icon">
                    <Activity size={28} />
                  </span>
                  <span className="eyebrow">MI TRANSFORMACIÓN</span>
                  <h2>{row.title}</h2>
                  <p>
                    <EyeOff size={14} />
                    Se abre en modo incógnito
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => navigate(`/transformaciones/${row.id}`)}
                  >
                    Abrir transformación
                  </button>
                </article>
              ))}
            </div>
            {!profiles.length && (
              <section className="empty-state">
                <h2>Tu historia empieza aquí</h2>
                <p>
                  Todavía no tienes transformaciones. Puedes crear una o importar tu propio
                  historial.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
const tabs = [
  ['dashboard', 'Progreso', LayoutDashboard],
  ['weights', 'Pesajes', Scale],
  ['week', 'Semana', Activity],
  ['library', 'Biblioteca', Library],
  ['summary', 'Resumen', ClipboardList],
  ['context', 'Contexto', HeartPulse],
];
function PrivateTransformation({ profile, cloud, user, navigate, onLogout, errorText }) {
  const [data, setData] = useState({ weights: null, sessions: null, context: undefined });
  const [incognito, setIncognito] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [form, setForm] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const fail = (err) => {
      setLoadError(errorText(err));
      setData({ weights: null, sessions: null, context: undefined });
      setIncognito(true);
    };
    const update = (key, value) => setData((previous) => ({ ...previous, [key]: value }));
    const stop = [
      cloud.watchRecords(user.uid, profile.id, 'weights', (rows) => update('weights', rows), fail),
      cloud.watchRecords(
        user.uid,
        profile.id,
        'sessions',
        (rows) => update('sessions', rows),
        fail,
      ),
      cloud.watchContext(user.uid, profile.id, (value) => update('context', value), fail),
    ];
    return () => stop.forEach((fn) => fn());
  }, [cloud, user.uid, profile.id, errorText]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) {
        setIncognito(true);
        setForm(null);
        setNotice('');
      }
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function selectTab(value) {
    setTab(value);
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function write(operation, message) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setForm(null);
      setNotice(message);
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const onWeight = () => {
    setError('');
    setForm('weight');
  };
  const onSession = (preset = null) => {
    setError('');
    setEditingSession(
      preset?.date
        ? {
            date: preset.date,
            type: preset.type,
            minutes: null,
            distance: null,
            exercises: [],
            completed: false,
            discomfort: 'not-reported',
            notes: '',
          }
        : null,
    );
    setForm('session');
  };
  const nav = () =>
    tabs.map(([value, label, Icon]) => (
      <button
        key={value}
        className={tab === value ? 'active' : ''}
        aria-current={tab === value ? 'page' : undefined}
        onClick={() => selectTab(value)}
      >
        <Icon size={19} />
        <span>{label}</span>
      </button>
    ));
  const loading = !data.weights || !data.sessions || data.context === undefined;
  return (
    <div
      className={`app private-app ${tab === 'dashboard' ? 'infographic-theme' : ''} ${tab === 'week' ? 'private-week-view' : ''}`}
    >
      <a
        className="skip-link"
        href="#private-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('private-content')?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <button
          className="brand-home"
          aria-label="Volver al portal FORJA"
          onClick={() => navigate('/')}
        >
          <Brand />
          <span>MI TRANSFORMACIÓN</span>
        </button>
        <span className="nav-label">TU SEGUIMIENTO</span>
        <nav aria-label="Secciones de la transformación">{nav()}</nav>
        <div className="sidebar-bottom">
          <EyeOff size={26} />
          <p>
            Tu espacio.
            <br />
            <strong>Solo para ti.</strong>
          </p>
        </div>
        <button className="sidebar-exit" onClick={() => navigate('/transformaciones')}>
          <ArrowLeft size={15} />
          Mis transformaciones
        </button>
      </aside>
      <main id="private-content" tabIndex={-1}>
        <header className="topbar">
          <button
            className="mobile-brand"
            aria-label="Volver al portal FORJA"
            onClick={() => navigate('/')}
          >
            <Brand />
          </button>
          <button className="text-button back-space" onClick={() => navigate('/transformaciones')}>
            <ArrowLeft size={15} />
            Mis transformaciones
          </button>
          <div className="private-toolbar">
            <button
              className="privacy-toggle"
              aria-pressed={incognito}
              aria-label={incognito ? 'Desactivar modo incógnito' : 'Activar modo incógnito'}
              onClick={() => {
                setIncognito((value) => !value);
                setForm(null);
                setNotice('');
              }}
            >
              {incognito ? <EyeOff size={18} /> : <Eye size={18} />}
              <span>{incognito ? 'Incógnito' : 'Cifras visibles'}</span>
            </button>
            <AccountMenu user={user} onLogout={onLogout} />
          </div>
        </header>
        <section className="page-heading">
          <div>
            <span className="eyebrow">FORJA · MI TRANSFORMACIÓN</span>
            <h1>{incognito ? profile.title.replace(/\d/g, '•') : profile.title}</h1>
            <p>Tu evolución, tus hábitos y tus próximos objetivos.</p>
          </div>
          <div className="quick-actions">
            <button
              className="outline-button"
              onClick={() => {
                setError('');
                setForm('appearance');
              }}
            >
              <SlidersHorizontal size={17} />
              Figuras
            </button>
            <button className="primary-button" onClick={onWeight}>
              <Plus size={17} />
              Pesaje
            </button>
            <button className="outline-button" onClick={onSession}>
              <Plus size={17} />
              Sesión
            </button>
          </div>
        </section>
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {error && !form && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loadError ? (
          <section className="card private-section">
            <p role="alert">{loadError}</p>
            <button className="outline-button" onClick={() => navigate('/transformaciones')}>
              Volver a mi espacio
            </button>
          </section>
        ) : loading ? (
          <p role="status">Cargando datos privados…</p>
        ) : (
          <>
            {tab === 'dashboard' && (
              <TransformationDashboard
                profile={profile}
                weights={data.weights}
                incognito={incognito}
                onReveal={() => setIncognito(false)}
                onWeight={onWeight}
                onWeek={() => selectTab('week')}
              />
            )}{' '}
            {tab === 'weights' && (
              <WeightHistory
                profile={profile}
                weights={data.weights}
                incognito={incognito}
                onWeight={onWeight}
              />
            )}{' '}
            {tab === 'week' && (
              <WeeklyPlan
                profile={profile}
                sessions={data.sessions}
                incognito={incognito}
                onReveal={() => setIncognito(false)}
                onSession={onSession}
                onEdit={(session) => {
                  setError('');
                  setEditingSession(session);
                  setForm('edit-session');
                }}
                cloud={cloud}
                uid={user.uid}
                onToggle={(session) =>
                  write(
                    () => cloud.toggleSession(user.uid, profile.id, session),
                    'Estado de la sesión guardado.',
                  )
                }
                busy={busy}
              />
            )}{' '}
            {tab === 'library' && <ReliableLibrary />}{' '}
            {tab === 'summary' && (
              <WeeklyExport
                profile={profile}
                weights={data.weights}
                sessions={data.sessions}
                context={data.context}
                incognito={incognito}
                onReveal={() => setIncognito(false)}
              />
            )}{' '}
            {tab === 'context' && (
              <HealthContext
                key={incognito ? 'hidden' : 'visible'}
                context={data.context}
                incognito={incognito}
                onReveal={() => setIncognito(false)}
                onSave={(context) =>
                  write(
                    () => cloud.saveContext(user.uid, profile.id, context),
                    'Contexto privado guardado.',
                  )
                }
                busy={busy}
                error={error}
              />
            )}
          </>
        )}
        <footer>
          <div>
            <Brand compact />
            <span>FORJA · Espacio privado</span>
          </div>
          <span>La sincronización requiere conexión.</span>
        </footer>
      </main>
      <nav className="mobile-nav private-nav" aria-label="Navegación móvil">
        {nav()}
      </nav>
      {form && (
        <Dialog
          title={
            form === 'appearance'
              ? 'Personalizar figuras'
              : form === 'weight'
                ? 'Registrar pesaje'
                : form === 'edit-session'
                  ? 'Editar sesión'
                  : 'Registrar sesión'
          }
          onClose={() => {
            if (!busy) setForm(null);
          }}
        >
          {form === 'appearance' ? (
            <AppearanceForm
              profile={profile}
              busy={busy}
              error={error}
              onSave={(value) =>
                write(
                  () => cloud.saveAppearance(user.uid, profile.id, value),
                  'Figuras guardadas en tu transformación.',
                )
              }
            />
          ) : form === 'weight' ? (
            <WeightForm
              busy={busy}
              error={error}
              onSave={(value) =>
                write(
                  () => cloud.addWeight(user.uid, profile.id, value),
                  'Pesaje guardado en tu cuenta.',
                )
              }
            />
          ) : (
            <SessionForm
              initial={editingSession}
              busy={busy}
              error={error}
              onSave={(value) =>
                write(
                  () =>
                    form === 'edit-session'
                      ? cloud.editSession(user.uid, profile.id, editingSession, value)
                      : cloud.addSession(user.uid, profile.id, value),
                  'Sesión guardada en tu cuenta.',
                )
              }
            />
          )}
        </Dialog>
      )}
    </div>
  );
}
