import { Activity, Dumbbell, Waves } from 'lucide-react';
import { sessions } from '../demo';

export const activityIcons = { Natación: Waves, Fuerza: Dumbbell, Core: Activity };
export const activityClass = { Natación: 'swim', Fuerza: 'strength', Core: 'core' };

export function ActivityGoals({ completed }) {
  return (
    <div className="activity-goals">
      {Object.entries(activityIcons).map(([type, Icon]) => {
        const group = sessions.filter((session) => session.type === type);
        const count = group.filter((session) => completed.includes(session.id)).length;
        return (
          <div className={`activity-goal ${activityClass[type]}`} key={type}>
            <div className="activity-goal-heading">
              <span className="type-icon">
                <Icon size={20} />
              </span>
              <strong>{type}</strong>
              <span>
                {count}
                <small> / {group.length}</small>
              </span>
            </div>
            <div
              className="track"
              role="progressbar"
              aria-label={`Objetivo de ${type}`}
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={group.length}
            >
              <i style={{ width: `${(count / group.length) * 100}%` }} />
            </div>
            <p>
              {count === group.length
                ? 'Objetivo semanal completado'
                : `${group.length - count} ${group.length - count === 1 ? 'sesión pendiente' : 'sesiones pendientes'}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
