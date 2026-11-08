import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Brand } from './components/Brand.jsx';
import { AccountMenu } from './components/AccountMenu.jsx';
import { cloudConfigured } from './services/config.js';
const TransformationSpace = lazy(() =>
  import('./private/TransformationSpace.jsx').then((module) => ({
    default: module.TransformationSpace,
  })),
);
function getPath() {
  const value = window.location.hash.slice(1);
  return /^\/transformaciones(?:\/[A-Za-z0-9_-]{1,100})?$/.test(value) ? value : '/';
}
export default function App() {
  const [path, setPath] = useState(getPath);
  const [cloud, setCloud] = useState(null);
  const [session, setSession] = useState({
    status: cloudConfigured ? 'loading' : 'unconfigured',
    user: null,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formatError, setFormatError] = useState(
    () => (err) => err?.message || 'No se pudo completar la operación.',
  );
  useEffect(() => {
    const update = () => {
      setPath(getPath());
      setError('');
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    if (!cloudConfigured) return;
    let alive = true;
    let stop = () => {};
    import('./services/firebase.js')
      .then(async (module) => {
        const instance = await module.getCloud();
        if (!alive) return;
        setCloud(instance);
        setFormatError(() => module.friendlyError);
        stop = instance.watchSession(setSession);
      })
      .catch(() => {
        if (alive) setSession({ status: 'error', user: null });
      });
    return () => {
      alive = false;
      stop();
    };
  }, []);
  const navigate = useCallback((value) => {
    window.location.hash = value;
  }, []);
  const logout = useCallback(async () => {
    setError('');
    try {
      await cloud?.logout();
      setSession({ status: 'signed-out', user: null });
      navigate('/');
      return true;
    } catch {
      setError('No se pudo cerrar la sesión. Vuelve a intentarlo.');
      return false;
    }
  }, [cloud, navigate]);
  async function login() {
    if (!cloud) return;
    setBusy(true);
    setError('');
    try {
      await cloud.login();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setBusy(false);
    }
  }
  const privateRoute = path.startsWith('/transformaciones');
  if (privateRoute && session.status === 'allowed' && session.user)
    return (
      <Suspense
        fallback={
          <p className="access-card" role="status">
            Abriendo tu espacio…
          </p>
        }
      >
        <TransformationSpace
          key={session.user.uid}
          user={session.user}
          cloud={cloud}
          path={path}
          navigate={navigate}
          onLogout={logout}
          errorText={formatError}
        />
      </Suspense>
    );
  return (
    <div className="portal-page">
      <a
        href="#portal-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('portal-content')?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="portal-header">
        <button aria-label="Inicio FORJA" onClick={() => navigate('/')}>
          <Brand />
        </button>
        <nav aria-label="Portal FORJA">
          <button onClick={() => navigate('/')} aria-current={!privateRoute ? 'page' : undefined}>
            Inicio
          </button>
          <button onClick={() => navigate('/transformaciones')}>Mi Transformación</button>
        </nav>
        {session.status === 'allowed' && session.user ? (
          <AccountMenu user={session.user} onLogout={logout} />
        ) : (
          <button
            className="primary-button"
            disabled={!cloud || busy}
            onClick={() => {
              navigate('/transformaciones');
              login();
            }}
          >
            {busy ? 'Accediendo…' : 'Acceder con Google'}
          </button>
        )}
      </header>
      <main id="portal-content" className="portal-main" tabIndex={-1}>
        {privateRoute ? (
          <section className="access-card">
            <ShieldCheck size={36} />
            <span className="eyebrow">TU ESPACIO PRIVADO</span>
            <h1>Mi Transformación</h1>
            <p>
              {session.status === 'unconfigured'
                ? 'El acceso privado está pendiente de activación. Tus datos personales no se muestran en esta página.'
                : session.status === 'denied'
                  ? 'Esta cuenta no tiene acceso a FORJA. Cierra la sesión y utiliza una cuenta autorizada.'
                  : session.status === 'error'
                    ? 'No se ha podido preparar el acceso. Vuelve a cargar la página o inténtalo más tarde.'
                    : ['loading', 'checking'].includes(session.status)
                      ? 'Comprobando tu acceso…'
                      : 'Accede con Google para abrir tus transformaciones. Cada cuenta conserva su propio historial.'}
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {session.status === 'denied' ? (
              <button className="outline-button" onClick={logout}>
                Cerrar sesión de esta cuenta
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={!cloud || busy || ['loading', 'checking'].includes(session.status)}
                onClick={login}
              >
                {busy ? 'Accediendo…' : 'Continuar con Google'}
              </button>
            )}
            <button className="text-button" onClick={() => navigate('/')}>
              Volver al portal
            </button>
          </section>
        ) : (
          <>
            <section className="portal-hero">
              <div>
                <span className="eyebrow">BIENVENIDO A FORJA</span>
                <h1>
                  Un espacio para
                  <br />
                  construir tu camino.
                </h1>
                <p>
                  Conocimiento, movimiento y seguimiento personal. Accede a las herramientas de
                  FORJA desde un mismo lugar.
                </p>
                <button className="primary-button" onClick={() => navigate('/transformaciones')}>
                  Mi Transformación
                  <ArrowRight size={17} />
                </button>
              </div>
              <div className="portal-hero-art" aria-hidden="true">
                <Brand compact />
                <span>FORJA</span>
              </div>
            </section>
            <section className="portal-modules" aria-labelledby="modules-title">
              <div className="section-head">
                <div>
                  <span className="eyebrow">EXPLORA TU ESPACIO</span>
                  <h2 id="modules-title">Herramientas FORJA</h2>
                </div>
                <span className="portal-access">
                  <ShieldCheck size={15} />
                  Acceso privado
                </span>
              </div>
              <article className="card portal-module">
                <span className="module-icon">
                  <Activity size={27} />
                </span>
                <div>
                  <span className="eyebrow">SEGUIMIENTO PERSONAL</span>
                  <h2>Mi Transformación</h2>
                  <p>
                    Tu recorrido, tus objetivos y tu actividad semanal. Gráficas, hitos y resúmenes
                    para seguir avanzando.
                  </p>
                </div>
                <button className="outline-button" onClick={() => navigate('/transformaciones')}>
                  Abrir módulo
                  <ArrowUpRight size={16} />
                </button>
              </article>
            </section>
          </>
        )}
        <footer className="portal-footer">
          <div>
            <Brand compact />
            <span>FORJA</span>
          </div>
          <span>Tu información, en tu espacio privado.</span>
        </footer>
      </main>
    </div>
  );
}
