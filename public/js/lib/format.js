const UNITS = [
  { size: 1e12, suffix: "T" },
  { size: 1e9, suffix: "B" },
  { size: 1e6, suffix: "M" },
  { size: 1e3, suffix: "K" },
];

const isCount = (value) => Number.isFinite(value) && value >= 0;

const oneDecimal = (value) => String(Math.round(value * 10) / 10);

export const formatCompact = (value) => {
  if (!isCount(value)) return null;
  const index = UNITS.findIndex(({ size }) => value >= size * 0.99995);
  if (index === -1) return String(Math.round(value));
  const { size, suffix } = UNITS[index];
  const scaled = Math.round((value / size) * 10) / 10;
  if (scaled >= 1000 && index > 0) return `${oneDecimal(scaled / 1000)}${UNITS[index - 1].suffix}`;
  return `${oneDecimal(scaled)}${suffix}`;
};

const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatCount = (value) => (isCount(value) ? GROUPED.format(Math.round(value)) : null);

export const yearsSince = (iso, now = Date.now()) => {
  const start = new Date(typeof iso === "string" ? iso : Number.NaN);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date(now);
  const years = today.getUTCFullYear() - start.getUTCFullYear();
  const beforeAnniversary =
    today.getUTCMonth() < start.getUTCMonth() || (today.getUTCMonth() === start.getUTCMonth() && today.getUTCDate() < start.getUTCDate());
  return years - (beforeAnniversary ? 1 : 0);
};

const text = (value) => (value === null || value === undefined ? null : String(value));

const githubView = (github, now) =>
  github
    ? {
        publicRepos: formatCount(github.publicRepos),
        followers: formatCount(github.followers),
        years: text(yearsSince(github.createdAt, now)),
        since: github.createdAt ? github.createdAt.slice(0, 4) : null,
      }
    : null;

const leaderborderView = (stats) =>
  stats
    ? {
        tokensAllTime: formatCompact(stats.tokensAllTime),
        tokensAllTimeFull: formatCount(stats.tokensAllTime),
        players: formatCount(stats.players),
        tokensThisWeek: stats.suppressed ? null : formatCompact(stats.tokensThisWeek),
        activeThisWeek: stats.suppressed ? null : formatCount(stats.activeThisWeek),
        suppressed: stats.suppressed !== false,
        minGroup: formatCount(stats.minGroup),
      }
    : null;

export const liveView = (payload, now = Date.now()) => ({
  github: githubView(payload?.github ?? null, now),
  leaderborder: leaderborderView(payload?.leaderborder ?? null),
});

export const needleAngle = (pointer, origin, max = 60) => {
  const degrees = (Math.atan2(pointer.x - origin.x, origin.y - pointer.y) * 180) / Math.PI;
  return Math.round(Math.max(-max, Math.min(max, degrees)));
};
