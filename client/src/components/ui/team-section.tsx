import React from "react";
import { Link } from "wouter";

interface TeamMember {
  name: string;
  role: string;
  department: string;
}

const teamMembers: (TeamMember & { id: string })[] = [
  {
    id: "sarah-johnson",
    name: "Sarah Johnson",
    role: "Directrice générale",
    department: "Direction exécutive",
  },
  {
    id: "michael-chen",
    name: "Michael Chen",
    role: "Directeur technique",
    department: "Ingénierie",
  },
  {
    id: "emma-rodriguez",
    name: "Emma Rodriguez",
    role: "Directrice marketing",
    department: "Marketing",
  },
  {
    id: "david-kim",
    name: "David Kim",
    role: "VP Succès client",
    department: "Succès client",
  },
];

export function TeamSection({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <section className="py-16 px-4 bg-gradient-to-tr from-[#bf831c] to-[#fff9e5] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl transform -translate-x-48 -translate-y-48"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-48 translate-y-48"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {showHeader && (
          <div className="text-center mb-8 sm:mb-12 px-4 sm:px-0">
            <span className="inline-block px-3 sm:px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium text-white mb-3 sm:mb-4">
              Notre équipe
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
              Rencontrez nos experts
            </h2>
            <p className="text-sm sm:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
              Notre équipe dédiée de professionnels en analytique et d'experts
              sectoriels travaille ensemble pour offrir des solutions complètes
              d'intelligence d'affaires qui stimulent la croissance et
              l'innovation dans tous les secteurs.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {teamMembers.map((member, index) => (
            <Link key={index} href={`/team/${member.id}`}>
              <div className="group bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl relative cursor-pointer">
                {/* Avatar Placeholder */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <span className="text-lg sm:text-2xl font-bold text-white">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>

                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 group-hover:text-white transition-colors duration-300">
                    {member.name}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-white/90 font-medium text-xs sm:text-sm">
                      {member.role}
                    </p>
                    <p className="text-white/70 text-xs hidden sm:block">
                      {member.department}
                    </p>
                  </div>
                </div>

                {/* Hover Effect Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to action */}
        <div className="text-center mt-12">
          <Link href="/signin">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors duration-300 cursor-pointer group">
              <span className="font-medium">Rejoignez notre équipe</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
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
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
