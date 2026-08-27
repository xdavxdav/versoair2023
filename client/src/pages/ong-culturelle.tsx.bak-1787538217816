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
                Partage des Cultures • Échange Mondial
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
            ONG Culturelle
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 text-center max-w-3xl mx-auto leading-relaxed font-medium"
          >
            Célébrer l'Afrique. Partager nos talents. Unir les cœurs à travers
            la culture, la musique et l'art.
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
              En ces temps de modernité et de mondialisation, nous rêvons d'un
              monde où les talents africains brillent sur la scène
              internationale. Où nos griots numériques racontent nos histoires.
              Où le tam-tam parle le même langage que le saxophone. Où les
              masques traditionnels côtoient les murs des galeries modernes.{" "}
              <span className="text-amber-400 font-semibold">
                C'est pas seulement du rêve—c'est notre mission.
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
                Nous mettons en lumière les talents cachés de nos terres—les
                musiciens des rues d'Abidjan, les sculpteurs des villages, les
                conteurs de nos ancêtres. Leurs créations? Elles voyagent
                maintenant vers New York, Paris, Toronto. L'Afrique danse sur
                les scènes du monde entier.
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
                Et nous ne sommes pas fermés. La guitare électrique, le piano
                classique, le saxophone blues—ces voix occidentales résonnent
                aussi chez nous. Nous apprenons, nous échangeons, nous
                fusionnons les rythmes. C'est un partage vrai, un vrai dialogue
                entre continents.
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
            Ce Que Nous Faisons
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
                desc: "Ahoko, tam-tam parleur, balafon, chekeré... Les voix ancestrales résonnent.",
                color: "from-amber-500 to-orange-500",
              },
              {
                icon: Palette,
                title: "Arts Plastiques",
                desc: "Peinture africaine, sculpture, masques sacrés. L'art qui parle sans mots.",
                color: "from-red-500 to-pink-500",
              },
              {
                icon: BookOpen,
                title: "Langues & Histoires",
                desc: "Apprentissage des langues africaines. Les griots du 21ème siècle racontent nos épopées.",
                color: "from-green-500 to-emerald-500",
              },
              {
                icon: Zap,
                title: "Gastronomie",
                desc: "Saveurs du continent. Du fufu au aloco, du attiéké aux mets canadiens.",
                color: "from-yellow-500 to-amber-500",
              },
              {
                icon: Globe,
                title: "Spectacles & Théâtre",
                desc: "Histoires de peuples sur scène. Drames, comédies, danses. Culture vivante.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: Users,
                title: "Concerts Mondiaux",
                desc: "Nos artistes chantent à New York, dansent à Paris. L'Afrique sur les meilleures scènes.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: Award,
                title: "Formations & Ateliers",
                desc: "Nous enseignons. Maîtrise du balafon, peinture sur toile, danse traditionnelle.",
                color: "from-indigo-500 to-blue-500",
              },
              {
                icon: Heart,
                title: "Échange Culturel",
                desc: "Deux voies. Afrique accueille West. West accueille Afrique. Fusion authentique.",
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
            Notre Histoire
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
                Voilà ce que nous croyons profondément. En Côte d'Ivoire, dans
                tout le continent africain, il existe une richesse
                incommensurable. Des mains qui sculptent le bois en
                chefs-d'œuvre. Des voix qui font danser la savane entière. Des
                histoires qui ont traversé mille générations sans jamais perdre
                leur magie.
              </p>

              <p>
                Mais voilà le problème :{" "}
                <span className="italic">personne ne les connaît.</span> Pendant
                ce temps, les talents africains se perdent. Les jeunes
                abandonnent le balafon pour suivre des rêves ailleurs. Les
                masques pourrissent dans les greniers. Les histoires meurent
                avec les grands-mères.
              </p>

              <p>
                <span className="text-amber-400 font-semibold">
                  Nous avons décidé de changer ça.
                </span>{" "}
                Pas avec des paroles creuses, mais avec de vraies actions. Nous
                avons créé cette ONG pour être le pont—le pont entre l'Afrique
                et le monde. Entre hier et demain. Entre la tradition et la
                modernité.
              </p>

              <p>
                Et ce n'est pas à sens unique. Nous croyons aussi à l'échange
                vrai. L'Occident a ses trésors aussi. Son classique, son jazz,
                sa cuisine, sa technologie. Nous accueillons tout cela les bras
                ouverts. Parce que le but n'est pas de conquérir—c'est de{" "}
                <span className="text-amber-400 font-semibold">
                  célébrer notre humanité commune.
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
            Notre Impact
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                number: "500+",
                label: "Talents Africains Soutenus",
                desc: "Musiciens, artistes, conteurs—tous bénéficient de nos programmes",
              },
              {
                number: "50+",
                label: "Concerts Mondiaux Organisés",
                desc: "De Lagos à Los Angeles, nos artistes se produisent sur les plus grandes scènes",
              },
              {
                number: "10,000+",
                label: "Personnes Éduquées",
                desc: "Langues, instruments, danses traditionnelles—nous transmettons le savoir",
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
                text: "Pas de clichés. Pas d'exotisme creux. Nous présentons la vraie culture, vivante et en évolution.",
              },
              {
                title: "Respect Mutuel",
                text: "Chaque culture est belle. Chaque voix compte. Nous écoutons autant que nous parlons.",
              },
              {
                title: "Excellence",
                text: "Nos artistes sont les meilleurs. Leurs œuvres sont impeccables. Le monde doit voir notre A-game.",
              },
              {
                title: "Accessibilité",
                text: "La culture n'est pas réservée aux riches. Nos programmes sont ouverts à tous, peu importe l'origine.",
              },
              {
                title: "Innovation",
                text: "Tradition + Modernité. Balafon + électronique. Nous honorons le passé en créant le futur.",
              },
              {
                title: "Impact Réel",
                text: "Chaque événement nourrit les artistes. Chaque atelier transforme une vie. Nous mesurons ce qui compte.",
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
