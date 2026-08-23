export const siteName = "Quantitative Finance Club @ UCF";
export const siteUrl = "https://quantucf.com";
export const defaultDescription =
  "Quantitative Finance Club @ UCF is a student organization dedicated to quantitative finance.";
export const defaultSocialImage = "/og-image.png";
export const defaultSocialImageAlt =
  "Quantitative Finance Club @ UCF logo on a black background";

export function absoluteUrl(pathname: string) {
  return new URL(pathname, siteUrl).toString();
}
