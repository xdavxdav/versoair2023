import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Award,
  Briefcase,
  BookOpen,
  Star,
  MapPin,
  Mail,
  Linkedin,
  Github,
  Plus,
  ShoppingBag,
  Home,
  LogOut,
} from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";

interface UserProfile {
  id: number;
  name: string;
  title: string;
  avatar: string;
  coverImage: string;
  bio: string;
  location: string;
  email: string;
  expertise: string[];
  followers: number;
  following: number;
  rating: number;
  portfolio: { title: string; link: string; image: string }[];
  resume: {
    experience: {
      company: string;
      role: string;
      duration: string;
      description: string;
    }[];
    education: {
      school: string;
      degree: string;
      field: string;
      year: string;
    }[];
    skills: string[];
    certifications: string[];
  };
  social: { linkedin?: string; github?: string };
}

const mockUserProfile: UserProfile = {
  id: 1,
  name: "Sarah Chen",
  title: "Senior Product Manager & AI Specialist",
  avatar:
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=400&h=400&fit=crop",
  coverImage:
    "https://images.unsplash.com/photo-1557821552-17105176677c?ixlib=rb-4.0.3&w=1200&h=400&fit=crop",
  bio: "Passionate about building data-driven solutions. 8+ years in product management, specializing in AI/ML integration and business intelligence.",
  location: "San Francisco, CA",
  email: "sarah@verso.air",
  expertise: [
    "Product Management",
    "AI/ML",
    "Data Analytics",
    "Leadership",
    "Business Strategy",
  ],
  followers: 2845,
  following: 456,
  rating: 4.9,
  portfolio: [
    {
      title: "Analytics Dashboard",
      link: "#",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&w=300&h=200&fit=crop",
    },
    {
      title: "ML Pipeline",
      link: "#",
      image:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&w=300&h=200&fit=crop",
    },
  ],
  resume: {
    experience: [
      {
        company: "Tech Innovations Inc",
        role: "Senior Product Manager",
        duration: "2021 - Present",
        description:
          "Leading product strategy for enterprise AI solutions with 50+ team members",
      },
      {
        company: "DataFlow Systems",
        role: "Product Manager",
        duration: "2018 - 2021",
        description: "Developed analytics platforms serving 500+ enterprises",
      },
    ],
    education: [
      {
        school: "Stanford University",
        degree: "MBA",
        field: "Business Administration",
        year: "2018",
      },
      {
        school: "UC Berkeley",
        degree: "BS",
        field: "Computer Science",
        year: "2015",
      },
    ],
    skills: [
      "Product Management",
      "Data Analytics",
      "Machine Learning",
      "Python",
      "SQL",
      "Tableau",
      "Leadership",
      "Strategic Planning",
    ],
    certifications: [
      "Google Cloud Professional Data Engineer",
      "AWS Certified Solutions Architect",
      "Certified Scrum Product Owner",
    ],
  },
  social: {
    linkedin: "#",
    github: "#",
  },
};

export default function ProfilePage() {
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"portfolio" | "resume">(
    "portfolio",
  );
  const user = mockUserProfile;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-handstyle">
      {/* Scroll-Aware Navbar */}
      <ScrollableNavbar
        isAuthenticated={true}
        userName={user.name}
        onLogout={() => {
          // Handle logout
        }}
      />

      {/* Spacer for fixed navbar */}
      <div className="h-20" />

      {/* Back Button */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <motion.button
          onClick={() => window.history.back()}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-handstyle"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Community
        </motion.button>
      </div>

      {/* Cover Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-48 overflow-hidden"
      >
        <img
          src={user.coverImage}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950" />
      </motion.div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Avatar */}
          <motion.img
            src={user.avatar}
            alt={user.name}
            className="w-32 h-32 rounded-full border-4 border-slate-900 object-cover ring-2 ring-cyan-500/50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          />

          {/* Info */}
          <motion.div
            className="flex-1 pt-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-4xl font-bold text-white mb-1">{user.name}</h1>
            <p className="text-xl text-cyan-400 mb-3">{user.title}</p>

            <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {user.location}
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {user.rating} rating
              </div>
              <div className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                8+ years experience
              </div>
            </div>

            <p className="text-slate-300 mb-4 max-w-2xl">{user.bio}</p>

            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div>
                <p className="text-2xl font-bold text-cyan-400">
                  {user.followers.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Followers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {user.following}
                </p>
                <p className="text-xs text-slate-400">Following</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsFollowing(!isFollowing)}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                  isFollowing
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    : "bg-cyan-500 text-white hover:bg-cyan-600"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 text-slate-400 rounded-lg border border-white/10 hover:bg-white/10 transition-all font-medium"
              >
                <Mail className="w-4 h-4" />
                Message
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 text-slate-400 rounded-lg border border-white/10 hover:bg-white/10 transition-all font-medium"
              >
                <Download className="w-4 h-4" />
                Resume
              </motion.button>
            </div>
          </motion.div>

          {/* Social Links */}
          <div className="flex flex-col gap-3 pt-4">
            {user.social.linkedin && (
              <motion.a
                href={user.social.linkedin}
                whileHover={{ scale: 1.1 }}
                className="p-3 bg-white/5 rounded-lg hover:bg-blue-500/20 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-blue-400" />
              </motion.a>
            )}
            {user.social.github && (
              <motion.a
                href={user.social.github}
                whileHover={{ scale: 1.1 }}
                className="p-3 bg-white/5 rounded-lg hover:bg-slate-500/20 transition-colors"
              >
                <Github className="w-5 h-5 text-slate-300" />
              </motion.a>
            )}
          </div>
        </div>

        {/* Expertise Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h3 className="text-lg font-bold text-white mb-3">Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {user.expertise.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm border border-cyan-500/30"
              >
                {skill}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === "portfolio"
                ? "text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("resume")}
            className={`px-4 py-3 font-medium transition-all ${
              activeTab === "resume"
                ? "text-cyan-400 border-b-2 border-cyan-500"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Resume & Skills
          </button>
        </div>

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {user.portfolio.map((project, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05 }}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl mb-3 h-48">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {project.title}
                </h3>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Resume Tab */}
        {activeTab === "resume" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Experience */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                Experience
              </h3>
              <div className="space-y-4">
                {user.resume.experience.map((exp, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-lg p-4"
                  >
                    <h4 className="font-bold text-cyan-400">{exp.role}</h4>
                    <p className="text-sm text-slate-300">{exp.company}</p>
                    <p className="text-xs text-slate-500 mb-2">
                      {exp.duration}
                    </p>
                    <p className="text-sm text-slate-400">{exp.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Education & Skills */}
            <div className="space-y-8">
              {/* Education */}
              <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  Education
                </h3>
                <div className="space-y-3">
                  {user.resume.education.map((edu, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-3"
                    >
                      <h4 className="font-bold text-cyan-400">{edu.degree}</h4>
                      <p className="text-sm text-slate-300">{edu.school}</p>
                      <p className="text-xs text-slate-500">{edu.year}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  Certifications
                </h3>
                <ul className="space-y-2">
                  {user.resume.certifications.map((cert, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-slate-300 flex items-start gap-2"
                    >
                      <span className="text-cyan-400 mt-1">•</span>
                      {cert}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Skills */}
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold text-white mb-4">Skills</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {user.resume.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-center text-slate-300"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
