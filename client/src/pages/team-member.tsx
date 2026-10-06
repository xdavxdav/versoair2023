import { useRoute, Link } from "wouter";
import {
  Linkedin,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// TODO(pending-verification): replace John Doe placeholder profiles with
// verified team member details before public promotion. Photos, LinkedIn URLs,
// phone numbers, bios and achievements below are placeholders pending approval.
const teamMembers = {
  "sarah-johnson": {
    name: "John Doe",
    role: "Role pending confirmation",
    department: "Executive Leadership",
    image: "",
    bio: "Team member biography pending confirmation.",
    experience: "—",
    location: "Toronto, Canada",
    email: "support@versoair.com",
    phone: "Number pending",
    linkedin: "",
    joinDate: "—",
    achievements: ["Details pending confirmation"],
    expertise: ["Details pending confirmation"],
    education: "Details pending confirmation",
  },
  "michael-chen": {
    name: "John Doe",
    role: "Role pending confirmation",
    department: "Engineering",
    image: "",
    bio: "Team member biography pending confirmation.",
    experience: "—",
    location: "Toronto, Canada",
    email: "support@versoair.com",
    phone: "Number pending",
    linkedin: "",
    joinDate: "—",
    achievements: ["Details pending confirmation"],
    expertise: ["Details pending confirmation"],
    education: "Details pending confirmation",
  },
  "emma-rodriguez": {
    name: "John Doe",
    role: "Role pending confirmation",
    department: "Marketing",
    image: "",
    bio: "Team member biography pending confirmation.",
    experience: "—",
    location: "Toronto, Canada",
    email: "support@versoair.com",
    phone: "Number pending",
    linkedin: "",
    joinDate: "—",
    achievements: ["Details pending confirmation"],
    expertise: ["Details pending confirmation"],
    education: "Details pending confirmation",
  },
  "david-kim": {
    name: "John Doe",
    role: "Role pending confirmation",
    department: "Customer Success",
    image: "",
    bio: "Team member biography pending confirmation.",
    experience: "—",
    location: "Toronto, Canada",
    email: "support@versoair.com",
    phone: "Number pending",
    linkedin: "",
    joinDate: "—",
    achievements: ["Details pending confirmation"],
    expertise: ["Details pending confirmation"],
    education: "Details pending confirmation",
  },
};
export default function TeamMember() {
  const [, params] = useRoute("/team/:memberId");
  const memberParams = params as unknown as { memberId?: string } | null;
  const memberId = memberParams?.memberId ?? null;

  if (!memberId || !teamMembers[memberId as keyof typeof teamMembers]) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Team Member Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The team member you're looking for doesn't exist.
          </p>
          <Link href="/about">
            <Button className="bg-[#bf831c] hover:bg-[#a6701a] text-white">
              ← Back to Our Team
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const member = teamMembers[memberId as keyof typeof teamMembers];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <img
                src={member.image}
                alt={member.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold mb-2">{member.name}</h1>
                <p className="text-xl opacity-90 mb-2">{member.role}</p>
                <p className="text-lg opacity-75">{member.department}</p>
                <div className="flex items-center justify-center md:justify-start mt-4 space-x-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {member.location}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Joined {member.joinDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  About {member.name.split(" ")[0]}
                </h2>
                <p className="text-gray-600 leading-relaxed">{member.bio}</p>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Key Achievements
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {member.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#bf831c] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-600">{achievement}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expertise */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Areas of Expertise
                </h2>
                <div className="flex flex-wrap gap-3">
                  {member.expertise.map((skill, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-[#bf831c] text-white rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-[#bf831c]" />
                    <a
                      href={`mailto:${member.email}`}
                      className="text-gray-600 hover:text-[#bf831c] transition-colors"
                    >
                      {member.email}
                    </a>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-[#bf831c]" />
                    <a
                      href={`tel:${member.phone}`}
                      className="text-gray-600 hover:text-[#bf831c] transition-colors"
                    >
                      {member.phone}
                    </a>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Linkedin className="h-5 w-5 text-[#bf831c]" />
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-[#bf831c] transition-colors flex items-center"
                    >
                      LinkedIn Profile
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Experience</span>
                    <span className="font-semibold text-[#bf831c]">
                      {member.experience}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Department</span>
                    <span className="font-semibold text-gray-900">
                      {member.department}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Location</span>
                    <span className="font-semibold text-gray-900">
                      {member.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Education */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Education
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {member.education}
                </p>
              </div>

              {/* Connect */}
              <div className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">
                  Connect with {member.name.split(" ")[0]}
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Interested in learning more about{" "}
                  {member.department.toLowerCase()}? Connect directly through
                  LinkedIn.
                </p>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-white text-[#bf831c] hover:bg-gray-100">
                    <Linkedin className="mr-2 h-4 w-4" />
                    Connect on LinkedIn
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Back to Team */}
          <div className="text-center mt-12">
            <Link href="/about">
              <Button
                variant="outline"
                className="border-[#bf831c] text-[#bf831c] hover:bg-[#bf831c] hover:text-white"
              >
                ← Back to Our Team
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
