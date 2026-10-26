import React from "react";
import { Link } from "wouter";
import { useLanguage } from "@/components/LanguageSwitcher";

type Lang = "en" | "fr";
type GroupId = "founders" | "directors";

interface TeamMember {
  id: string;
  name: string;
  group: GroupId;
  focus: Record<Lang, readonly string[]>;
}

const GROUP_ORDER: readonly GroupId[] = ["founders", "directors"];

const teamMembers: readonly TeamMember[] = [
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
  },
  {
    id: "joel-vanga",
    name: "Joel Vanga",
    group: "founders",
    focus: {
      en: ["Digital business", "Technology"],
      fr: ["Affaires numériques", "Technologie"],
    },
  },
  {
    id: "kacou-phaully",
    name: "Kacou Phaully",
    group: "directors",
    focus: {
      en: ["Entertainment"],
      fr: ["Divertissement"],
    },
  },
  {
    id: "guillaume-henry-ackah",
    name: "Guillaume Henry Ackah",
    group: "directors",
    focus: {
      en: ["Construction", "Business relations"],
      fr: ["Bâtiment", "Relations d’affaires"],
    },
  },
];

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0][0];
}

const copy = {
  en: {
    badge: "Our leadership",
    heading: "The people leading VERSO\u00A0AIR\u00A0INC.",
    introduction:
      "Our launch is under way. We’re starting in Ontario, with the ambition to grow worldwide — come and meet the people making it happen.",
    status: {
      label: "Legal status at a glance",
      items: [
        "Incorporated in Ontario, Canada",
        "Ontario Corporation Number 1001767617",
        "Effective October 5, 2026",
        "Based in North York, Toronto",
      ],
      note: "Verifiable through the Ontario Business Registry.",
    },
    groups: { founders: "Co-founders", directors: "Co-directors" },
    roles: { founders: "Co-founder", directors: "Co-director" },
    focusLabel: "Areas of focus",
    learnMore: "Learn more about the company",
    sayHello: "Say hello",
  },
  fr: {
    badge: "Notre direction",
    heading: "Les personnes à la tête de VERSO\u00A0AIR\u00A0INC.",
    introduction:
      "Notre lancement est en cours. Nous démarrons en Ontario, avec l’ambition de nous développer à l’échelle mondiale — venez faire connaissance avec les personnes qui le rendent possible.",
    status: {
      label: "Statut juridique en bref",
      items: [
        "Société constituée en Ontario, Canada",
        "Numéro de société de l’Ontario 1001767617",
        "En vigueur depuis le 5 octobre 2026",
        "Établie à North York, Toronto",
      ],
      note: "Vérifiable auprès du registre des entreprises de l’Ontario.",
    },
    groups: { founders: "Cofondateurs", directors: "Co-directeurs" },
    roles: { founders: "Cofondateur", directors: "Co-directeur" },
    focusLabel: "Domaines d’intervention",
    learnMore: "En savoir plus sur l’entreprise",
    sayHello: "Écrivez-nous",
  },
} as const;

export function TeamSection({ showHeader = true }: { showHeader?: boolean }) {
  const { currentLang } = useLanguage();
  const lang: Lang = currentLang === "en" ? "en" : "fr";
  const text = copy[lang];

  return (
    <section
      data-testid="team-section"
      className="py-16 px-4 bg-gradient-to-tr from-[#bf831c] to-[#fff9e5] relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-48 translate-y-48"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {showHeader && (
          <div className="text-center mb-8 sm:mb-12 px-4 sm:px-0">
            <span className="inline-block px-3 sm:px-4 py-2 bg-amber-950/10 border border-amber-950/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium text-amber-950 mb-3 sm:mb-4">
              {text.badge}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-950 mb-4 sm:mb-6">
              {text.heading}
            </h2>
            <p
              data-testid="team-intro"
              className="text-sm sm:text-lg text-amber-950 max-w-3xl mx-auto leading-relaxed"
            >
              {text.introduction}
            </p>

            <div
              data-testid="team-status"
              className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-950/15 bg-white/40 px-4 py-4 backdrop-blur-sm sm:px-6"
            >
              <p
                id="team-status-label"
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-950 sm:text-xs"
              >
                {text.status.label}
              </p>
              <ul
                aria-labelledby="team-status-label"
                className="flex flex-wrap justify-center gap-1.5 sm:gap-2"
              >
                {text.status.items.map((item) => (
                  <li
                    key={item}
                    data-testid="team-status-item"
                    className="rounded-full border border-amber-950/20 bg-amber-950/10 px-2.5 py-1 text-[11px] font-medium text-amber-950 sm:text-xs"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p
                data-testid="team-status-note"
                className="mt-3 text-xs text-amber-950"
              >
                {text.status.note}
              </p>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-8 sm:space-y-10">
          {GROUP_ORDER.map((group) => (
            <div key={group} data-testid="team-group" data-group={group}>
              <h3
                data-testid="team-group-heading"
                className="mb-4 sm:mb-5 flex items-center gap-3 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-amber-950"
              >
                <span aria-hidden="true" className="h-px flex-1 bg-amber-950/30" />
                {text.groups[group]}
                <span aria-hidden="true" className="h-px flex-1 bg-amber-950/30" />
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                {teamMembers
                  .filter((member) => member.group === group)
                  .map((member) => (
                    <Link key={member.id} href="/contact" className="block h-full">
                      <div
                        data-testid="team-member"
                        data-member-id={member.id}
                        className="group h-full bg-white/40 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-amber-950/15 shadow-sm hover:bg-white/60 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative cursor-pointer text-center"
                      >
                        {/* Names and initials are never translated (Google Translate rewrites them) */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-950 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center group-hover:bg-amber-900 transition-colors duration-300">
                          <span
                            translate="no"
                            className="notranslate text-lg sm:text-2xl font-bold text-amber-50"
                          >
                            {initials(member.name)}
                          </span>
                        </div>

                        <h4
                          translate="no"
                          className="notranslate text-lg sm:text-xl font-bold text-amber-950 mb-1"
                        >
                          {member.name}
                        </h4>
                        <p
                          data-testid="team-role"
                          className="text-amber-950 font-semibold text-sm"
                        >
                          {text.roles[group]}
                        </p>

                        <ul
                          aria-label={text.focusLabel}
                          className="mt-3 flex flex-wrap justify-center gap-1.5 sm:gap-2"
                        >
                          {member.focus[lang].map((area) => (
                            <li
                              key={area}
                              data-testid="team-tag"
                              className="rounded-full border border-amber-950/20 bg-amber-950/10 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-amber-950"
                            >
                              {area}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Calls to action */}
        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/about"
            data-testid="team-cta-about"
            className="group inline-flex items-center gap-2 rounded-full bg-amber-950 px-6 py-3 font-medium text-amber-50 transition-colors duration-300 hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-950 focus-visible:ring-offset-2"
          >
            <span>{text.learnMore}</span>
            <svg
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
          <Link
            href="/contact"
            data-testid="team-cta-contact"
            className="inline-flex items-center rounded-full border border-amber-950/40 bg-white/40 px-6 py-3 font-medium text-amber-950 transition-colors duration-300 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-950 focus-visible:ring-offset-2"
          >
            {text.sayHello}
          </Link>
        </div>
      </div>
    </section>
  );
}
