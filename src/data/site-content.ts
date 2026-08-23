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

export interface DuesOption {
  id: "semester" | "academic-year";
  label: string;
  priceLabel: string;
  href: string | null;
  featured?: boolean;
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

export const knightConnectLink: SiteLink = {
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

export const joinSocialLinks: SiteLink[] = [
  discordLink,
  instagramLink,
  linkedinLink,
];

export const duesOptions: DuesOption[] = [
  {
    id: "semester",
    label: "Fall 2026 Semester Dues",
    priceLabel: "$20",
    href: null,
  },
  {
    id: "academic-year",
    label: "2026–27 Academic Year Dues",
    priceLabel: "$35",
    href: null,
    featured: true,
  },
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
