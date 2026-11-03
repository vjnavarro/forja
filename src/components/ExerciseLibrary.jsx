import { ArrowUpRight, Play, Search } from 'lucide-react';
import { useState } from 'react';
import { exercises } from '../demo';
import { activityClass, activityIcons } from './ActivityGoals';

export function ExerciseLibrary() {
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const normalize = (text) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const visible = exercises.filter(
    (exercise) =>
      (filter === 'Todos' || exercise.type === filter) &&
      normalize(exercise.name).includes(normalize(search.trim())),
  );
  return (
    <div className="library-page">
      <div className="library-toolbar">
        <div className="filters" role="group" aria-label="Filtrar ejercicios">
          {['Todos', ...Object.keys(activityIcons)].map((type) => (
            <button
              aria-pressed={filter === type}
              className={filter === type ? 'selected' : ''}
              key={type}
              onClick={() => setFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Buscar ejercicio</span>
          <input
            type="search"
            placeholder="Buscar ejercicio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <p className="result-count" role="status">
        {visible.length} {visible.length === 1 ? 'ejercicio disponible' : 'ejercicios disponibles'}
      </p>
      <section className="exercise-grid" aria-label="Ejercicios">
        {visible.map((exercise) => {
          const Icon = activityIcons[exercise.type];
          return (
            <article
              className={`card exercise ${activityClass[exercise.type]}`}
              key={exercise.name}
            >
              <div className={`exercise-art ${exercise.image ? 'has-image' : ''}`}>
                {exercise.image ? (
                  <img
                    src={`${import.meta.env.BASE_URL}images/exercises/${exercise.image}`}
                    alt={`Ilustración de ${exercise.name.toLowerCase()}`}
                    width="1536"
                    height="1024"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <>
                    <div className="exercise-pattern" />
                    <Icon size={65} strokeWidth={1.2} aria-hidden="true" />
                  </>
                )}
                <span className="exercise-type">
                  <Icon size={13} />
                  {exercise.type}
                </span>
              </div>
              <div className="exercise-copy">
                <h2>{exercise.name}</h2>
                <p>
                  {exercise.detail}
                  <span>Ejemplo de demo</span>
                </p>
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.query)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Play size={15} />
                  Buscar vídeos de técnica
                  <ArrowUpRight size={16} />
                  <span className="sr-only"> de {exercise.name}, en YouTube, nueva pestaña</span>
                </a>
              </div>
            </article>
          );
        })}
      </section>
      {!visible.length && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No encontramos ese ejercicio</h2>
          <p>Prueba otro nombre o cambia el filtro.</p>
          <button
            className="outline-button"
            onClick={() => {
              setFilter('Todos');
              setSearch('');
            }}
          >
            Mostrar todos
          </button>
        </div>
      )}
      <p className="context-note">
        Los enlaces abren búsquedas en YouTube. Revisa la fuente y la técnica; las repeticiones son
        ejemplos ficticios, no una prescripción personal.
      </p>
    </div>
  );
}
