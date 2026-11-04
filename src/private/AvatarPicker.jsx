import { useId, useState } from 'react';
import { UserRound } from 'lucide-react';
import {
  AVATAR_LEVELS,
  AVATAR_STAGES,
  DEFAULT_AVATAR_STAGES,
  avatarSprite,
} from '../domain/avatars.js';

export function AvatarFigure({ avatar, level, label, className = 'body-figure' }) {
  const sprite = avatarSprite(avatar, level);
  return sprite ? (
    <div
      className={className}
      role="img"
      aria-label={label}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}images/transformation/${sprite.file})`,
        backgroundPosition: sprite.position,
      }}
    />
  ) : (
    <div className={`${className} neutral-avatar`} role="img" aria-label={label}>
      <UserRound size={74} aria-hidden="true" />
    </div>
  );
}
const stageLabels = { start: 'Inicio', current: 'Actual', target: 'Objetivo' };

export function AvatarPicker({ value, onChange, disabled = false }) {
  const [stage, setStage] = useState('start');
  const id = useId();
  const stages = value.avatarStages ?? DEFAULT_AVATAR_STAGES;
  return (
    <fieldset className="avatar-picker" disabled={disabled}>
      <legend>Figuras de tu infografía</legend>
      <p>
        Seis complexiones, de mayor a menor volumen. Elige cada etapa a tu gusto: los kilos no
        determinan el aspecto. Son personajes ficticios, sin valor médico ni predictivo.
      </p>
      <label>
        Personaje ilustrativo
        <select
          value={value.avatar}
          onChange={(e) => onChange({ ...value, avatar: e.target.value })}
        >
          <option value="neutral">Avatar neutro</option>
          <option value="male">Chico · Figura masculina</option>
          <option value="female">Chica · Figura femenina</option>
        </select>
      </label>
      {value.avatar !== 'neutral' && (
        <>
          <div
            className="avatar-stage-buttons"
            role="group"
            aria-label="Etapa que quieres personalizar"
          >
            {AVATAR_STAGES.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={stage === key}
                onClick={() => setStage(key)}
              >
                <AvatarFigure
                  avatar={value.avatar}
                  level={stages[key]}
                  className="avatar-stage-preview"
                  label={`${stageLabels[key]}, complexión ${stages[key]}`}
                />
                <strong>{stageLabels[key]}</strong>
                <span>Complexión {stages[key]}</span>
              </button>
            ))}
          </div>
          <fieldset className="avatar-options">
            <legend>Figura para {stageLabels[stage]}</legend>
            <div className="avatar-options-grid">
              {AVATAR_LEVELS.map((level) => (
                <label
                  key={level}
                  className={`avatar-option ${stages[stage] === level ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`${id}-${stage}`}
                    value={level}
                    checked={stages[stage] === level}
                    onChange={() =>
                      onChange({
                        ...value,
                        avatarStages: { ...stages, [stage]: level },
                      })
                    }
                  />
                  <AvatarFigure
                    avatar={value.avatar}
                    level={level}
                    className="avatar-option-preview"
                    label={`Personaje ficticio, complexión ${level}`}
                  />
                  <span>Complexión {level}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </fieldset>
  );
}

export function AppearanceForm({ profile, onSave, busy, error }) {
  const [value, setValue] = useState(() => ({
    avatar: profile.avatar,
    avatarStages: profile.avatarStages ?? { ...DEFAULT_AVATAR_STAGES },
  }));
  return (
    <form
      className="private-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(value);
      }}
    >
      <AvatarPicker value={value} onChange={setValue} disabled={busy} />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? 'Guardando…' : 'Guardar figuras'}
      </button>
    </form>
  );
}
