import { useEffect, useState } from 'react';
import { Dialog, SessionForm } from './Forms.jsx';
import { ProgramForm, ReviewForm } from './TrainingForms.jsx';
import { ACTIVITY_LABELS, shiftDate } from '../domain/planning.js';
import { fingerprintSessions, validateTemplate } from '../domain/training.js';
import { formatDate, today, weekBounds } from '../domain/transformation.js';

export function TrainingAutomation({
  profile,
  sessions,
  date,
  cloud,
  uid,
  onSaved,
  initiallyOpen = false,
}) {
  const [open, setOpen] = useState(initiallyOpen),
    [data, setData] = useState({ program: undefined, templates: null, reviews: {} });
  const [dialog, setDialog] = useState(null),
    [selected, setSelected] = useState(null),
    [reviewSnapshot, setReviewSnapshot] = useState(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const [proposal, setProposal] = useState(null),
    [confirmed, setConfirmed] = useState(false);
  const start = weekBounds(date).start,
    previous = shiftDate(start, -7);
  useEffect(
    () =>
      cloud.watchTrainingProgram(
        uid,
        profile.id,
        (program) => {
          setData((old) => ({ ...old, program }));
        },
        () => setError('La programación está pendiente de habilitar. Revisa las reglas de acceso.'),
      ),
    [cloud, uid, profile.id],
  );
  useEffect(() => {
    if (!open) return;
    const fail = (err) =>
      setError(
        err.code === 'permission-denied'
          ? 'La programación está pendiente de habilitar. El administrador debe actualizar las reglas de acceso.'
          : 'No se pudo cargar la programación. Cierra este panel y vuelve a abrirlo.',
      );
    const stops = [
      cloud.watchTrainingTemplates(
        uid,
        profile.id,
        (templates) => setData((old) => ({ ...old, templates })),
        fail,
      ),
      ...[start, previous].map((week) =>
        cloud.watchTrainingReview(
          uid,
          profile.id,
          week,
          (review) => setData((old) => ({ ...old, reviews: { ...old.reviews, [week]: review } })),
          fail,
        ),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [open, cloud, uid, profile.id, start, previous]);
  async function perform(operation) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      return true;
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'No se pudo guardar: revisa el acceso y las reglas de Firebase.'
          : err.message || 'No se pudo completar la operación.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function prepare(week) {
    const value = await cloud.prepareTrainingProposal(uid, profile.id, week);
    setProposal(value);
    setConfirmed(false);
  }
  async function openReview(week) {
    await perform(async () => {
      if (week > today()) throw new Error('La semana todavía no ha comenzado.');
      const rows = sessions.filter((row) => row.date >= week && row.date <= shiftDate(week, 6));
      if (!rows.length)
        throw new Error('No hay actividades registradas para revisar en esa semana.');
      setReviewSnapshot({
        start: week,
        rows,
        fingerprint: await fingerprintSessions(rows),
        initial: data.reviews[week] ?? null,
      });
      setDialog('review');
    });
  }
  const ready =
    data.program !== undefined &&
    data.templates !== null &&
    data.reviews[start] !== undefined &&
    data.reviews[previous] !== undefined;
  return (
    <section className="card private-section training-automation">
      <div className="section-head">
        <h2>Mi programación y revisión semanal</h2>
        <button
          className="outline-button"
          disabled={busy || data.program === undefined}
          aria-expanded={open}
          onClick={() => {
            setOpen((value) => !value);
            setError('');
          }}
        >
          {' '}
          {open ? 'Cerrar programación' : 'Abrir programación'}
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {open &&
        (!ready ? (
          !error && <p role="status">Cargando programación…</p>
        ) : (
          <>
            <p className="context-note">
              Configura una distribución de 1 a 12 semanas y tus variantes de ejercicios una vez. Al
              cerrar cada semana se revisan cumplimiento, sensaciones y molestias antes de proponer
              la siguiente.
            </p>
            {data.program && (
              <p className="program-period">
                Vigente del {formatDate(data.program.startWeek)} al{' '}
                {formatDate(shiftDate(data.program.startWeek, data.program.weeks * 7 - 1))} ·{' '}
                {data.program.weeks} semanas.
              </p>
            )}
            {data.program &&
              previous >= data.program.startWeek &&
              !data.reviews[previous] &&
              sessions.some((row) => row.date >= previous && row.date < start) && (
                <p className="care-note" role="status">
                  Tienes pendiente la revisión de la semana del {formatDate(previous)} antes de
                  preparar la siguiente.{' '}
                  <button
                    className="text-button"
                    onClick={() => openReview(previous)}
                    disabled={busy}
                  >
                    Revisar ahora
                  </button>
                </p>
              )}
            <div className="form-actions">
              <button
                className="primary-button"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setDialog('program');
                }}
              >
                {data.program ? 'Editar programación' : 'Crear programación'}
              </button>
              <button
                className="outline-button"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  setError('');
                  setDialog('template');
                }}
              >
                Nueva plantilla
              </button>
              {data.program && (
                <button
                  className="outline-button"
                  disabled={busy}
                  onClick={() => perform(() => prepare(start))}
                >
                  Preparar propuesta de esta semana
                </button>
              )}
            </div>
            <div className="template-list">
              {data.templates.map((row) => (
                <article className="template-card" key={row.id}>
                  <strong>{row.title}</strong>
                  <span>
                    {ACTIVITY_LABELS[row.type]} · {row.focus} · Nivel {row.level}
                  </span>
                  <button
                    className="text-button"
                    disabled={busy}
                    aria-label={`Editar plantilla ${row.title}`}
                    onClick={() => {
                      setSelected(row);
                      setError('');
                      setDialog('template');
                    }}
                  >
                    Editar plantilla
                  </button>
                </article>
              ))}
            </div>
            <div className="form-actions review-actions">
              <button
                className="outline-button"
                disabled={busy || start > today()}
                onClick={() => openReview(start)}
              >
                Cerrar y revisar esta semana
              </button>
              <button
                className="outline-button"
                disabled={busy}
                onClick={() => openReview(previous)}
              >
                Revisar semana anterior
              </button>
            </div>
            {data.reviews[start] && (
              <p className="context-note">
                Hay una revisión guardada para esta semana. Si cambian los registros, será necesario
                revisarla de nuevo.
              </p>
            )}
            {proposal && (
              <div className="training-proposal">
                <h3>
                  Propuesta · Semana {proposal.cycleWeek} de {proposal.totalWeeks}
                </h3>
                <p>
                  Del {formatDate(proposal.draft.weekStart)} al {formatDate(proposal.draft.weekEnd)}
                  . Se alternan los enfoques disponibles en tus plantillas, con las dosis que hayas
                  definido.
                </p>
                {proposal.warnings.map((warning) => (
                  <p className="care-note" key={warning}>
                    {warning}
                  </p>
                ))}
                <div className="proposal-list">
                  {proposal.draft.sessions.map((row) => (
                    <article className="proposal-session" key={`${row.date}-${row.type}`}>
                      <strong>
                        {formatDate(row.date)} · {ACTIVITY_LABELS[row.type]}
                      </strong>
                      <p>
                        {row.origin?.title || 'Pauta pendiente de concretar'}
                        {row.origin?.focus
                          ? ` · ${row.origin.focus} · Nivel ${row.origin.level}`
                          : ''}
                      </p>
                      <p>
                        {row.minutes === null ? 'Duración pendiente' : `${row.minutes} min`}
                        {row.distance === null ? '' : ` · ${row.distance} m`}
                      </p>
                      {row.exercises.length > 0 && (
                        <ul>
                          {row.exercises.map((exercise, index) => (
                            <li key={index}>
                              {exercise.name} · {exercise.sets} series · {exercise.repetitions}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  He revisado las variantes y las cargas propuestas. Las actividades ya guardadas se
                  conservarán.
                </label>
                <button
                  className="primary-button"
                  disabled={busy || !confirmed}
                  onClick={() =>
                    perform(async () => {
                      const result = await cloud.acceptTrainingProposal(
                        uid,
                        profile.id,
                        proposal.draft.weekStart,
                        proposal.token,
                      );
                      setProposal(null);
                      onSaved(
                        proposal.draft.weekStart,
                        `${result.created} actividades nuevas guardadas; ${result.preserved} existentes conservadas.`,
                      );
                    })
                  }
                >
                  Aceptar propuesta semanal
                </button>
              </div>
            )}
          </>
        ))}
      {dialog && (
        <Dialog
          title={
            dialog === 'program'
              ? 'Configurar programación'
              : dialog === 'template'
                ? 'Configurar plantilla'
                : 'Revisión de la semana'
          }
          onClose={() => {
            if (!busy) {
              setDialog(null);
              setError('');
            }
          }}
        >
          {dialog === 'program' ? (
            <ProgramForm
              initial={data.program}
              templates={data.templates}
              date={date}
              busy={busy}
              error={error}
              onSave={(value) =>
                perform(async () => {
                  await cloud.saveTrainingProgram(uid, profile.id, value);
                  setDialog(null);
                  setProposal(null);
                  setNotice('Programación guardada. Ya puedes preparar la propuesta.');
                  if (
                    date < value.startWeek ||
                    date > shiftDate(value.startWeek, value.weeks * 7 - 1)
                  )
                    onSaved(value.startWeek, 'Programación guardada. Estás en su primera semana.');
                })
              }
            />
          ) : dialog === 'template' ? (
            <SessionForm
              templateMode
              initial={selected}
              busy={busy}
              error={error}
              onSave={(value) =>
                perform(async () => {
                  await cloud.saveTrainingTemplate(
                    uid,
                    profile.id,
                    validateTemplate(value),
                    selected,
                  );
                  setDialog(null);
                  setProposal(null);
                  setNotice('Plantilla guardada. Selecciónala en tu programación para utilizarla.');
                })
              }
            />
          ) : (
            <ReviewForm
              snapshot={reviewSnapshot}
              busy={busy}
              error={error}
              onSave={(value) =>
                perform(async () => {
                  await cloud.saveTrainingReview(uid, profile.id, reviewSnapshot.start, value);
                  setDialog(null);
                  setNotice('Revisión guardada.');
                  try {
                    await prepare(shiftDate(reviewSnapshot.start, 7));
                  } catch (err) {
                    setError(`La revisión se ha guardado. ${err.message}`);
                  }
                })
              }
            />
          )}
        </Dialog>
      )}
    </section>
  );
}
