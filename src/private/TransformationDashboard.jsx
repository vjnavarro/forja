import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  EyeOff,
  Flag,
  Plus,
  Target,
  Trophy,
  UserRound,
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
import {
  calculateProgress,
  dateTime,
  formatDate,
  formatNumber,
  formatWeight,
} from '../domain/transformation.js';

export function TransformationDashboard({
  profile,
  weights,
  incognito,
  onReveal,
  onWeight,
  onWeek,
}) {
  const m = calculateProgress(profile, weights);
  const figures = profile.avatar === 'female' ? 'forja-stages-female.webp' : 'forja-stages.webp';
  const number = (value) => (incognito || value === null ? '•••' : formatNumber(value));
  const date = (value) => (incognito ? 'Fecha privada' : formatDate(value));
  const chart = m.refs.map((row) => ({ ...row, time: dateTime(row.date) }));
  const upcoming = m.milestones.filter((item) => item.kind === 'weight');
  const achieved = upcoming.filter((item) => item.reached);
  const visibleMilestones = [
    ...achieved.slice(-1),
    ...upcoming.filter((item) => !item.reached).slice(0, 4),
  ];
  return (
    <div className="dashboard">
      <div className="overview-grid">
        <section className="journey-card" aria-labelledby="journey-title">
          <div className="journey-heading">
            <div>
              <span className="eyebrow">TU EVOLUCIÓN, PASO A PASO</span>
              <h2 id="journey-title">Tres etapas. Un mismo camino.</h2>
            </div>
            <div className="journey-change">
              <strong>
                {incognito
                  ? 'Cifras privadas'
                  : m.change === null
                    ? 'Sin referencia'
                    : `${m.change > 0 ? '+' : '−'}${formatWeight(Math.abs(m.change))}`}
              </strong>
              <span>
                {incognito
                  ? 'Modo incógnito activado'
                  : m.percentChange === null
                    ? 'Añade un pesaje confirmado'
                    : `${formatNumber(m.percentChange)}% desde el inicio`}
              </span>
            </div>
          </div>
          <div className="journey-stages">
            {[
              {
                label: 'Inicio',
                value: profile.initialWeight,
                className: 'start',
                detail: date(profile.startDate),
              },
              {
                label: 'Actual',
                value: m.current,
                className: 'today',
                detail: m.latest ? date(m.latest.date) : 'Sin referencia',
              },
              {
                label: 'Objetivo',
                value: profile.targetWeight,
                className: 'finish',
                detail: 'Meta orientativa',
              },
            ].map((stage, index) => (
              <div className={`journey-stage ${stage.className}`} key={stage.label}>
                {profile.avatar === 'neutral' ? (
                  <div className="body-figure neutral-avatar">
                    <UserRound size={74} aria-label="Avatar neutro" />
                  </div>
                ) : (
                  <div
                    className="body-figure"
                    role="img"
                    aria-label={`Personaje ficticio, etapa ${stage.label.toLowerCase()}. Imagen ilustrativa.`}
                    style={{
                      backgroundImage: `url(${import.meta.env.BASE_URL}images/transformation/${figures})`,
                      backgroundPosition: `${index * 50}% center`,
                    }}
                  />
                )}
                <div className="stage-platform" aria-hidden="true" />
                <div className="stage-label">
                  <p>{stage.label}</p>
                  <strong>
                    {number(stage.value)}
                    <small>{!incognito && stage.value !== null ? ' kg' : ''}</small>
                  </strong>
                  <span className="stage-detail">{stage.detail}</span>
                </div>
                {index < 2 && <ChevronRight className="stage-arrow" size={18} />}
              </div>
            ))}
          </div>
          <div className="journey-footnote">
            <span className="status-dot" />
            Avatares ilustrativos, no predictivos. Los pesajes no modifican las figuras.
          </div>
        </section>
        <section className="goal-card">
          <div className="section-head">
            <h2>Progreso del objetivo</h2>
            <Target size={19} />
          </div>
          {incognito ? (
            <div className="privacy-placeholder">
              <EyeOff size={30} />
              <strong>Cifras protegidas</strong>
              <button className="outline-button" onClick={onReveal}>
                Mostrar cifras
              </button>
            </div>
          ) : m.progress === null ? (
            <div className="privacy-placeholder">
              <p>Añade un pesaje de referencia.</p>
            </div>
          ) : (
            <>
              <div
                className="goal-gauge"
                role="progressbar"
                aria-label="Progreso del objetivo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(m.progress)}
              >
                <svg viewBox="0 0 240 140" aria-hidden="true">
                  <path d="M24 116 A96 96 0 0 1 216 116" pathLength="100" className="gauge-track" />
                  <path
                    d="M24 116 A96 96 0 0 1 216 116"
                    pathLength="100"
                    className="gauge-progress"
                    strokeDasharray={`${m.progress} 100`}
                  />
                </svg>
                <div className="gauge-value">
                  <strong>
                    {Math.round(m.progress)}
                    <small>%</small>
                  </strong>
                  <span>del camino recorrido</span>
                </div>
              </div>
              <p className="goal-caption">
                {formatWeight(Math.max(0, m.advanced))} de {formatWeight(m.total)} hacia tu meta
              </p>
            </>
          )}
          <div className="goal-details">
            <div>
              {m.change > 0 ? <ArrowUpRight size={19} /> : <ArrowDownRight size={19} />}
              <span>
                Cambio acumulado
                <strong>
                  {number(m.change)}
                  {!incognito && m.change !== null ? ' kg' : ''}
                </strong>
              </span>
            </div>
            <div>
              <Flag size={18} />
              <span>
                Hasta tu objetivo
                <strong>
                  {number(m.remaining)}
                  {!incognito && m.remaining !== null ? ' kg' : ''}
                </strong>
              </span>
            </div>
          </div>
        </section>
      </div>
      <div className="detail-grid">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">PESAJES DE REFERENCIA</span>
              <h2>Evolución de tu peso</h2>
            </div>
            <button className="icon-button" aria-label="Registrar pesaje" onClick={onWeight}>
              <Plus size={20} />
            </button>
          </div>
          {incognito ? (
            <div className="privacy-placeholder chart-private">
              <EyeOff size={27} />
              <p>La gráfica y sus cifras están ocultas.</p>
            </div>
          ) : chart.length ? (
            <>
              <div className="chart-summary">
                <strong>
                  {number(m.current)}
                  <small> kg</small>
                </strong>
                <span className="change-badge positive">
                  Referencia del {formatDate(m.latest.date)}
                </span>
              </div>
              <div
                className="weight-chart"
                role="img"
                aria-label="Gráfica histórica con intervalos reales entre fechas. Las lecturas puntuales quedan excluidas."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="private-weight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-line)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--chart-line)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={[
                        chart[0].time - (chart.length === 1 ? 43200000 : 0),
                        chart.at(-1).time + (chart.length === 1 ? 43200000 : 0),
                      ]}
                      tickFormatter={(value) =>
                        new Intl.DateTimeFormat('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          timeZone: 'UTC',
                        }).format(value)
                      }
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                      minTickGap={20}
                    />
                    <YAxis
                      domain={[
                        Math.min(profile.targetWeight, ...chart.map((row) => row.kg)) - 1,
                        Math.max(profile.initialWeight, ...chart.map((row) => row.kg)) + 1,
                      ]}
                      tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                    />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Intl.DateTimeFormat('es-ES', {
                          dateStyle: 'short',
                          timeZone: 'UTC',
                        }).format(value)
                      }
                      formatter={(value) => [formatWeight(value), 'Peso de referencia']}
                      contentStyle={{
                        background: '#102b40',
                        border: '1px solid #57768a',
                        borderRadius: 9,
                        color: '#fff',
                      }}
                    />
                    <ReferenceLine
                      y={profile.targetWeight}
                      stroke="#9ae6b2"
                      strokeDasharray="5 5"
                    />
                    <Area
                      dataKey="kg"
                      type="linear"
                      stroke="var(--chart-line)"
                      strokeWidth={2.5}
                      fill="url(#private-weight)"
                      dot={{ r: 3, fill: '#102b40', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="context-note">Todavía no hay pesajes de referencia.</p>
          )}
          <div className="chart-footer">
            <span>
              {incognito ? 'Historial privado' : `${m.refs.length} pesajes de referencia`}
            </span>
            <span>Lecturas puntuales fuera de la curva</span>
          </div>
        </section>
        <section className="card milestone-card">
          <div className="section-head">
            <h2>Próximos hitos</h2>
            <Trophy size={20} />
          </div>
          {incognito ? (
            <div className="privacy-placeholder">
              <EyeOff size={25} />
              <p>Hitos y distancias ocultos</p>
            </div>
          ) : (
            <ol className="milestone-list">
              {visibleMilestones.map((item) => (
                <li
                  className={`${item.reached ? 'reached' : ''} ${m.next?.id === item.id ? 'next' : ''}`}
                  key={item.id}
                >
                  <span className="milestone-marker">
                    {item.reached ? (
                      <Check size={14} />
                    ) : item.id === 'target' ? (
                      <Flag size={13} />
                    ) : (
                      <span />
                    )}
                  </span>
                  <div>
                    <strong>{formatWeight(item.value)}</strong>
                    <p>
                      {item.reached
                        ? `Alcanzado · ${formatDate(item.date)}`
                        : item.id === 'target'
                          ? 'Meta orientativa'
                          : 'Próximo objetivo'}
                    </p>
                  </div>
                  {!item.reached && m.current !== null && (
                    <span className="milestone-distance">
                      A {formatWeight(Math.abs(m.current - item.value))}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="milestone-note">
            Las fechas corresponden al primer pesaje de referencia que demuestra cada hito.
          </p>
        </section>
      </div>
      <section
        className="journey-trail"
        style={{
          '--trail-image': `url(${import.meta.env.BASE_URL}images/transformation/mountain-journey.webp)`,
        }}
      >
        <div>
          <span className="eyebrow">PERSPECTIVA PARA SEGUIR</span>
          <h2>Tu objetivo sigue ahí.</h2>
          <p>Tu evolución se construye con registros, hábitos y constancia.</p>
        </div>
        {incognito ? (
          <div className="privacy-placeholder">
            <EyeOff size={26} />
            <span>Recorrido privado</span>
          </div>
        ) : (
          <ol className="trail-stops">
            <svg
              className="trail-path"
              viewBox="0 0 1000 150"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M75 110 C160 50 200 130 285 90 S430 120 500 65 S640 100 710 45 S850 80 925 20" />
            </svg>
            {[
              { id: 'start', value: profile.initialWeight, reached: true },
              ...visibleMilestones.slice(-4),
            ].map((item) => (
              <li className={item.reached ? 'reached' : ''} key={item.id}>
                <span>{item.reached ? <Check size={15} /> : <Flag size={15} />}</span>
                <strong>{formatWeight(item.value)}</strong>
                <small>
                  {item.id === 'start'
                    ? 'Inicio'
                    : item.id === 'target'
                      ? 'Objetivo'
                      : item.reached
                        ? 'Alcanzado'
                        : 'Hito'}
                </small>
              </li>
            ))}
          </ol>
        )}
      </section>
      {!incognito && m.bmi !== null && (
        <p className="context-note">
          IMC orientativo: {formatNumber(m.bmi)}. No determina por sí solo el estado de salud ni una
          meta individual.
        </p>
      )}
      <section className="card weekly-summary">
        <div className="section-head">
          <div>
            <span className="eyebrow">MÁS ALLÁ DE LA BÁSCULA</span>
            <h2>Tu semana, en movimiento</h2>
            <p>Solo se contabilizan las sesiones que marcas como completadas.</p>
          </div>
          <button className="text-button" onClick={onWeek}>
            Ver mi semana
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
