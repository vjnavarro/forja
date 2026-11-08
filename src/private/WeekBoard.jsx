import { useEffect, useRef, useState } from 'react';
import './week-board.css';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Waves,
  PersonStanding,
} from 'lucide-react';
import { Dialog } from './Forms.jsx';
import { WeeklyPlanner } from './WeeklyPlanner.jsx';
import { TrainingAutomation } from './TrainingAutomation.jsx';
import { ACTIVITY_LABELS, shiftDate, weekDates } from '../domain/planning.js';
import { formatDate, today, weekBounds } from '../domain/transformation.js';

const activityIcons = { swim: Waves, strength: Dumbbell, core: PersonStanding };
const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export function WeekBoard({ profile, sessions, onSession, onToggle, onEdit, cloud, uid, busy }) {
  const [date, setDate] = useState(() => weekBounds(today()).start);
  const [program, setProgram] = useState(undefined);
  const [selectedDay, setSelectedDay] = useState(null);
  const initialized = useRef(false);
  const [panel, setPanel] = useState(null);
  const [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  const [working, setWorking] = useState(false),
    [dialog, setDialog] = useState(null);
  const [confirmed, setConfirmed] = useState(false),
    [restart, setRestart] = useState(false);
  const start = weekBounds(date).start,
    dates = weekDates(start),
    end = dates[6];
  const rows = sessions.filter((row) => row.date >= start && row.date <= end);
  const completed = rows.filter((row) => row.completed).length;
  const disabled = busy || working;
  useEffect(
    () =>
      cloud.watchTrainingProgram(
        uid,
        profile.id,
        (value) => {
          setProgram(value);
          if (!initialized.current) {
            initialized.current = true;
            if (value?.startWeek > weekBounds(today()).start) setDate(value.startWeek);
          }
        },
        () => setError('No se pudo cargar la programación. Revisa las reglas de acceso.'),
      ),
    [cloud, uid, profile.id],
  );
  function chooseWeek(value) {
    initialized.current = true;
    setDate(weekBounds(value).start);
    setNotice('');
    setError('');
  }
  async function perform(operation) {
    setWorking(true);
    setError('');
    try {
      await operation();
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'No se pudo guardar el cambio. Hay que publicar las reglas de Firebase de esta versión.'
          : err.message || 'No se pudo completar la operación.',
      );
    } finally {
      setWorking(false);
    }
  }
  async function openReset() {
    await perform(async () => {
      const snapshot = await cloud.prepareWeekReset(uid, profile.id, start);
      setConfirmed(false);
      setRestart(snapshot.canRestart);
      setDialog({ kind: 'week', snapshot });
    });
  }
  async function remove(e) {
    e.preventDefault();
    if (!confirmed || disabled) return;
    await perform(async () => {
      if (dialog.kind === 'week') {
        const result = await cloud.resetTrainingWeek(uid, profile.id, dialog.snapshot.weekStart, {
          token: dialog.snapshot.token,
          restartProgram: restart,
        });
        setDate(result.nextWeek);
        setNotice(
          `${result.deleted} actividades eliminadas. ${restart ? `La programación empieza el ${formatDate(result.nextWeek)}.` : 'Semana vaciada.'}`,
        );
      } else {
        await cloud.deleteSession(uid, profile.id, dialog.row);
        setNotice('Actividad eliminada. Las demás se conservan.');
      }
      setDialog(null);
    });
  }
  return (
    <div className="week-workspace">
      <section className="card private-section week-overview">
        <div className="section-head">
          <div>
            <span className="eyebrow">TU CALENDARIO</span>
            <h2>Tu semana</h2>
          </div>
          <button
            className="primary-button"
            disabled={disabled}
            onClick={() => onSession({ date: start, type: 'swim' })}
          >
            <Plus size={18} /> Añadir actividad
          </button>
        </div>
        <div className="week-navigation">
          <button
            className="icon-button"
            aria-label="Semana anterior"
            disabled={disabled}
            onClick={() => chooseWeek(shiftDate(start, -7))}
          >
            <ChevronLeft />
          </button>
          <label className="week-picker">
            Semana del
            <input
              type="date"
              value={start}
              disabled={disabled}
              onChange={(e) => e.target.value && chooseWeek(e.target.value)}
            />
          </label>
          <button
            className="icon-button"
            aria-label="Semana siguiente"
            disabled={disabled}
            onClick={() => chooseWeek(shiftDate(start, 7))}
          >
            <ChevronRight />
          </button>
          <button className="text-button" disabled={disabled} onClick={() => chooseWeek(today())}>
            Ir a hoy
          </button>
        </div>
        <p className="week-period">
          {formatDate(start)} — {formatDate(end)}
        </p>
        {program && (
          <p className="context-note">
            Primera semana de tu programación: <strong>{formatDate(program.startWeek)}</strong>
            {start < program.startWeek ? ' · Estás consultando una semana anterior al inicio.' : ''}
          </p>
        )}
        <div className="week-progress">
          <span>
            <strong>
              {completed} / {rows.length}
            </strong>{' '}
            actividades completadas
          </span>
          <progress
            value={completed}
            max={Math.max(rows.length, 1)}
            aria-label="Actividades completadas esta semana"
          />
        </div>
        <div className="activity-legend">
          {Object.entries(ACTIVITY_LABELS).map(([type, label]) => {
            const Icon = activityIcons[type],
              count = rows.filter((row) => row.type === type).length,
              done = rows.filter((row) => row.type === type && row.completed).length,
              goal =
                type === 'swim' && profile.weeklyGoals.swimMax !== profile.weeklyGoals.swim
                  ? `${profile.weeklyGoals.swim}–${profile.weeklyGoals.swimMax}`
                  : profile.weeklyGoals[type];
            return (
              <span className={`activity-tag activity-${type}`} key={type}>
                <Icon size={17} aria-hidden="true" />
                {label} · {done}/{count}
                <small>Objetivo: {goal}</small>
              </span>
            );
          })}
        </div>
      </section>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && !dialog && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="calendar-help">
        Toca una actividad para añadirla a ese día. Puedes combinar las tres. Marca lo que hayas
        realizado y abre los detalles para hacer cambios.
      </p>
      <nav className="week-day-strip" aria-label="Elegir día de la semana">
        {dates.map((day, index) => {
          const count = rows.filter((row) => row.date === day).length;
          const active = (selectedDay?.week === start ? selectedDay.index : 0) === index;
          return (
            <button
              key={day}
              type="button"
              aria-label={`Ver ${weekdays[index]} ${formatDate(day)}, ${count} actividades`}
              aria-pressed={active}
              onClick={() => setSelectedDay({ week: start, index })}
            >
              <span>{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'][index]}</span>
              <strong>{day.slice(8)}</strong>
              <small>{count ? `${count} act.` : 'Libre'}</small>
            </button>
          );
        })}
      </nav>
      <section className="week-board" aria-label="Calendario de actividades de la semana">
        {dates.map((day, index) => {
          const activities = rows.filter((row) => row.date === day);
          return (
            <article
              className={`calendar-day ${day === today() ? 'is-today' : ''} ${(selectedDay?.week === start ? selectedDay.index : 0) === index ? 'is-selected' : ''}`}
              key={day}
              aria-label={`${weekdays[index]} ${formatDate(day)}`}
            >
              <header className="calendar-day-head">
                <div>
                  <h3>{weekdays[index]}</h3>
                  <time dateTime={day}>{formatDate(day).slice(0, 5)}</time>
                </div>
                {day === today() && <span className="today-label">Hoy</span>}
              </header>
              <div className="day-activities">
                {activities.map((row) => {
                  const Icon = activityIcons[row.type];
                  return (
                    <div
                      className={`calendar-activity activity-${row.type} ${row.completed ? 'is-complete' : ''}`}
                      key={row.id}
                    >
                      <div className="calendar-activity-head">
                        <Icon size={19} aria-hidden="true" />
                        <strong>{ACTIVITY_LABELS[row.type]}</strong>
                        <span className="activity-state">
                          {row.completed ? 'Hecha' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="activity-dose">
                        {row.distance != null
                          ? `${row.distance} m`
                          : row.minutes != null
                            ? `${row.minutes} min`
                            : row.exercises.length
                              ? `${row.exercises.length} ejercicios`
                              : 'Por concretar'}
                        {row.distance != null && row.minutes != null ? ` · ${row.minutes} min` : ''}
                      </p>
                      {row.discomfort === 'present' && (
                        <p className="activity-discomfort">Molestias registradas</p>
                      )}
                      <div className="calendar-activity-actions">
                        <label className="complete-activity">
                          <input
                            type="checkbox"
                            checked={row.completed}
                            disabled={disabled}
                            aria-label={`Sesión completada de ${ACTIVITY_LABELS[row.type]} del ${formatDate(day)}`}
                            onChange={() => onToggle(row)}
                          />
                          <span>{row.completed ? 'Completada' : 'Completar'}</span>
                        </label>
                        <button
                          className="icon-button"
                          aria-label={`Editar sesión de ${ACTIVITY_LABELS[row.type]} del ${formatDate(day)}`}
                          disabled={disabled}
                          onClick={() => onEdit(row)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Eliminar actividad de ${ACTIVITY_LABELS[row.type]} del ${formatDate(day)}`}
                          disabled={disabled}
                          onClick={() => {
                            setError('');
                            setConfirmed(false);
                            setDialog({ kind: 'session', row });
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      {(row.exercises.length > 0 || row.notes || row.origin?.edited) && (
                        <details className="activity-details">
                          <summary>Ver detalles</summary>
                          {row.exercises.map((exercise, i) => (
                            <p key={i}>
                              {exercise.name} · {exercise.sets} series · {exercise.repetitions}
                            </p>
                          ))}
                          {row.notes && <p>{row.notes}</p>}
                          {row.origin?.edited && <p>Detalles ajustados manualmente.</p>}
                        </details>
                      )}
                    </div>
                  );
                })}
                {!activities.length && <p className="day-empty">Sin actividades</p>}
              </div>
              <div className="day-additions" aria-label={`Añadir el ${formatDate(day)}`}>
                {Object.entries(ACTIVITY_LABELS).map(([type, label]) => {
                  const Icon = activityIcons[type];
                  return (
                    <button
                      key={type}
                      className={`day-add activity-${type}`}
                      disabled={disabled}
                      aria-label={`Añadir ${label} el ${formatDate(day)}`}
                      onClick={() => onSession({ date: day, type })}
                    >
                      <Plus size={13} aria-hidden="true" />
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
      <section className="card private-section week-tools">
        <h2>Organiza tus próximas semanas</h2>
        <p className="context-note">
          Usa el calendario para el día a día. Aquí puedes repetir una semana tipo o distribuir
          varias actividades de una vez.
        </p>
        <div className="form-actions">
          <button
            className="outline-button"
            aria-expanded={panel === 'program'}
            disabled={disabled}
            onClick={() => setPanel(panel === 'program' ? null : 'program')}
          >
            <CalendarDays size={18} />
            Semana tipo y revisión
          </button>
          <button
            className="outline-button"
            aria-expanded={panel === 'planner'}
            disabled={disabled}
            onClick={() => setPanel(panel === 'planner' ? null : 'planner')}
          >
            Distribuir esta semana
          </button>
        </div>
        <details className="week-maintenance">
          <summary>Corregir una semana de prueba</summary>
          <p>
            Vacía las actividades de la semana visible. Si es la primera de tu programación, puedes
            trasladar el inicio a la siguiente.
          </p>
          <button className="outline-button danger-action" disabled={disabled} onClick={openReset}>
            <Trash2 size={17} />
            Eliminar esta semana
          </button>
        </details>
      </section>
      {panel === 'planner' && (
        <WeeklyPlanner
          key={start}
          profile={profile}
          sessions={sessions}
          date={start}
          cloud={cloud}
          uid={uid}
          disabled={disabled}
          initiallyOpen
        />
      )}
      {panel === 'program' && (
        <TrainingAutomation
          key={`training-${start}`}
          profile={profile}
          sessions={sessions}
          date={start}
          cloud={cloud}
          uid={uid}
          initiallyOpen
          onSaved={(week, message) => {
            setDate(week);
            setNotice(message);
          }}
        />
      )}
      <p className="care-note">
        <ShieldCheck size={16} /> Si hay molestias, registra cómo te encuentras. No se aumentan
        automáticamente las cargas.
      </p>
      {dialog && (
        <Dialog
          title={dialog.kind === 'week' ? 'Eliminar semana de prueba' : 'Eliminar actividad'}
          onClose={() => {
            if (!working) setDialog(null);
          }}
        >
          <form className="private-form" onSubmit={remove}>
            {dialog.kind === 'week' ? (
              <>
                <p>
                  Del <strong>{formatDate(dialog.snapshot.weekStart)}</strong> al{' '}
                  <strong>{formatDate(dialog.snapshot.weekEnd)}</strong>.
                </p>
                <p>
                  Se eliminarán <strong>{dialog.snapshot.count} actividades</strong>, de las que{' '}
                  {dialog.snapshot.completed} están completadas, junto con el plan y la revisión de
                  esa semana. El borrado no se puede deshacer.
                </p>
                {dialog.snapshot.canRestart && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={restart}
                      disabled={working}
                      onChange={(e) => setRestart(e.target.checked)}
                    />
                    Empezar la programación el {formatDate(dialog.snapshot.nextWeek)}, conservando
                    su duración y semana tipo.
                  </label>
                )}
                <p className="context-note">
                  Se conservan tus pesajes, contexto, plantillas y las actividades de otras semanas.
                </p>
              </>
            ) : (
              <p>
                Se eliminará {ACTIVITY_LABELS[dialog.row.type]} del {formatDate(dialog.row.date)}
                {dialog.row.completed ? ', que figura como completada' : ''}. El borrado no se puede
                deshacer.
              </p>
            )}
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={working}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              He revisado los datos y quiero eliminarlos.
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button className="primary-button danger-action" disabled={!confirmed || working}>
                {working ? 'Eliminando…' : 'Confirmar eliminación'}
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={working}
                onClick={() => setDialog(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
