export const siteName = "Quantitative Finance Club @ UCF";
export const siteUrl = "https://quantucf.com";
export const defaultDescription =
  "Quantitative Finance Club @ UCF gives students a place to explore financial markets through mathematics, statistics, programming, and research.";
export const defaultSocialImage = "/og-image.png";
export const defaultSocialImageAlt =
  "Quantitative Finance Club @ UCF logo on a black background";

export function absoluteUrl(pathname: string) {
  return new URL(pathname, siteUrl).toString();
}
