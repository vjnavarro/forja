import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Flag,
  Plus,
  Target,
  Trophy,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatWeight, getProgress, initialWeight, targetWeight } from '../progress';
import { sessions } from '../demo';
import { ActivityGoals } from './ActivityGoals';

function Journey({ metrics }) {
  const { current, lost, percentChange } = metrics;
  return (
    <section className="journey-card" aria-labelledby="journey-title">
      <div className="journey-heading">
        <div>
          <span className="eyebrow">TU EVOLUCIÓN, PASO A PASO</span>
          <h2 id="journey-title">Tres etapas. Un mismo camino.</h2>
        </div>
        <div className="journey-change">
          <strong>
            {lost < 0 ? '+' : '−'}
            {formatWeight(Math.abs(lost))}
          </strong>
          <span>
            {lost < 0 ? '+' : '−'}
            {formatNumber(Math.abs(percentChange))}% desde el inicio
          </span>
        </div>
      </div>
      <div className="journey-stages">
        {[
          {
            label: 'Inicio',
            value: initialWeight,
            detail: 'Tu punto de partida',
            className: 'start',
          },
          {
            label: 'Hoy',
            value: current,
            detail: 'Tu último registro',
            className: 'today',
          },
          {
            label: 'Objetivo',
            value: targetWeight,
            detail: 'Tu meta de demo',
            className: 'finish',
          },
        ].map(({ label, value, detail, className }, index) => (
          <div className={`journey-stage ${className}`} key={label}>
            <div
              className="body-figure"
              role="img"
              aria-label={`Mismo personaje adulto ficticio, etapa ${label.toLowerCase()}. Representación ilustrativa.`}
              style={{
                backgroundImage: `url(${import.meta.env.BASE_URL}images/transformation/forja-stages.webp)`,
                backgroundPosition: `${index * 50}% center`,
              }}
            />
            <div className="stage-platform" aria-hidden="true" />
            <div className="stage-label">
              <p>{label}</p>
              <strong>
                {formatNumber(value)}
                <small> kg</small>
              </strong>
              <span className="stage-detail">{detail}</span>
            </div>
            {index < 2 && <ChevronRight className="stage-arrow" size={18} />}
          </div>
        ))}
      </div>
      <div className="journey-footnote">
        <span className="status-dot" /> Personaje ficticio · Aspecto ilustrativo, no predictivo. Los
        registros actualizan los datos, no las figuras.
      </div>
    </section>
  );
}

