import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  ACTIVITY_LABELS,
  generateDraft,
  planConflicts,
  repeatPreviousWeek,
  validateDraft,
  weekDates,
} from '../domain/planning.js';
import { formatDate } from '../domain/transformation.js';

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export function WeeklyPlanner({ profile, sessions, date, cloud, uid, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(undefined);
  const [days, setDays] = useState([]);
  const [counts, setCounts] = useState(() => ({
    swim: Math.min(7, profile.weeklyGoals.swim),
    strength: Math.min(7, profile.weeklyGoals.strength),
    core: Math.min(7, profile.weeklyGoals.core),
  }));
  const [draft, setDraft] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dates = weekDates(date);
  const start = dates[0];
  useEffect(() => {
    if (!open) return;
    setSaved(undefined);
    return cloud.watchWeeklyPlan(uid, profile.id, start, setSaved, (err) => {
      setError(
        err.code === 'permission-denied'
          ? 'El planificador todavía no está habilitado para tu cuenta. El administrador debe actualizar las reglas de acceso.'
          : 'No se pudo cargar el plan. Cierra el planificador y vuelve a intentarlo.',
      );
    });
  }, [cloud, uid, profile.id, start, open]);
  const conflicts = draft ? planConflicts(draft, sessions) : [];
  function resetDraft() {
    setDraft(null);
    setConfirmed(false);
    setError('');
  }
  function prepare(operation) {
    resetDraft();
    try {
      setDraft(operation());
      setConfirmed(false);
      setError('');
      setNotice('');
    } catch (err) {
      setError(err.message);
    }
  }
  function change(index, key, value) {
    setDraft((previous) => ({
      ...previous,
      source: 'manual',
      sessions: previous.sessions.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
    setConfirmed(false);
    setError('');
  }
  async function accept(e) {
    e.preventDefault();
    if (!confirmed || conflicts.length || busy) return;
    setBusy(true);
    setError('');
    try {
      const count = await cloud.acceptWeeklyPlan(uid, profile.id, validateDraft(draft));
      setDraft(null);
      setNotice(`${count} sesiones planificadas guardadas. Todavía no están completadas.`);
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'No se pudo guardar el plan. Revisa la autorización y las reglas de acceso.'
          : err.message || 'No se pudo guardar. El plan no se ha confirmado.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card private-section planner">
      <div className="section-head">
        <h2>
          <CalendarDays size={20} aria-hidden="true" /> Planificador semanal
        </h2>
        <button
          className="outline-button"
          disabled={busy || disabled}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            setError('');
          }}
        >
          {' '}
          {open ? 'Cerrar planificador' : 'Planificar semana'}
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {open && (
        <>
          <p className="context-note">
            Semana del {formatDate(start)} al {formatDate(dates[6])}. Organiza fechas y actividades;
            concreta la duración y los ejercicios editando las sesiones.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {saved === undefined ? (
            !error && <p role="status">Cargando planificación…</p>
          ) : saved ? (
            <p className="context-note">
              Esta semana ya tiene un plan aceptado de {saved.sessionIds.length} sesiones. Puedes
              editar las sesiones de la semana y registrar otras manualmente.
            </p>
          ) : (
            <>
              <form
                className="private-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  prepare(() => generateDraft(date, days, counts));
                }}
              >
                <fieldset disabled={busy || disabled}>
                  <legend>Mis días disponibles</legend>
                  <div className="planner-days">
                    {weekdays.map((label, index) => (
                      <label className="check-label" key={label}>
                        <input
                          type="checkbox"
                          checked={days.includes(index)}
                          onChange={(e) => {
                            resetDraft();
                            setDays((previous) =>
                              e.target.checked
                                ? [...previous, index]
                                : previous.filter((day) => day !== index),
                            );
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset disabled={busy || disabled}>
                  <legend>Bloques que quiero organizar</legend>
                  <p>
                    Hasta siete bloques, uno por día. Los objetivos de tu perfil sirven de
                    referencia; tú eliges esta semana.
                  </p>
                  <div className="planner-counts">
                    {Object.entries(ACTIVITY_LABELS).map(([type, label]) => (
                      <label key={type}>
                        {label}
                        <input
                          type="number"
                          min="0"
                          max="7"
                          value={counts[type]}
                          required
                          onChange={(e) => {
                            resetDraft();
                            setCounts((previous) => ({
                              ...previous,
                              [type]: e.target.value === '' ? '' : Number(e.target.value),
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <p className="care-note">
                  Fuerza y core se reservan como bloques pendientes de concretar. Una autorización
                  general para empezar no define ejercicios ni cargas. No hay progresión automática.
                </p>
                <div className="form-actions">
                  <button className="primary-button" disabled={busy || disabled}>
                    Generar borrador
                  </button>
                  <button
                    type="button"
                    className="outline-button"
                    disabled={busy || disabled}
                    onClick={() => prepare(() => repeatPreviousWeek(date, sessions))}
                  >
                    Reutilizar semana anterior
                  </button>
                </div>
                <p className="input-hint">
                  Reutilizar copia únicamente días y actividades. Duración, ejercicios, molestias y
                  completados se vuelven a registrar.
                </p>
              </form>
              {draft && (
                <form className="private-form planner-draft" onSubmit={accept}>
                  <h3>Borrador para revisar</h3>
                  <p className="context-note">
                    Origen:{' '}
                    {draft.source === 'availability'
                      ? 'disponibilidad y bloques elegidos por ti'
                      : draft.source === 'previous-week'
                        ? 'distribución de la semana anterior'
                        : 'ajustes manuales del borrador'}
                    . Este calendario no utiliza tu peso ni el avatar para asignar actividad.
                  </p>
                  <fieldset disabled={busy || disabled}>
                    <legend>Fechas y actividades</legend>
                    {draft.sessions.map((row, index) => (
                      <div className="planner-row" key={index}>
                        <label>
                          Fecha del bloque {index + 1}
                          <input
                            type="date"
                            min={start}
                            max={dates[6]}
                            value={row.date}
                            required
                            onChange={(e) => change(index, 'date', e.target.value)}
                          />
                        </label>
                        <label>
                          Actividad del bloque {index + 1}
                          <select
                            value={row.type}
                            onChange={(e) => change(index, 'type', e.target.value)}
                          >
                            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                              <option key={key} value={key}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))}
                    {conflicts.length > 0 && (
                      <p className="form-error" role="alert">
                        Ya hay sesiones el {conflicts.map((row) => formatDate(row.date)).join(', ')}
                        . Elige otros días para esos bloques.
                      </p>
                    )}
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      He revisado las fechas y actividades. Los detalles se concretarán en cada
                      sesión.
                    </label>
                  </fieldset>
                  <button
                    className="primary-button"
                    disabled={!confirmed || busy || disabled || conflicts.length > 0}
                  >
                    {busy ? 'Guardando plan…' : 'Aceptar y guardar plan'}
                  </button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
