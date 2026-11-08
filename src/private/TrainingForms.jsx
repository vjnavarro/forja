import { useState } from 'react';
import { Waves, Dumbbell, PersonStanding } from 'lucide-react';
import { ACTIVITY_LABELS } from '../domain/planning.js';
import { assessWeek, validateProgram } from '../domain/training.js';
import { formatDate, weekBounds } from '../domain/transformation.js';
const icons = { swim: Waves, strength: Dumbbell, core: PersonStanding };
const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function ProgramForm({ initial, templates, date, onSave, busy, error }) {
  const [schedule, setSchedule] = useState(initial?.schedule ?? []);
  const [ids, setIds] = useState(
    initial?.templateIds ?? templates.map((row) => row.id).slice(0, 12),
  );
  const [validation, setValidation] = useState('');
  return (
    <form
      className="private-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        try {
          await onSave(
            validateProgram({
              startWeek: weekBounds(data.get('startWeek')).start,
              weeks: Number(data.get('weeks')),
              schedule,
              templateIds: ids,
            }),
          );
        } catch (err) {
          setValidation(err.message);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Semana de inicio
          <input
            type="date"
            name="startWeek"
            defaultValue={initial?.startWeek ?? weekBounds(date).start}
            required
          />
        </label>
        <label>
          Duración de la programación (semanas)
          <input
            name="weeks"
            type="number"
            min="1"
            max="12"
            defaultValue={initial?.weeks ?? 4}
            required
          />
        </label>
      </div>
      <fieldset disabled={busy}>
        <legend>Qué haré cada día</legend>
        <p>
          Puedes combinar las tres actividades en un día. La distribución se mantiene durante el
          periodo elegido; cada semana se revisa antes de aceptar la siguiente.
        </p>
        {days.map((label, day) => (
          <div className="program-day" key={day}>
            <strong>{label}</strong>
            <div className="program-day-options">
              {Object.entries(ACTIVITY_LABELS).map(([type, title]) => {
                const Icon = icons[type];
                return (
                  <label className={`check-label activity-choice activity-${type}`} key={type}>
                    <input
                      type="checkbox"
                      aria-label={`${label}: ${title}`}
                      checked={schedule.some((row) => row.day === day && row.type === type)}
                      onChange={(e) =>
                        setSchedule((old) =>
                          e.target.checked
                            ? [...old, { day, type }]
                            : old.filter((row) => row.day !== day || row.type !== type),
                        )
                      }
                    />
                    <Icon size={18} aria-hidden="true" />
                    {title}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>Plantillas que quiero alternar</legend>
        <p>
          Selecciona hasta doce variantes. El enfoque y el nivel los defines tú. Los bloques sin
          plantilla quedarán pendientes de concretar.
        </p>
        {templates.map((row) => (
          <label className="check-label" key={row.id}>
            <input
              type="checkbox"
              checked={ids.includes(row.id)}
              onChange={(e) =>
                setIds((old) =>
                  e.target.checked ? [...old, row.id] : old.filter((id) => id !== row.id),
                )
              }
            />
            {row.title} · {ACTIVITY_LABELS[row.type]} · {row.focus} · Nivel {row.level}
          </label>
        ))}
        {!templates.length && (
          <p>No hay plantillas todavía. Puedes guardarlas desde «Nueva plantilla».</p>
        )}
      </fieldset>
      {(validation || error) && (
        <p role="alert" className="form-error">
          {validation || error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        Guardar programación
      </button>
    </form>
  );
}
export function ReviewForm({ snapshot, busy, error, onSave }) {
  const initial = snapshot.initial;
  const [wellbeing, setWellbeing] = useState(initial?.wellbeing ?? '');
  const [discomfort, setDiscomfort] = useState(initial?.discomfort ?? 'unknown');
  const [decision, setDecision] = useState(initial?.decision ?? 'maintain');
  const [confirmed, setConfirmed] = useState(false);
  const assessment = assessWeek(snapshot.rows, { wellbeing, discomfort });
  const completed = snapshot.rows.filter((row) => row.completed).length;
  return (
    <form
      className="private-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmed) return;
        const data = new FormData(e.currentTarget);
        onSave({
          fingerprint: snapshot.fingerprint,
          wellbeing,
          discomfort,
          decision,
          notes: data.get('reviewNotes'),
        });
      }}
    >
      <p>
        Semana del {formatDate(snapshot.start)}. {completed} de {snapshot.rows.length} actividades
        completadas.
      </p>
      <label>
        Cómo ha ido la semana
        <select
          value={wellbeing}
          required
          onChange={(e) => {
            setWellbeing(e.target.value);
            if (e.target.value !== 'good') setDecision('maintain');
          }}
        >
          <option value="">Selecciona una valoración</option>
          <option value="good">Todo bien</option>
          <option value="mixed">Con dificultades o ajustes</option>
          <option value="bad">No ha ido bien</option>
        </select>
      </label>
      <label>
        Molestias de esta semana
        <select
          value={discomfort}
          onChange={(e) => {
            setDiscomfort(e.target.value);
            if (e.target.value !== 'none') setDecision('maintain');
          }}
        >
          <option value="unknown">Sin valorar</option>
          <option value="none">No he tenido molestias</option>
          <option value="present">He tenido molestias</option>
        </select>
      </label>
      <label>
        Decisión para la próxima semana
        <select value={decision} onChange={(e) => setDecision(e.target.value)}>
          <option value="maintain">Mantener el nivel</option>
          <option value="reduce">Usar un nivel inferior configurado</option>
          <option value="increase" disabled={!assessment.increaseAllowed}>
            Proponer un nivel superior configurado
          </option>
        </select>
      </label>
      {!assessment.increaseAllowed && (
        <p className="care-note">
          El aumento requiere una valoración favorable, ausencia explícita de molestias y todas las
          actividades completadas. Los registros de molestias también se tienen en cuenta.
        </p>
      )}
      <p className="context-note">
        Solo se proponen variantes que tú hayas configurado. No se calculan aumentos de series,
        repeticiones ni peso.
      </p>
      <label>
        Notas de la revisión
        <textarea
          name="reviewNotes"
          maxLength={2000}
          rows={3}
          defaultValue={initial?.notes ?? ''}
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        He revisado los registros y doy por cerrada esta semana.
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy || !confirmed}>
        Cerrar revisión y preparar siguiente semana
      </button>
    </form>
  );
}
