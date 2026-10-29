export type PartnershipSponsorLanguage = "en" | "fr";

interface PartnershipSponsorCopy {
  eyebrow: string;
  heading: string;
  introduction: string;
  partnershipTitle: string;
  partnershipDescription: string;
  discussionLabel: string;
  discussionTopics: readonly string[];
  partnershipCta: string;
  partnershipSubject: string;
  sponsorStatus: string;
  sponsorTitle: string;
  sponsorDescription: string;
  mentoringExamples: readonly string[];
  sponsorDisclaimer: string;
  sponsorPageLink: string;
}

const COPY: Record<PartnershipSponsorLanguage, PartnershipSponsorCopy> = {
  en: {
    eyebrow: "Partnerships now · Sponsorship later",
    heading: "Let’s build meaningful partnerships",
    introduction:
      "Verso Air is currently focused on establishing practical partnerships. No partner is listed as confirmed yet.",
    partnershipTitle: "Start a partnership conversation",
    partnershipDescription:
      "We’re open to discussing potential ways to collaborate and build together. Scope and terms would be agreed before any work begins.",
    discussionLabel: "Possible conversation starters",
    discussionTopics: [
      "Product and technology collaboration",
      "Business and market connections",
      "Creative and community initiatives",
    ],
    partnershipCta: "Discuss a partnership",
    partnershipSubject: "Partnership inquiry",
    sponsorStatus: "Illustrative future sample · Not currently open",
    sponsorTitle: "What could sponsor-funded mentoring mean?",
    sponsorDescription:
      "A future sponsor might contribute experienced mentors or expert-led sessions to help creators or entrepreneurs think through a practical challenge.",
    mentoringExamples: [
      "A mentor shares relevant experience and guidance.",
      "A session focuses on a specific question or business challenge.",
      "The audience, format, mentor availability, schedule, and budget are agreed in advance.",
    ],
    sponsorDisclaimer:
      "This is an example, not a current Verso Air program or sponsor offer. No mentoring cohort or participant applications are open.",
    sponsorPageLink: "Explore illustrative sponsorship concepts",
  },
  fr: {
    eyebrow: "Partenariats maintenant · Commandites plus tard",
    heading: "Bâtissons des partenariats utiles",
    introduction:
      "Verso Air se concentre actuellement sur l’établissement de partenariats concrets. Aucun partenaire n’est confirmé pour le moment.",
    partnershipTitle: "Parlons d’un partenariat",
    partnershipDescription:
      "Nous sommes ouverts à discuter de façons de collaborer et de construire ensemble. La portée et les conditions seraient convenues avant tout travail.",
    discussionLabel: "Quelques pistes de discussion",
    discussionTopics: [
      "Collaboration produit et technologique",
      "Relations d’affaires et accès au marché",
      "Initiatives créatives et communautaires",
    ],
    partnershipCta: "Discuter d’un partenariat",
    partnershipSubject: "Demande de partenariat",
    sponsorStatus: "Exemple illustratif pour l’avenir · Pas ouvert actuellement",
    sponsorTitle: "Que pourrait signifier un mentorat soutenu par un sponsor ?",
    sponsorDescription:
      "À l’avenir, un sponsor pourrait contribuer en mettant des mentors expérimentés ou des séances d’expertise à la disposition de créateurs ou d’entrepreneurs qui souhaitent réfléchir à un défi concret.",
    mentoringExamples: [
      "Un mentor partage son expérience et des conseils pertinents.",
      "Une séance porte sur une question précise ou un défi d’affaires.",
      "Le public visé, le format, la disponibilité des mentors, le calendrier et le budget sont convenus à l’avance.",
    ],
    sponsorDisclaimer:
      "Il s’agit d’un exemple, pas d’un programme ni d’une offre de commandite actuellement proposés par Verso Air. Aucun programme de mentorat ou appel à candidatures n’est ouvert.",
    sponsorPageLink: "Voir les concepts de commandite illustratifs",
  },
};

export function getPartnershipSponsorCopy(language: PartnershipSponsorLanguage) {
  return COPY[language];
}
