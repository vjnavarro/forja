import { Check, CheckCheck, Plus } from 'lucide-react';
import { sessions } from '../demo';
import { ActivityGoals, activityClass, activityIcons } from './ActivityGoals';

export function WeekPlan({ completed, onToggle }) {
  return (
    <div className="week-page">
      <section className="card week-intro">
        <div className="section-head">
          <div>
            <span className="eyebrow">SEMANA DE DEMOSTRACIÓN</span>
            <h2>Tu compromiso contigo</h2>
            <p>Marca cada sesión cuando la completes. Puedes desmarcarla en cualquier momento.</p>
          </div>
          <span className="week-total">
            <CheckCheck size={23} />
            <strong>
              {completed.length}
              <small> / {sessions.length}</small>
            </strong>
            <span>completadas</span>
          </span>
        </div>
        <ActivityGoals completed={completed} />
      </section>
      <section className="session-list" aria-label="Plan semanal">
        {sessions.map((session) => {
          const Icon = activityIcons[session.type];
          const done = completed.includes(session.id);
          return (
            <article
              className={`card session ${activityClass[session.type]} ${done ? 'session-done' : ''}`}
              key={session.id}
            >
              <div className="session-day">
                <span>{session.day}</span>
                <strong>{session.date}</strong>
              </div>
              <span className="type-icon">
                <Icon size={22} />
              </span>
              <div className="session-info">
                <span className="eyebrow">
                  {session.type} · {session.duration}
                </span>
                <h2>{session.title}</h2>
                <p>{session.detail}</p>
              </div>
              <button
                className={done ? 'done-button' : 'outline-button'}
                aria-pressed={done}
                aria-label={`${done ? 'Desmarcar' : 'Completar'} ${session.title}`}
                onClick={() => onToggle(session.id)}
              >
                {done ? <Check size={17} /> : <Plus size={17} />}
                {done ? 'Completada' : 'Completar'}
              </button>
            </article>
          );
        })}
      </section>
      <p className="context-note">
        Plan ilustrativo con fechas y sesiones ficticias. Adapta el entrenamiento a tu situación con
        orientación profesional.
      </p>
    </div>
  );
}
