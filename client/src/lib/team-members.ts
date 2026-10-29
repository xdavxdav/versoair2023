export type TeamLanguage = "en" | "fr";
export type TeamGroupId = "founders" | "directors";

export interface TeamMember {
  id: string;
  name: string;
  group: TeamGroupId;
  focus: Record<TeamLanguage, readonly string[]>;
  linkedin: string;
}

export const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    id: "boussou-elvis-jonathan",
    name: "Boussou Elvis Jonathan",
    group: "founders",
    focus: {
      en: [
        "Construction",
        "Business relations",
        "Field operations",
        "B2B / B2C commercial actions",
      ],
      fr: [
        "Bâtiment",
        "Relations d’affaires",
        "Opérations terrain",
        "Actions commerciales B2B / B2C",
      ],
    },
    linkedin: "https://www.linkedin.com/in/jonathan-elvis-boussou-9762a3b3/",
  },
  {
    id: "joel-vanga",
    name: "Joel Vanga",
    group: "founders",
    focus: {
      en: ["Digital business", "Technology"],
      fr: ["Affaires numériques", "Technologie"],
    },
    linkedin: "https://www.linkedin.com/in/joel-vanga-5b755b185/",
  },
  {
    id: "kacou-phaully",
    name: "Kacou Phaully",
    group: "directors",
    focus: {
      en: ["Entertainment"],
      fr: ["Divertissement"],
    },
    linkedin: "https://www.linkedin.com/in/kacou-phaully/",
  },
  {
    id: "guillaume-henry-ackah",
    name: "Guillaume Henry Ackah",
    group: "directors",
    focus: {
      en: ["Construction", "Business relations"],
      fr: ["Bâtiment", "Relations d’affaires"],
    },
    linkedin:
      "https://www.linkedin.com/in/amon-guillaume-henri-ackah-b259501b7/",
  },
];

export function getTeamMember(id: string | null | undefined) {
  return TEAM_MEMBERS.find((member) => member.id === id);
}
