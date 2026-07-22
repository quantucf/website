export type SiteIcon =
  | "calendar"
  | "clock"
  | "discord"
  | "email"
  | "external"
  | "github"
  | "globe"
  | "instagram"
  | "linkedin"
  | "location"
  | "university";

export interface SiteLink {
  label: string;
  href: string;
  icon: SiteIcon;
}

const instagramLink: SiteLink = {
  label: "Instagram",
  href: "https://www.instagram.com/quantucf/",
  icon: "instagram",
};

const linkedinLink: SiteLink = {
  label: "LinkedIn",
  href: "https://www.linkedin.com/company/quantucf/",
  icon: "linkedin",
};

const githubLink: SiteLink = {
  label: "GitHub",
  href: "https://github.com/quantucf/",
  icon: "github",
};

const knightConnectLink: SiteLink = {
  label: "KnightConnect",
  href: "https://knightconnect.campuslabs.com/engage/organization/quantativefinanceclub",
  icon: "university",
};

const discordLink: SiteLink = {
  label: "Discord",
  href: "https://discord.gg/5rAzsYDT9e",
  icon: "discord",
};

export const contactEmail = "info@quantucf.com";

export const joinChannels: SiteLink[] = [
  knightConnectLink,
  discordLink,
  instagramLink,
  linkedinLink,
  githubLink,
];

export const footerSocialLinks: SiteLink[] = [
  knightConnectLink,
  discordLink,
  instagramLink,
  linkedinLink,
  githubLink,
];

export const footerEmailLink: SiteLink = {
  label: contactEmail,
  href: `mailto:${contactEmail}`,
  icon: "email",
};
