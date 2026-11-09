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
import { CatalogLibrary } from './CatalogLibrary.jsx';
import { WeekBoard } from './WeekBoard.jsx';
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
export function WeeklyPlan({
  profile,
  sessions,
  incognito,
  onReveal,
  onSession,
  onCatalog,
  onToggle,
  onEdit,
  cloud,
  uid,
  busy,
}) {
  if (incognito) return <PrivacyGate onReveal={onReveal} />;
  return (
    <WeekBoard
      profile={profile}
      sessions={sessions}
      onSession={onSession}
      onCatalog={onCatalog}
      onToggle={onToggle}
      onEdit={onEdit}
      cloud={cloud}
      uid={uid}
      busy={busy}
    />
  );
}

export function ReliableLibrary({ onPlan, canPlan }) {
  return <CatalogLibrary onPlan={onPlan} canPlan={canPlan} />;
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
