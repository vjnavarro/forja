import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

export function AccountMenu({ user, onLogout }) {
  const ref = useRef(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const closeOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
        ref.current.querySelector('.account-toggle').focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  async function logout() {
    setBusy(true);
    setError('');
    try {
      if ((await onLogout()) === false) throw new Error('logout failed');
    } catch {
      setError('No se pudo cerrar la sesión. Vuelve a intentarlo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={ref} className="account-menu">
      <button
        className="account-toggle"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound size={17} aria-hidden="true" />
        <span>Cuenta</span>
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="account-panel" role="group" aria-label="Tu cuenta de Google">
          <span>Sesión iniciada con Google</span>
          <strong>{user.email}</strong>
          <button className="account-signout" onClick={logout} disabled={busy}>
            <LogOut size={17} aria-hidden="true" />
            {busy ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
