export const clubTimeZone = "America/New_York";

export const contentTopics = [
  "Asset Pricing",
  "Backtesting",
  "Club News",
  "Derivatives",
  "Econometrics",
  "Factors",
  "Fixed Income",
  "Liquidity",
  "Machine Learning",
  "Macro",
  "Market Microstructure",
  "Markets",
  "Modeling",
  "Options",
  "Portfolio Construction",
  "Risk",
  "Simulation",
  "Statistics",
  "Time Series",
  "Volatility",
] as const;

export type ContentTopic = (typeof contentTopics)[number];

export function formatLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
