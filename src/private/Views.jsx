import { useState } from 'react';
import { Download, EyeOff, Plus, ShieldCheck, Copy } from 'lucide-react';
import {
  calculateProgress,
  formatDate,
  formatNumber,
  formatWeight,
  today,
  weeklySummary,
  summaryText,
} from '../domain/transformation.js';
import { exercises } from '../demo.js';
const labels = { swim: 'Natación', strength: 'Fuerza', core: 'Core' };
const stateLabels = {
  confirmed: 'Confirmado',
  reference: 'Referencia consolidada',
  spot: 'Lectura puntual',
};
export function PrivacyGate({ onReveal, children }) {
  return (
    <section className="card privacy-page">
      <EyeOff size={34} />
      <h2>Modo incógnito activado</h2>
      <p>{children || 'Las cifras, las notas y los detalles privados están ocultos.'}</p>
      <button className="primary-button" onClick={onReveal}>
        Mostrar información privada
      </button>
    </section>
  );
}
export function WeightHistory({ profile, weights, incognito, onWeight }) {
  return (
    <section className="card private-section">
      <div className="section-head">
        <h2>Historial de pesajes</h2>
        <button className="primary-button" onClick={onWeight}>
          <Plus size={17} />
          Pesaje
        </button>
      </div>
      <p className="context-note">
        Inicio del historial: {incognito ? 'privado' : formatDate(profile.startDate)}. Inicio de
        dieta:{' '}
        {incognito
          ? 'privado'
          : profile.dietStartDate
            ? formatDate(profile.dietStartDate)
            : 'No indicado'}
        .
      </p>
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabla del historial de pesajes"
      >
        <table className="weight-table">
          <caption className="sr-only">Pesajes con su fecha y estado de confirmación</caption>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Peso</th>
              <th>Estado</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {[...weights].reverse().map((row) => (
              <tr key={row.id}>
                <td>{incognito ? 'Privada' : formatDate(row.date)}</td>
                <td>{incognito ? '•••' : formatWeight(row.kg)}</td>
                <td>
                  <span className={`record-state ${row.status}`}>{stateLabels[row.status]}</span>
                </td>
                <td>{incognito ? 'Privada' : row.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!weights.length && <p className="context-note">Todavía no hay pesajes registrados.</p>}
      <p className="context-note">
        Una lectura puntual se conserva en el historial, pero no sustituye una referencia
        consolidada ni determina los hitos.
      </p>
    </section>
  );
}
export function WeeklyPlan({ profile, sessions, incognito, onReveal, onSession, onToggle, busy }) {
  const [date, setDate] = useState(today());
  if (incognito) return <PrivacyGate onReveal={onReveal} />;
  const summary = weeklySummary(profile, [], sessions, date);
  const rows = sessions.filter((row) => row.date >= summary.start && row.date <= summary.end);
  return (
    <div>
      <section className="card private-section">
        <div className="section-head">
          <h2>Tu semana, en movimiento</h2>
          <button className="primary-button" onClick={onSession}>
            <Plus size={17} />
            Sesión
          </button>
        </div>
        <label className="week-picker">
          Semana del
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </label>
        <div className="weekly-goals">
          {Object.entries(labels).map(([type, label]) => (
            <div key={type}>
              <strong>{label}</strong>
              <span>{summary.completed[type]} completadas</span>
              <small>
                Objetivo:{' '}
                {type === 'swim' && profile.weeklyGoals.swimMax !== profile.weeklyGoals.swim
                  ? `${profile.weeklyGoals.swim}–${profile.weeklyGoals.swimMax}`
                  : profile.weeklyGoals[type]}{' '}
                sesiones
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="session-list" aria-label="Sesiones de la semana">
        {rows.map((row) => (
          <article className="card personal-session" key={row.id}>
            <div>
              <span className="eyebrow">
                {labels[row.type]} · {formatDate(row.date)}
              </span>
              <h2>{row.completed ? 'Sesión completada' : 'Sesión planificada'}</h2>
              <p>
                {row.minutes !== null ? `${row.minutes} min` : 'Duración no indicada'}
                {row.distance !== null ? ` · ${row.distance} m` : ''}
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
              <p>
                Molestias:{' '}
                {row.discomfort === 'present'
                  ? 'comunicadas'
                  : row.discomfort === 'none'
                    ? 'ninguna comunicada'
                    : 'sin valorar'}
                .
              </p>
              {row.notes && <p>{row.notes}</p>}
            </div>
            <label className={`check-label ${row.completed ? 'done-button' : 'outline-button'}`}>
              <input
                type="checkbox"
                checked={row.completed}
                disabled={busy}
                aria-label={`Sesión completada de ${labels[row.type]} del ${formatDate(row.date)}`}
                onChange={() => onToggle(row)}
              />
              {row.completed ? 'Completada' : 'Marcar completada'}
            </label>
          </article>
        ))}
      </section>
      {!rows.length && (
        <div className="empty-state">
          <h2>Una semana por registrar</h2>
          <p>
            No hay sesiones guardadas en esta semana. No se ha supuesto ninguna actividad realizada.
          </p>
          <button className="outline-button" onClick={onSession}>
            Añadir sesión
          </button>
        </div>
      )}
      <p className="care-note">
        Los objetivos no generan entrenamientos automáticamente. Si hay molestias lumbares, no se
        prescribe ni se aumenta la carga desde la aplicación.
      </p>
    </div>
  );
}
export function ReliableLibrary() {
  const [filter, setFilter] = useState('Todos');
  return (
    <div>
      <div className="filters" role="group" aria-label="Filtrar ejercicios">
        {['Todos', 'Natación', 'Fuerza', 'Core'].map((value) => (
          <button
            key={value}
            className={filter === value ? 'selected' : ''}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="context-note">
        Referencias para consultar técnica en canales institucionales. No constituyen una pauta de
        ejercicios para tu situación clínica.
      </p>
      <section className="exercise-grid">
        {exercises
          .filter((row) => filter === 'Todos' || filter === row.type)
          .map((row) => {
            const swim = row.type === 'Natación';
            const channel = swim ? 'SwimEngland' : 'MayoClinic';
            const source = swim ? 'Swim England' : 'Mayo Clinic';
            const term = swim
              ? row.name.includes('respiración')
                ? 'front crawl breathing'
                : 'front crawl kick'
              : row.name.includes('Plancha')
                ? 'plank'
                : row.name.includes('Remo')
                  ? 'dumbbell row'
                  : row.name.includes('Dead')
                    ? 'core exercises'
                    : 'squat';
            return (
              <article className="card exercise" key={row.name}>
                {row.image && (
                  <div className="exercise-art has-image">
                    <img
                      src={`${import.meta.env.BASE_URL}images/exercises/${row.image}`}
                      alt={`Ilustración de ${row.name.toLowerCase()}`}
                      width="1536"
                      height="1024"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="exercise-copy">
                  <span className="eyebrow">{row.type}</span>
                  <h2>{row.name}</h2>
                  <p>Fuente: {source} · Canal institucional</p>
                  <a
                    href={`https://www.youtube.com/@${channel}/search?query=${encodeURIComponent(term)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buscar vídeos de técnica
                    <span className="sr-only"> en {source}, nueva pestaña</span>
                  </a>
                </div>
              </article>
            );
          })}
      </section>
    </div>
  );
}
export function HealthContext({ context, incognito, onReveal, onSave, busy, error }) {
  if (incognito)
    return (
      <PrivacyGate onReveal={onReveal}>
        El contexto de salud y las observaciones se muestran solo al desactivar este modo.
      </PrivacyGate>
    );
  const fields = {
    activityNotes: 'Actividad y antecedentes deportivos comunicados',
    treatmentNotes: 'Tratamiento comunicado',
    lumbarNotes: 'Antecedentes lumbares comunicados',
    medicalNotes: 'Indicaciones profesionales comunicadas',
    sourceNotes: 'Notas sobre la procedencia de los datos',
  };
  return (
    <section className="card form-page">
      <span className="eyebrow">CONTEXTO PRIVADO</span>
      <h2>Salud y actividad</h2>
      <p>
        Se almacena separado de los pesajes. Es contexto de seguimiento, no una prescripción
        automática.
      </p>
      <form
        className="private-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onSave(Object.fromEntries(Object.keys(fields).map((key) => [key, data.get(key)])));
        }}
      >
        {Object.entries(fields).map(([key, label]) => (
          <label key={key}>
            {label}
            <textarea name={key} maxLength={5000} rows={4} defaultValue={context?.[key] ?? ''} />
          </label>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contexto privado'}
        </button>
      </form>
    </section>
  );
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WeeklyExport({ profile, weights, sessions, context, incognito, onReveal }) {
  const [date, setDate] = useState(today());
  const [includeContext, setIncludeContext] = useState(false);
  const [message, setMessage] = useState('');
  if (incognito)
    return (
      <PrivacyGate onReveal={onReveal}>
        Desactiva el modo incógnito para revisar y exportar tus cifras.
      </PrivacyGate>
    );
  const summary = weeklySummary(profile, weights, sessions, date);
  const selectedContext = includeContext
    ? Object.fromEntries(Object.entries(context || {}).filter(([key]) => key !== 'updatedAt'))
    : null;
  const text = summaryText(profile, summary, selectedContext);
  const json = JSON.stringify(
    {
      schemaVersion: 1,
      kind: 'forja-weekly-summary',
      profile: {
        title: profile.title,
        initialWeight: profile.initialWeight,
        targetWeight: profile.targetWeight,
        startDate: profile.startDate,
        dietStartDate: profile.dietStartDate,
      },
      summary,
      ...(selectedContext ? { healthContext: selectedContext } : {}),
    },
    null,
    2,
  );
  return (
    <section className="card private-section">
      <div className="section-head">
        <h2>Resumen semanal</h2>
        <ShieldCheck size={22} />
      </div>
      <label className="week-picker">
        Selecciona una semana
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
        />
      </label>
      <p className="care-note">
        El archivo contiene datos personales de seguimiento. Revísalo antes de compartirlo. No se
        envía nada a ChatGPT automáticamente.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={includeContext}
          onChange={(e) => setIncludeContext(e.target.checked)}
        />
        Incluir también el contexto de salud privado
      </label>
      <div className="export-actions">
        <button
          className="primary-button"
          onClick={() =>
            download(text, `forja-resumen-${summary.start}.txt`, 'text/plain;charset=utf-8')
          }
        >
          <Download size={16} />
          Descargar texto
        </button>
        <button
          className="outline-button"
          onClick={() => download(json, `forja-resumen-${summary.start}.json`, 'application/json')}
        >
          <Download size={16} />
          Descargar JSON
        </button>
        <button
          className="outline-button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setMessage('Resumen copiado.');
            } catch {
              setMessage('No se pudo copiar. Puedes descargarlo como texto.');
            }
          }}
        >
          <Copy size={16} />
          Copiar
        </button>
      </div>
      {message && (
        <p role="status" className="context-note">
          {message}
        </p>
      )}
      <pre
        className="summary-preview"
        tabIndex={0}
        role="region"
        aria-label="Vista previa del resumen"
      >
        {text}
      </pre>
      <h3>Hitos registrados</h3>
      <ul className="summary-milestones">
        {calculateProgress(profile, weights)
          .milestones.filter((item) => item.reached)
          .map((item) => (
            <li key={item.id}>
              {item.label} · {formatDate(item.date)}
            </li>
          ))}
      </ul>
    </section>
  );
}