function GoalCard({ metrics }) {
  const { lost, total, progress, remaining } = metrics;
  return (
    <section className="goal-card" aria-labelledby="goal-title">
      <div className="section-head">
        <h2 id="goal-title">Progreso del objetivo</h2>
        <Target size={19} />
      </div>
      <div
        className="goal-gauge"
        role="progressbar"
        aria-label="Progreso del objetivo de peso"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <svg viewBox="0 0 240 140" aria-hidden="true">
          <path d="M 24 116 A 96 96 0 0 1 216 116" pathLength="100" className="gauge-track" />
          <path
            d="M 24 116 A 96 96 0 0 1 216 116"
            pathLength="100"
            className="gauge-progress"
            strokeDasharray={`${progress} 100`}
          />
        </svg>
        <div className="gauge-value">
          <strong>
            {Math.round(progress)}
            <small>%</small>
          </strong>
          <span>del camino recorrido</span>
        </div>
      </div>
      <p className="goal-caption">
        {formatNumber(Math.max(0, lost))} de {formatWeight(total)} hacia tu objetivo
      </p>
      <div className="goal-details">
        <div className={lost < 0 ? 'weight-gain' : ''}>
          {lost < 0 ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
          <span>
            {lost < 0 ? 'Cambio desde el inicio' : 'Has avanzado'}
            <strong>
              {lost < 0 ? '+' : '−'}
              {formatWeight(Math.abs(lost))}
            </strong>
          </span>
        </div>
        <div>
          <Flag size={18} />
          <span>
            Hasta tu objetivo<strong>{formatWeight(remaining)}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function WeightChart({ records, metrics, onRegister }) {
  const { current, lost, percentChange } = metrics;
  const lower = Math.min(targetWeight, ...records.map((record) => record.kg)) - 0.6;
  const upper = Math.max(initialWeight, ...records.map((record) => record.kg)) + 0.6;
  return (
    <section className="card chart-card" aria-labelledby="chart-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">TU HISTORIA, EN DATOS</span>
          <h2 id="chart-title">Evolución de tu peso</h2>
        </div>
        <button className="icon-button" aria-label="Añadir registro de peso" onClick={onRegister}>
          <Plus size={19} />
        </button>
      </div>
      <div className="chart-summary">
        <strong>
          {formatNumber(current)}
          <small> kg</small>
        </strong>
        <span className={`change-badge ${lost >= 0 ? 'positive' : 'neutral'}`}>
          {lost >= 0 ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
          {formatWeight(Math.abs(lost))} desde el inicio
        </span>
      </div>
      <div
        className="weight-chart"
        role="img"
        aria-label={`Evolución de ${records.length} registros ficticios, desde ${formatWeight(initialWeight)} hasta ${formatWeight(current)}. Objetivo: ${formatWeight(targetWeight)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={records}
            margin={{ top: 14, right: 16, left: -18, bottom: 5 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-line, var(--forja-secondary))"
                  stopOpacity={0.24}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-line, var(--forja-secondary))"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              dy={9}
              minTickGap={20}
            />
            <YAxis
              domain={[lower, upper]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              tickFormatter={(value) =>
                new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)
              }
              tickCount={5}
            />
            <Tooltip
              formatter={(value) => [formatWeight(value), 'Peso de demo']}
              contentStyle={{
                borderRadius: 10,
                border: '1px solid var(--border)',
                color: 'var(--forja-primary)',
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={targetWeight}
              stroke="var(--forja-success)"
              strokeDasharray="5 5"
              label={{
                value: 'Objetivo · 78 kg',
                position: 'insideTopRight',
                fill: 'var(--success-text)',
                fontSize: 10,
              }}
            />
            <Area
              type="linear"
              dataKey="kg"
              stroke="var(--chart-line, var(--forja-secondary))"
              strokeWidth={2.5}
              fill="url(#weight-fill)"
              dot={{ r: 3.5, fill: 'var(--surface)', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footer">
        <span>
          <i /> {records.length} registros de demostración
        </span>
        <span>
          {lost >= 0 ? '−' : '+'}
          {formatNumber(Math.abs(percentChange))}% del peso inicial
        </span>
      </div>
    </section>
  );
}

function Milestones({ metrics }) {
  const { current, milestones, nextMilestone } = metrics;
  return (
    <section className="card milestone-card" aria-labelledby="milestone-title">
      <div className="section-head">
        <div>
          <span className="eyebrow">UNA META CADA VEZ</span>
          <h2 id="milestone-title">Próximos hitos</h2>
        </div>
        <Trophy size={20} />
      </div>
      <ol className="milestone-list">
        {milestones.map((milestone) => {
          const next = nextMilestone?.kg === milestone.kg;
          return (
            <li
              key={milestone.kg}
              className={`${milestone.reached ? 'reached' : ''} ${next ? 'next' : ''}`}
            >
              <span className="milestone-marker">
                {milestone.reached ? (
                  <Check size={14} />
                ) : milestone.kg === targetWeight ? (
                  <Flag size={13} />
                ) : (
                  <span />
                )}
              </span>
              <div>
                <strong>{formatWeight(milestone.kg)}</strong>
                <p>
                  {milestone.reached
                    ? 'Hito alcanzado'
                    : milestone.kg === targetWeight
                      ? 'Objetivo final de demo'
                      : next
                        ? 'Tu siguiente paso'
                        : 'Más adelante'}
                </p>
              </div>
              <span className="milestone-distance">
                {milestone.reached
                  ? 'Logrado'
                  : `A ${formatWeight(+(current - milestone.kg).toFixed(1))}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="milestone-note">
        El peso es una parte del camino. Tus hábitos también cuentan.
      </p>
    </section>
  );
}

function JourneyTrail({ metrics }) {
  const { milestones, nextMilestone } = metrics;
  return (
    <section
      className="journey-trail"
      aria-labelledby="trail-title"
      style={{
        '--trail-image': `url(${import.meta.env.BASE_URL}images/transformation/mountain-journey.webp)`,
      }}
    >
      <div>
        <span className="eyebrow">PERSPECTIVA PARA SEGUIR</span>
        <h2 id="trail-title">Tu objetivo sigue ahí.</h2>
        <p>Cada registro es un paso más en tu historia.</p>
      </div>
      <ol className="trail-stops">
        <svg
          className="trail-path"
          viewBox="0 0 1000 150"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M 75 110 C 160 50 200 130 285 90 S 430 120 500 65 S 640 100 710 45 S 850 80 925 20" />
        </svg>
        <li className="reached">
          <span>
            <Check size={15} />
          </span>
          <strong>{formatWeight(initialWeight)}</strong>
          <small>Inicio</small>
        </li>
        {milestones.map((milestone) => (
          <li
            key={milestone.kg}
            className={`${milestone.reached ? 'reached' : ''} ${nextMilestone?.kg === milestone.kg ? 'next' : ''}`}
          >
            <span>
              {milestone.reached ? (
                <Check size={15} />
              ) : milestone.kg === targetWeight ? (
                <Flag size={15} />
              ) : (
                <span />
              )}
            </span>
            <strong>{formatWeight(milestone.kg)}</strong>
            <small>
              {milestone.kg === targetWeight
                ? 'Objetivo'
                : milestone.reached
                  ? 'Alcanzado'
                  : 'Hito'}
            </small>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Dashboard({ records, completed, onRegister, onShowWeek }) {
  const metrics = getProgress(records);
  return (
    <div className="dashboard">
      <div className="overview-grid">
        <Journey metrics={metrics} />
        <GoalCard metrics={metrics} />
      </div>
      <div className="detail-grid">
        <WeightChart records={records} metrics={metrics} onRegister={onRegister} />
        <Milestones metrics={metrics} />
      </div>
      <JourneyTrail metrics={metrics} />
      <section className="card weekly-summary" aria-labelledby="week-summary-title">
        <div className="section-head">
          <div>
            <span className="eyebrow">MÁS ALLÁ DE LA BÁSCULA</span>
            <h2 id="week-summary-title">Tu semana, en movimiento</h2>
            <p>
              {completed.length} de {sessions.length} sesiones completadas. A tu ritmo.
            </p>
          </div>
          <button className="text-button" onClick={onShowWeek}>
            Ver mi semana <ChevronRight size={16} />
          </button>
        </div>
        <ActivityGoals completed={completed} />
      </section>
    </div>
  );
}
