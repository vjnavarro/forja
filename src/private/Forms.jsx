import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker.jsx';
import { DEFAULT_AVATAR_STAGES } from '../domain/avatars.js';
import {
  today,
  validateProfile,
  validateSession,
  validateWeight,
} from '../domain/transformation.js';

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    el.showModal();
    el.querySelector('[name="kg"], select')?.focus();
    return () => {
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="private-dialog"
      ref={ref}
      aria-labelledby="private-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="section-head">
          <h2 id="private-dialog-title">{title}</h2>
          <button className="icon-button" aria-label="Cerrar formulario" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
const decimal = (value) => (value.trim() === '' ? null : Number(value.trim().replace(',', '.')));
export function ProfileForm({ onSave, onCancel, busy, error }) {
  const [validation, setValidation] = useState('');
  const [appearance, setAppearance] = useState({
    avatar: 'neutral',
    avatarStages: { ...DEFAULT_AVATAR_STAGES },
  });
  async function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      const sex = d.get('sex');
      await onSave(
        validateProfile({
          title: d.get('title'),
          initialWeight: decimal(d.get('initialWeight')),
          targetWeight: decimal(d.get('targetWeight')),
          heightCm: decimal(d.get('heightCm')),
          startDate: d.get('startDate'),
          dietStartDate: d.get('dietStartDate'),
          sex,
          ...appearance,
          weeklyGoals: {
            swim: Number(d.get('swim')),
            swimMax: Math.max(Number(d.get('swimMax')), Number(d.get('swim'))),
            strength: Number(d.get('strength')),
            core: Number(d.get('core')),
          },
        }),
      );
    } catch (err) {
      setValidation(err.message);
    }
  }
  return (
    <section className="card form-page">
      <span className="eyebrow">TU NUEVO ESPACIO</span>
      <h1>Nueva transformación</h1>
      <p>
        Configura tu punto de partida y una meta orientativa. Las sesiones se registrarán cuando las
        añadas.
      </p>
      <form onSubmit={submit} className="private-form">
        <label>
          Nombre
          <input
            name="title"
            required
            maxLength={60}
            defaultValue="Mi transformación"
            autoComplete="off"
          />
        </label>
        <div className="form-grid">
          <label>
            Peso inicial (kg)
            <input
              name="initialWeight"
              required
              inputMode="decimal"
              placeholder="Peso de partida"
            />
          </label>
          <label>
            Peso objetivo (kg)
            <input
              name="targetWeight"
              required
              inputMode="decimal"
              placeholder="Tu meta orientativa"
            />
          </label>
          <label>
            Inicio del historial
            <input name="startDate" type="date" required defaultValue={today()} />
          </label>
          <label>
            Inicio de dieta (opcional)
            <input name="dietStartDate" type="date" />
          </label>
          <label>
            Altura (cm, opcional)
            <input name="heightCm" inputMode="decimal" />
          </label>
          <label>
            Sexo (opcional)
            <select
              name="sex"
              defaultValue="unspecified"
              onChange={(e) =>
                setAppearance((previous) => ({
                  ...previous,
                  avatar: e.target.value === 'unspecified' ? 'neutral' : e.target.value,
                }))
              }
            >
              <option value="unspecified">Prefiero no indicarlo</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </label>
        </div>
        <AvatarPicker value={appearance} onChange={setAppearance} disabled={busy} />
        <fieldset>
          <legend>Tu planificación semanal</legend>
          <p>Objetivos que eliges tú; no son una prescripción ni generan sesiones realizadas.</p>
          <div className="form-grid">
            <label>
              Natación · mínimo de sesiones
              <input name="swim" type="number" min="0" max="14" defaultValue="0" required />
            </label>
            <label>
              Natación · máximo de sesiones
              <input name="swimMax" type="number" min="0" max="14" defaultValue="0" required />
            </label>
            <label>
              Fuerza · sesiones
              <input name="strength" type="number" min="0" max="14" defaultValue="0" required />
            </label>
            <label>
              Core · sesiones
              <input name="core" type="number" min="0" max="14" defaultValue="0" required />
            </label>
          </div>
        </fieldset>
        {(validation || error) && (
          <p className="form-error" role="alert">
            {validation || error}
          </p>
        )}
        <div className="form-actions">
          <button className="primary-button" disabled={busy}>
            {busy ? 'Guardando…' : 'Crear transformación'}
          </button>
          <button className="outline-button" type="button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}
export function WeightForm({ onSave, busy, error }) {
  const [validation, setValidation] = useState('');
  async function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await onSave(
        validateWeight({
          date: d.get('date'),
          kg: decimal(d.get('kg')),
          status: d.get('status'),
          note: d.get('note'),
        }),
      );
    } catch (err) {
      setValidation(err.message);
    }
  }
  return (
    <form className="private-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Fecha
          <input name="date" type="date" defaultValue={today()} required />
        </label>
        <label>
          Peso (kg)
          <input
            name="kg"
            inputMode="decimal"
            placeholder="Tu pesaje"
            required
            autoComplete="off"
            autoFocus
          />
        </label>
      </div>
      <label>
        Estado
        <select name="status" defaultValue="confirmed">
          <option value="confirmed">Confirmado</option>
          <option value="reference">Referencia consolidada</option>
          <option value="spot">Lectura puntual · Fuera de la curva</option>
        </select>
      </label>
      <label>
        Nota (opcional)
        <input name="note" maxLength={500} />
      </label>
      <p className="input-hint">
        Solo los pesajes confirmados o de referencia actualizan el progreso y los hitos.
      </p>
      {(validation || error) && (
        <p className="form-error" role="alert">
          {validation || error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Guardando en la nube…' : 'Guardar pesaje'}
      </button>
    </form>
  );
}
export function SessionForm({ onSave, busy, error }) {
  const [type, setType] = useState('swim');
  const [exercises, setExercises] = useState([]);
  const [discomfort, setDiscomfort] = useState('not-reported');
  const [validation, setValidation] = useState('');
  function changeExercise(index, key, value) {
    setExercises((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }
  async function submit(e) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await onSave(
        validateSession({
          date: d.get('date'),
          type,
          completed: d.get('completed') === 'on',
          minutes: decimal(d.get('minutes')),
          distance: type === 'swim' ? decimal(d.get('distance')) : null,
          exercises:
            type === 'swim' ? [] : exercises.map((item) => ({ ...item, sets: Number(item.sets) })),
          discomfort,
          notes: d.get('notes'),
        }),
      );
    } catch (err) {
      setValidation(err.message);
    }
  }
  return (
    <form className="private-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Fecha
          <input type="date" name="date" defaultValue={today()} required />
        </label>
        <label>
          Actividad
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="swim">Natación</option>
            <option value="strength">Fuerza</option>
            <option value="core">Core</option>
          </select>
        </label>
        <label>
          Duración (min, opcional)
          <input name="minutes" type="number" min="0" max="1440" />
        </label>
        {type === 'swim' && (
          <label>
            Distancia (m, opcional)
            <input name="distance" type="number" min="0" max="100000" />
          </label>
        )}
      </div>
      {type !== 'swim' && (
        <fieldset>
          <legend>Ejercicios de esta sesión</legend>
          <p>Hasta seis ejercicios por sesión.</p>
          {exercises.map((row, index) => (
            <div className="exercise-fields" key={index}>
              <label>
                Ejercicio
                <input
                  value={row.name}
                  maxLength={80}
                  onChange={(e) => changeExercise(index, 'name', e.target.value)}
                  required
                />
              </label>
              <label>
                Series
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={row.sets}
                  onChange={(e) => changeExercise(index, 'sets', e.target.value)}
                  required
                />
              </label>
              <label>
                Repeticiones o tiempo
                <input
                  value={row.repetitions}
                  placeholder="Lo que has realizado"
                  maxLength={40}
                  onChange={(e) => changeExercise(index, 'repetitions', e.target.value)}
                  required
                />
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Quitar ejercicio ${index + 1}`}
                onClick={() => setExercises((rows) => rows.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="outline-button"
            disabled={exercises.length >= 6}
            onClick={() =>
              setExercises((rows) => [...rows, { name: '', sets: '', repetitions: '' }])
            }
          >
            <Plus size={16} />
            Añadir ejercicio
          </button>
        </fieldset>
      )}
      <label>
        Molestias
        <select value={discomfort} onChange={(e) => setDiscomfort(e.target.value)}>
          <option value="not-reported">Sin valorar</option>
          <option value="none">Ninguna comunicada</option>
          <option value="present">He notado molestias</option>
        </select>
      </label>
      {discomfort === 'present' && (
        <p className="care-note" role="status">
          Registra qué has notado y sigue las indicaciones de tu profesional. FORJA no aumenta
          ejercicios ni propone progresiones ante molestias.
        </p>
      )}
      <label>
        Observaciones (opcional)
        <textarea name="notes" maxLength={2000} rows={3} />
      </label>
      <label className="check-label">
        <input name="completed" type="checkbox" />
        Sesión completada
      </label>
      {(validation || error) && (
        <p className="form-error" role="alert">
          {validation || error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Guardando en la nube…' : 'Guardar sesión'}
      </button>
    </form>
  );
}
