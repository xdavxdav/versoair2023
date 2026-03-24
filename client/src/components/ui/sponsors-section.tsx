import React from 'react';
import { Link } from 'wouter';

const sponsors = [
  {
    id: "techcorp",
    name: "TechCorp Solutions",
    logo: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    category: "Technologie"
  },
  {
    id: "global-consulting",
    name: "Global Consulting Group",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    category: "Conseil aux entreprises"
  },
  {
    id: "innovate-labs",
    name: "Innovate Labs",
    logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    category: "Recherche & Développement"
  },
  {
    id: "financial-dynamics",
    name: "Financial Dynamics Inc.",
    logo: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    category: "Services financiers"
  }
];

export function SponsorsSection({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section className="py-16 px-4 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        {showHeader && (
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              NOS PARTENAIRES
            </h2>
            <p className="text-sm sm:text-lg text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
              En partenariat avec les leaders du secteur pour offrir des solutions d'intelligence d'affaires de classe mondiale
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-center">
          {sponsors.map((sponsor, index) => (
            <Link key={index} href={`/sponsor/${sponsor.id}`}>
              <div className="group flex flex-col items-center p-3 sm:p-4 lg:p-6 rounded-xl hover:bg-gray-50 transition-all duration-300 hover:scale-105 cursor-pointer"
              >
              {/* Logo Container */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white rounded-lg border border-gray-100 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 group-hover:shadow-lg transition-shadow duration-300">
                <img
                  src={sponsor.logo}
                  alt={`${sponsor.name} logo`}
                  className="max-w-10 max-h-10 sm:max-w-12 sm:max-h-12 lg:max-w-16 lg:max-h-16 object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
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
          <p className="text-gray-600 mb-4">
            Intéressé par un partenariat avec nous ?
          </p>
          <Link href="/signin">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
              <span>Devenir partenaire</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}