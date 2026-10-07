import { motion } from "framer-motion";
import {
  Music,
  Palette,
  Globe,
  Users,
  Zap,
  Heart,
  Award,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";

export default function OngCulturelle() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[95vw] mx-auto z-10">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center mb-4"
          >
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
              <div className="w-2 h-2 bg-amber-400 rounded-full" />
              <span className="text-amber-300 text-sm font-medium">
                Vision à venir • vHeartz
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 text-center leading-tight"
          >
            Vision culturelle de vHeartz
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 text-center max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Une vision en préparation pour célébrer les cultures, partager les
            talents et créer des échanges autour de la musique et de l'art.
          </motion.p>
        </div>
      </section>

      {/* The Vision Section */}
      <section className="py-20 px-4 bg-slate-800/30 border-y border-slate-700">
        <div className="max-w-[95vw] mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center">
              Notre Rêve
            </h2>
            <p className="text-lg text-slate-300 leading-relaxed max-w-4xl mx-auto text-center">
              vHeartz est en préparation. Sa vision est celle d'un monde où les
              talents et les cultures se rencontrent, où les histoires se
              partagent et où les formes artistiques dialoguent au-delà des
              frontières.{" "}
              <span className="text-amber-400 font-semibold">
                Les initiatives et le calendrier seront annoncés lorsqu'ils
                seront confirmés.
              </span>
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 gap-8"
          >
            <motion.div
              variants={staggerItem}
              className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border border-amber-500/30 p-8 rounded-xl"
            >
              <h3 className="text-2xl font-bold text-amber-400 mb-4">
                De l'Afrique vers le Monde
              </h3>
              <p className="text-slate-300 leading-relaxed">
                Une ambition future : mettre en lumière des musiciens, des
                artistes, des artisans et des conteurs, et créer des occasions
                de partager leurs œuvres avec de nouveaux publics.
              </p>
            </motion.div>

            <motion.div
              variants={staggerItem}
              className="bg-gradient-to-br from-blue-900/40 to-cyan-900/30 border border-blue-500/30 p-8 rounded-xl"
            >
              <h3 className="text-2xl font-bold text-blue-400 mb-4">
                L'Occident partage aussi
              </h3>
              <p className="text-slate-300 leading-relaxed">
                La vision prévoit aussi des échanges entre traditions et
                pratiques artistiques de différentes régions. Les formats et
                collaborations restent à définir.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="py-20 px-4">
        <div className="max-w-[95vw] mx-auto">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-4xl md:text-5xl font-bold text-white mb-16 text-center"
          >
            Pistes Culturelles Envisagées
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                icon: Music,
                title: "Musique Traditionnelle",
                desc: "Des idées pour faire découvrir les instruments et traditions musicales.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: Palette,
                title: "Arts Plastiques",
                desc: "Un intérêt pour la peinture, la sculpture et les arts visuels.",
                color: "from-red-500 to-pink-500",
              },
              {
                icon: BookOpen,
                title: "Langues & Histoires",
                desc: "Des pistes de valorisation des langues et de la transmission orale.",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Zap,
                title: "Gastronomie",
                desc: "La gastronomie comme possible vecteur de découverte et de dialogue.",
                color: "from-yellow-500 to-amber-500",
              },
              {
                icon: Globe,
                title: "Spectacles & Théâtre",
                desc: "Des formats scéniques et narratifs à explorer ultérieurement.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Users,
                title: "Concerts Mondiaux",
                desc: "D'éventuelles rencontres artistiques, sous réserve de programmes confirmés.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Award,
                title: "Formations & Ateliers",
                desc: "Des ateliers pourraient être envisagés si un programme est lancé.",
                color: "from-indigo-500 to-blue-500",
              },
              {
                icon: Heart,
                title: "Échange Culturel",
                desc: "Un dialogue culturel réciproque, à définir avec les communautés concernées.",
                color: "from-rose-500 to-red-500",
              },
            ].map((pillar, idx) => (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-xl p-6 bg-slate-800/50 border border-slate-700 hover:border-white/30 transition-all duration-300"
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${pillar.color} transition-opacity duration-300`}
                />

                <div className="relative z-10">
                  <pillar.icon
                    className={`h-8 w-8 mb-4 text-white group-hover:scale-110 transition-transform`}
                  />
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The Story Section */}
      <section className="py-20 px-4 bg-slate-800/30 border-y border-slate-700">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-4xl md:text-5xl font-bold text-white mb-12 text-center"
          >
            Notre Vision
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="space-y-8"
          >
            <motion.div
              variants={staggerItem}
              className="text-lg text-slate-300 leading-relaxed space-y-4"
            >
              <p>
                <span className="text-amber-400 font-semibold">
                  "La culture, c'est notre force."
                </span>{" "}
                Cette conviction guide la réflexion de vHeartz : les cultures,
                les arts et les histoires méritent d'être partagés avec soin,
                dans le respect de leurs créateurs et de leurs communautés.
              </p>

              <p>
                Les formats, les partenaires et les communautés concernées
                restent à déterminer. Aucune activité ni aucun programme
                culturel n'est annoncé à ce stade.
              </p>

              <p>
                <span className="text-amber-400 font-semibold">
                  vHeartz est une organisation en préparation.
                </span>{" "}
                Sa vision est de favoriser, à terme, des échanges entre
                patrimoine, création contemporaine et communautés.
              </p>

              <p>
                Cette vision repose sur un échange réciproque entre différentes
                traditions et pratiques artistiques. Les modalités restent à
                définir, avec le respect mutuel comme principe central.{" "}
                <span className="text-amber-400 font-semibold">
                  L'objectif reste de célébrer notre humanité commune.
                </span>
              </p>

              <p className="text-amber-300 font-semibold text-xl pt-4">
                "Là où il y a de la musique, il y a de l'espoir. Là où il y a du
                partage, il y a de la paix."
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 px-4">
        <div className="max-w-[95vw] mx-auto">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-4xl md:text-5xl font-bold text-white mb-16 text-center"
          >
            Suivi d'Impact (à venir)
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              // TODO(pending-verification): impact figures must come from
              // verified program data before public promotion.
              {
                number: "—",
                label: "Soutien aux créateurs",
                desc: "Aucun programme n'est actuellement annoncé",
              },
              {
                number: "—",
                label: "Événements culturels",
                desc: "Aucun événement n'est actuellement annoncé",
              },
              {
                number: "—",
                label: "Initiatives éducatives",
                desc: "Aucun programme n'est actuellement annoncé",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="text-center p-8 rounded-xl bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-500/30 hover:border-amber-500/60 transition-colors"
              >
                <div className="text-4xl md:text-5xl font-bold text-amber-400 mb-2">
                  {stat.number}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {stat.label}
                </h3>
                <p className="text-slate-400 text-sm">{stat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 bg-slate-800/30 border-y border-slate-700">
        <div className="max-w-[95vw] mx-auto">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-4xl md:text-5xl font-bold text-white mb-16 text-center"
          >
            Nos Valeurs
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 gap-8"
          >
            {[
              {
                title: "Authenticité",
                text: "Présenter les cultures avec authenticité, précision et respect.",
              },
              {
                title: "Respect Mutuel",
                text: "Écouter les communautés et encourager un échange réciproque.",
              },
              {
                title: "Excellence",
                text: "Valoriser la qualité, le soin et le travail des créateurs.",
              },
              {
                title: "Accessibilité",
                text: "Explorer des formats accessibles si et quand des programmes seront lancés.",
              },
              {
                title: "Innovation",
                text: "Faire dialoguer patrimoine et pratiques contemporaines.",
              },
              {
                title: "Impact Responsable",
                text: "Tout impact futur devra reposer sur des programmes confirmés et des résultats vérifiables.",
              },
            ].map((value, idx) => (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="p-6 rounded-xl bg-slate-900/50 border border-slate-700 hover:border-amber-500/50 transition-colors"
              >
                <h3 className="text-xl font-bold text-amber-400 mb-3">
                  {value.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">{value.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="relative p-12 rounded-2xl bg-gradient-to-br from-amber-600/20 via-orange-600/10 to-red-600/20 border border-amber-500/30 backdrop-blur-sm overflow-hidden text-center"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Rejoins le Mouvement
              </h2>
              <p className="text-slate-300 mb-8 text-lg">
                Que tu sois artiste, mécène, ou simplement quelqu'un qui aime la
                culture—il y a une place pour toi ici. Ensemble, nous montrons
                au monde ce qu'Africa peut offrir.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/get-involved">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-amber-500/50 transition-all">
                    S'Impliquer Maintenant
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    variant="outline"
                    className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 font-semibold py-3 px-8 rounded-lg"
                  >
                    Nous Contacter
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
