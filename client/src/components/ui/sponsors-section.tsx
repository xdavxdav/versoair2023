import React from "react";
import { Link } from "wouter";
import { Building2 } from "lucide-react";

const sponsors: { name: string; category: string }[] = [];

export function SponsorsSection({
  showHeader = true,
}: {
  showHeader?: boolean;
}) {
  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        {showHeader && (
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Partenaires à venir
            </h2>
            <p className="text-sm sm:text-lg text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              Aucun partenaire ou sponsor n’est confirmé pour affichage. Ces
              espaces seront mis à jour lorsque les ententes seront confirmées.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-center">
          {sponsors.map((sponsor, index) => (
            <Link key={index} href="/contact">
              <div className="group flex flex-col items-center p-3 sm:p-4 lg:p-6 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:scale-105 cursor-pointer">
                {/* Logo Container */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-lg border border-gray-100 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 group-hover:shadow-lg transition-shadow duration-300">
                  <Building2
                    aria-hidden="true"
                    className="h-8 w-8 text-gray-400 sm:h-10 sm:w-10"
                  />
                </div>

                {/* Sponsor Info */}
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">
                    {sponsor.name}
                  </h3>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {sponsor.category}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Partnership Call to Action */}
        <div className="text-center mt-12 pt-8 border-t border-gray-100">
          <p className="mb-4 text-gray-600">
          Propositions de partenariat
          </p>
          <Link href="/contact">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
              <span>Devenir partenaire</span>
              <svg
                className="w-4 h-4"
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
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
