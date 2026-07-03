import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trees, Music, Palette, Users, X } from "lucide-react";
import { useScrollLock } from "@/hooks/use-scroll-lock";

type CulturalProgramsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const programs = [
  {
    id: "agriculture",
    title: "Agricultural Arts",
    desc: "Connecting Farming and Creativity",
    icon: Trees,
    details:
      "Our agricultural arts program brings together local farmers and artists to create installations and events.",
    list: [
      "Farm-to-Table Theater",
      "Harvest Festivals",
      "Agricultural Sculpture Garden",
      "Community Workshops",
      "Rural Artist Residency",
    ],
  },
  {
    id: "music",
    title: "Music",
    desc: "Elevating Local Musical Talent",
    icon: Music,
    details:
      "We provide platforms for emerging musicians and performers to showcase their talents.",
    list: [
      "Monthly Concert Series",
      "Music Education Programs",
      "International Collaborations",
      "Recording Studio Access",
      "Annual Music Festival",
    ],
  },
  {
    id: "urban",
    title: "Urban Art",
    desc: "Beautifying Urban Spaces",
    icon: Palette,
    details:
      "Our urban art initiatives transform neglected spaces into vibrant community assets.",
    list: [
      "Public Mural Projects",
      "Street Art Installations",
      "Graffiti-to-Gallery Development",
      "Community Art Walks",
      "Urban Artisan Markets",
    ],
  },
  {
    id: "community",
    title: "Community Programs",
    desc: "Empowering Voices Through Community Engagement",
    icon: Users,
    details:
      "Our community programs provide a platform for local stories and cultural preservation.",
    list: [
      "Theater Workshops",
      "Original Community Plays",
      "Youth Programs",
      "Multilingual Performances",
      "Traveling Theater Troupe",
    ],
  },
];

export const CulturalProgramsModal = ({
  isOpen,
  onClose,
}: CulturalProgramsModalProps) => {
  useScrollLock(isOpen);
  const [selectedProgram, setSelectedProgram] = useState(programs[0]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ overscrollBehavior: "contain" }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ overscrollBehavior: "contain" }}
          >
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4 md:p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-3xl font-bold">
                  Our Cultural Programs
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-emerald-100 mt-2 text-sm md:text-base">
                Discover how we're transforming communities through art and
                culture
              </p>
            </div>
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-gray-50 p-4 md:p-6 border-r border-gray-200">
                <div className="space-y-2 md:space-y-3">
                  {programs.map((program) => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(program)}
                      className={`w-full text-left p-3 md:p-4 rounded-xl transition-all duration-200 ${
                        selectedProgram.id === program.id
                          ? "bg-white shadow-lg border-2 border-emerald-500 scale-105"
                          : "bg-gray-100 hover:bg-white hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <program.icon
                          size={18}
                          className={
                            selectedProgram.id === program.id
                              ? "text-emerald-600"
                              : "text-gray-600"
                          }
                        />
                        <span
                          className={`font-semibold text-sm md:text-base ${
                            selectedProgram.id === program.id
                              ? "text-emerald-700"
                              : "text-gray-700"
                          }`}
                        >
                          {program.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:w-2/3 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <selectedProgram.icon
                    size={20}
                    className="text-emerald-600"
                  />
                  <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-800">
                      {selectedProgram.title}
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      {selectedProgram.desc}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 mb-4 md:mb-6 leading-relaxed text-sm md:text-base">
                  {selectedProgram.details}
                </p>
                <div className="bg-emerald-50 rounded-xl p-4 md:p-6">
                  <h4 className="font-semibold text-emerald-800 mb-3 md:mb-4 text-base md:text-lg">
                    Program Highlights:
                  </h4>
                  <div className="space-y-2 md:space-y-3">
                    {selectedProgram.list.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 text-gray-700 text-sm md:text-base"
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 md:mt-6 flex flex-col sm:flex-row gap-3">
                  <Link to="/ong-culturelle">
                    <button className="bg-emerald-600 text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors text-sm md:text-base">
                      Learn More
                    </button>
                  </Link>
                  <Link to="/get-involved">
                    <button className="border border-emerald-600 text-emerald-600 px-4 md:px-6 py-2 rounded-lg font-semibold hover:bg-emerald-50 transition-colors text-sm md:text-base">
                      Get Involved
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CulturalProgramsModal;
