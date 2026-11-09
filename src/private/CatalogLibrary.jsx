import { useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Search } from 'lucide-react';
import {
  catalog,
  catalogSessionDraft,
  filterCatalogExercises,
  findCatalogExercise,
} from '../domain/catalog.js';
import './catalog.css';
const sourceUrl = (file, release = catalog.source.commit) =>
  `https://github.com/diglo-vnavarro/FORJA/blob/${release}/${file}`;
const terms = (rows) =>
  [...new Map(rows.map((row) => [row.id, row])).values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'es'),
  );
function Items({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <section className="catalog-text-section">
      <h3>{title}</h3>
      <ul>
        {rows.map((text, index) => (
          <li key={index}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
function SourceLink({ file, release }) {
  return (
    <a href={sourceUrl(file, release)} target="_blank" rel="noopener noreferrer">
      Consultar fuente FORJA<span className="sr-only">, nueva pestaña</span>
    </a>
  );
}
export function CatalogReferenceDetails({ reference }) {
  return (
    <div className="catalog-reference">
      <p>
        <strong>
          {reference.sessionId} · {reference.title}
        </strong>
      </p>
      <p>
        Referencia de contexto juvenil. La pauta de la fuente requiere adaptación individual según
        tu situación.
      </p>
      <details>
        <summary>Contexto de la fuente</summary>
        <p className="catalog-preserve-lines">{reference.context}</p>
      </details>
      {reference.tasks.map((task) => (
        <section className="catalog-reference-task" key={task.key}>
          <h4>
            {task.exerciseId} · {task.name}
          </h4>
          <p>
            <strong>Pauta contextual de la fuente:</strong> {task.prescription}
          </p>
        </section>
      ))}
      <details>
        <summary>Técnica, adaptaciones y criterios de parada de la fuente</summary>
        <p className="catalog-preserve-lines">{reference.guidance}</p>
      </details>
      <SourceLink release={reference.release} file={reference.sourcePath} />
    </div>
  );
}
export function SessionDetails({ session }) {
  return (
    <div className="catalog-session-details">
      <span className="eyebrow">{session.identity.id} · Contexto juvenil</span>
      <h2>{session.identity.name}</h2>
      <p>{session.purpose}</p>
      <Items title="Contexto previsto" rows={session.context.profile} />
      <Items title="Recursos" rows={session.context.resources} />
      <Items title="Comprobación inicial" rows={session.readinessChecks} />
      {session.blocks.map((block) => (
        <section className="catalog-session-block" key={block.id}>
          <h3>{block.name}</h3>
          <p>{block.purpose}</p>
          {block.tasks.map((task, index) => (
            <article className="catalog-reference-task" key={`${block.id}-${index}`}>
              <h4>
                {task.exerciseId} · {findCatalogExercise(task.exerciseId).identity.displayName}
              </h4>
              <p>
                <strong>Pauta contextual:</strong> {task.prescription}
              </p>
              <p>Calidad: {task.quality}</p>
              <Items title="Parada o modificación" rows={task.stopCriteria} />
            </article>
          ))}
        </section>
      ))}
      <Items title="Qué registrar después" rows={session.recordAfter} />
      <p className="care-note">
        {session.usageNote ||
          'Revisa el contexto, los requisitos y la tolerancia antes de utilizar esta referencia.'}
      </p>
      <SourceLink file={session.traceability.sourcePath} />
    </div>
  );
}
function SessionCards({ onSelect }) {
  return (
    <div className="catalog-session-grid">
      {catalog.sessions.map((session) => (
        <article className="card catalog-session-card" key={session.identity.id}>
          <span className="eyebrow">{session.identity.id} · Contexto juvenil</span>
          <h3>{session.identity.name}</h3>
          <p>{session.purpose}</p>
          <p>
            {session.blocks.length} bloques ·{' '}
            {session.blocks.reduce((n, block) => n + block.tasks.length, 0)} ejercicios
          </p>
          <button className="outline-button" onClick={() => onSelect(session.identity.id)}>
            Ver {session.identity.id}
          </button>
        </article>
      ))}
    </div>
  );
}
export function CatalogLibrary({ onPlan, canPlan = true }) {
  const [view, setView] = useState('exercises'),
    [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(''),
    [equipment, setEquipment] = useState(''),
    [pattern, setPattern] = useState('');
  const rows = filterCatalogExercises({ query, equipment, pattern });
  const exercise = selected?.startsWith('EX-') ? findCatalogExercise(selected) : null;
  const session = selected?.startsWith('SES-')
    ? catalog.sessions.find((row) => row.identity.id === selected)
    : null;
  const equipmentTerms = terms(catalog.exercises.flatMap((row) => row.context.equipment));
  const patternTerms = terms(catalog.exercises.map((row) => row.classification.movementPattern));
  return (
    <section className="forja-catalog" aria-label="Biblioteca FORJA">
      <header className="catalog-heading">
        <span className="eyebrow">CONOCIMIENTO PARA ENTRENAR</span>
        <h1>Biblioteca FORJA</h1>
        <p>Ejercicios, técnica y sesiones con su contexto y criterios de aplicación.</p>
      </header>
      {selected ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            <ArrowLeft size={17} />
            Volver al catálogo
          </button>
          {exercise && (
            <article className="card catalog-detail">
              <img
                src={`${import.meta.env.BASE_URL}${exercise.media.image}`}
                alt={exercise.media.alt || exercise.identity.displayName}
                width="768"
                height="512"
              />
              <span className="eyebrow">
                {exercise.identity.id} · {exercise.classification.movementPattern.label}
              </span>
              <h2>{exercise.identity.displayName}</h2>
              <p>{exercise.identity.description}</p>
              <p>
                <strong>Objetivo:</strong> {exercise.identity.objective}
              </p>
              <p>
                <strong>Material:</strong>{' '}
                {exercise.context.equipment.map((row) => row.label).join(', ')}
              </p>
              <Items title="Requisitos" rows={exercise.context.requirements} />
              <Items title="Preparación" rows={exercise.coaching.setup} />
              <Items title="Ejecución" rows={exercise.coaching.execution} />
              <Items title="Consignas" rows={exercise.coaching.cues} />
              <Items title="Qué observar" rows={exercise.coaching.competencyIndicators} />
              <Items title="Errores relevantes" rows={exercise.coaching.commonErrors} />
              <Items title="Parada o modificación" rows={exercise.safety.stopCriteria} />
              <Items
                title="Ejemplo contextual de pauta"
                rows={exercise.prescription.contextualExample}
              />
              <Items
                title="Regresiones"
                rows={exercise.relations.regressions.map(
                  (row) => row.label + (row.description ? `: ${row.description}` : ''),
                )}
              />
              <Items
                title="Progresiones"
                rows={exercise.relations.progressions.map(
                  (row) => row.label + (row.description ? `: ${row.description}` : ''),
                )}
              />
              <SourceLink file={exercise.traceability.sources[0]} />
            </article>
          )}
          {session && (
            <article className="card catalog-detail">
              <SessionDetails session={session} />
              {onPlan && (
                <>
                  <p className="context-note">
                    Se añadirá como referencia pendiente de adaptar a tu contexto.
                  </p>
                  <button
                    className="primary-button"
                    disabled={!canPlan}
                    onClick={() => onPlan(session.identity.id)}
                  >
                    <Plus size={17} />
                    Añadir sesión FORJA
                  </button>
                  {!canPlan && <p>Desactiva incógnito para añadirla a tu calendario.</p>}
                </>
              )}
            </article>
          )}
        </>
      ) : (
        <>
          <div className="filters" role="group" aria-label="Contenido de la biblioteca">
            {[
              ['exercises', `Ejercicios (${catalog.exercises.length})`],
              ['sessions', `Sesiones (${catalog.sessions.length})`],
            ].map(([key, label]) => (
              <button
                key={key}
                className={view === key ? 'selected' : ''}
                aria-pressed={view === key}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {view === 'exercises' ? (
            <>
              <div className="catalog-filters">
                <label>
                  <span>
                    <Search size={16} />
                    Buscar ejercicio
                  </span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre, código o técnica"
                  />
                </label>
                <label>
                  Material
                  <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                    <option value="">Cualquier material</option>
                    {equipmentTerms.map((row) => (
                      <option value={row.id} key={row.id}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Patrón de movimiento
                  <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
                    <option value="">Todos los patrones</option>
                    {patternTerms.map((row) => (
                      <option value={row.id} key={row.id}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="context-note" role="status">
                {rows.length} ejercicios encontrados.
              </p>
              <div className="catalog-exercise-grid">
                {rows.map((row) => (
                  <article className="card catalog-exercise-card" key={row.identity.id}>
                    <img
                      src={`${import.meta.env.BASE_URL}${row.media.image}`}
                      alt={row.media.alt || row.identity.displayName}
                      loading="lazy"
                      width="768"
                      height="512"
                    />
                    <div>
                      <span className="eyebrow">
                        {row.identity.id} · {row.classification.movementPattern.label}
                      </span>
                      <h2>{row.identity.displayName}</h2>
                      <p>{row.context.equipment.map((item) => item.label).join(' · ')}</p>
                      <button
                        className="outline-button"
                        onClick={() => setSelected(row.identity.id)}
                      >
                        Ver ficha {row.identity.id}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!rows.length && (
                <div className="empty-state">
                  <h2>No hay ejercicios con esos filtros</h2>
                  <button
                    className="outline-button"
                    onClick={() => {
                      setQuery('');
                      setEquipment('');
                      setPattern('');
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="care-note">
                Estas sesiones se documentaron para el desarrollo de jóvenes deportistas. Revisa su
                contexto antes de utilizarlas como referencia.
              </p>
              <SessionCards onSelect={setSelected} />
            </>
          )}
        </>
      )}
      <details className="catalog-video-resources">
        <summary>Recursos de técnica en vídeo</summary>
        <p>
          Consultas en canales institucionales; revisa cada vídeo y su contexto antes de utilizarlo.
        </p>
        <ul>
          <li>
            <a
              href="https://www.youtube.com/@MayoClinic/search?query=core%20exercises"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buscar fuerza y core en Mayo Clinic<span className="sr-only">, nueva pestaña</span>
            </a>
          </li>
          <li>
            <a
              href="https://www.youtube.com/@SwimEngland/search?query=front%20crawl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buscar técnica de natación en Swim England
              <span className="sr-only">, nueva pestaña</span>
            </a>
          </li>
        </ul>
      </details>
      <footer className="catalog-provenance">
        <BookOpen size={16} />
        Contenido FORJA · versión {catalog.source.commit.slice(0, 7)} ·{' '}
        <SourceLink file="docs/05-exercises/README.md" />
      </footer>
    </section>
  );
}
export function CatalogSessionForm({ initialSessionId = null, initialDate, onSave, busy, error }) {
  const [selected, setSelected] = useState(initialSessionId),
    [reviewed, setReviewed] = useState(false),
    [validation, setValidation] = useState('');
  const session = catalog.sessions.find((row) => row.identity.id === selected);
  if (!session)
    return (
      <div className="forja-catalog">
        <p>Elige una referencia. Podrás revisar su contenido antes de guardarla.</p>
        <SessionCards
          onSelect={(id) => {
            setSelected(id);
            setReviewed(false);
          }}
        />
      </div>
    );
  return (
    <form
      className="private-form forja-catalog"
      onSubmit={async (e) => {
        e.preventDefault();
        setValidation('');
        try {
          await onSave(
            catalogSessionDraft({
              sessionId: selected,
              date: new FormData(e.currentTarget).get('catalogDate'),
              contextReviewed: reviewed,
            }),
          );
        } catch (err) {
          setValidation(err.message);
        }
      }}
    >
      <button
        className="text-button"
        type="button"
        disabled={busy}
        onClick={() => {
          setSelected(null);
          setReviewed(false);
        }}
      >
        <ArrowLeft size={16} />
        Elegir otra sesión
      </button>
      <span className="eyebrow">{session.identity.id} · Contexto juvenil</span>
      <h2>{session.identity.name}</h2>
      <p>{session.purpose}</p>
      <Items title="Contexto previsto" rows={session.context.profile} />
      <details className="catalog-preview">
        <summary>Consultar ejercicios, requisitos y pautas de la fuente</summary>
        <SessionDetails session={session} />
      </details>
      <label>
        Fecha para la referencia
        <input type="date" name="catalogDate" defaultValue={initialDate} required disabled={busy} />
      </label>
      <p className="care-note">
        Guardar reserva un bloque en el calendario. La pauta individual queda pendiente de
        concretar; no se copian dosis a tus registros ni se marca la sesión como realizada.
      </p>
      <label className="check-label">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={busy}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        He revisado el contexto juvenil y guardaré la sesión como referencia pendiente de adaptar.
      </label>
      {(validation || error) && (
        <p className="form-error" role="alert">
          {validation || error}
        </p>
      )}
      <button className="primary-button" disabled={!reviewed || busy}>
        {busy ? 'Guardando…' : 'Añadir referencia al calendario'}
      </button>
    </form>
  );
}
