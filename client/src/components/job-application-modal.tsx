/**
 * JobApplicationModal — Multi-step "Indeed-style" application flow
 *
 * Steps:
 *  1. Review job + confirm personal info
 *  2. Cover letter + resume upload
 *  3. Review everything → Submit
 *  4. Confirmation screen
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building,
  User,
  Mail,
  FileText,
  Upload,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Star,
  Send,
  Shield,
  Phone,
  Linkedin,
  Globe,
  Award,
  Target,
  X,
} from "lucide-react";
import type { AuthUser } from "@/contexts/AuthContext";

/* ── Types ── */

export interface ApplicationJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary_min?: number;
  salary_max?: number;
  currency?: string;
  description?: string;
  requirements?: string[];
  skills?: string[];
  experience_level?: string;
  company_logo?: string;
  is_remote?: boolean;
}

interface ApplicationData {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  coverLetter: string;
  resumeFile: File | null;
  resumeFileName: string;
  additionalNotes: string;
  agreeToTerms: boolean;
}

interface JobApplicationModalProps {
  open: boolean;
  onClose: () => void;
  job: ApplicationJob | null;
  user: AuthUser;
  token: string;
  /** "careers" = blue/cyan theme, "contractors" = amber/orange theme */
  variant?: "careers" | "contractors";
  onSubmitSuccess?: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "";

/* ── Helpers ── */

function formatSalary(min?: number, max?: number, currency?: string): string {
  if ((!min && !max) || (min === 0 && max === 0)) return "Salary Negotiable";
  const cur = currency || "USD";
  try {
    const fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (min && !max) return `From ${fmt.format(min)}`;
    if (!min && max) return `Up to ${fmt.format(max)}`;
    return `${fmt.format(min!)} – ${fmt.format(max!)}`;
  } catch {
    if (min && max)
      return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
    return "Salary Negotiable";
  }
}

function formatJobType(t?: string): string {
  if (!t) return "Full Time";
  return t
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ── Component ── */

export function JobApplicationModal({
  open,
  onClose,
  job,
  user,
  token,
  variant = "careers",
  onSubmitSuccess,
}: JobApplicationModalProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appData, setAppData] = useState<ApplicationData>({
    fullName: user.name || "",
    email: user.email || "",
    phone: "",
    linkedin: "",
    portfolio: "",
    coverLetter: "",
    resumeFile: null,
    resumeFileName: "",
    additionalNotes: "",
    agreeToTerms: false,
  });

  /* theme colours */
  const isCareers = variant === "careers";
  const primary = isCareers
    ? "from-blue-600 to-cyan-600"
    : "from-amber-600 to-orange-600";
  const primaryHover = isCareers
    ? "hover:from-blue-700 hover:to-cyan-700"
    : "hover:from-amber-700 hover:to-orange-700";
  const accent = isCareers ? "text-blue-600" : "text-amber-600";
  const accentBg = isCareers ? "bg-blue-50" : "bg-amber-50";
  const accentBorder = isCareers ? "border-blue-200" : "border-amber-200";
  const accentRing = isCareers
    ? "focus-visible:ring-blue-500"
    : "focus-visible:ring-amber-500";
  const stepDot = isCareers ? "bg-blue-600" : "bg-amber-600";
  const stepDotInactive = "bg-gray-300";

  const update = useCallback(
    (patch: Partial<ApplicationData>) =>
      setAppData((prev) => ({ ...prev, ...patch })),
    [],
  );

  /* reset on close */
  const handleClose = () => {
    setStep(1);
    setSubmitted(false);
    setAppData({
      fullName: user.name || "",
      email: user.email || "",
      phone: "",
      linkedin: "",
      portfolio: "",
      coverLetter: "",
      resumeFile: null,
      resumeFileName: "",
      additionalNotes: "",
      agreeToTerms: false,
    });
    onClose();
  };

  /* validation per step */
  const canProceed = (): boolean => {
    if (step === 1)
      return appData.fullName.trim() !== "" && appData.email.trim() !== "";
    if (step === 2) return true; // cover letter & resume are optional
    if (step === 3) return appData.agreeToTerms;
    return true;
  };

  /* submit */
  const handleSubmit = async () => {
    if (!job) return;
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicant_name: appData.fullName,
          applicant_email: appData.email,
          applicant_phone: appData.phone,
          linkedin: appData.linkedin,
          portfolio: appData.portfolio,
          cover_letter: appData.coverLetter,
          resume_url: appData.resumeFileName || null,
          notes: appData.additionalNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Application failed");
      }

      setSubmitted(true);
      setStep(4);
      onSubmitSuccess?.();
    } catch (err: any) {
      // bubble error to caller via toast pattern
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return null;

  /* ── Step indicators ── */
  const steps = [
    { n: 1, label: "Job Details" },
    { n: 2, label: "Your Application" },
    { n: 3, label: "Review & Submit" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ── Header ── */}
        <div
          className={`bg-gradient-to-r ${primary} text-white p-6 rounded-t-lg`}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              {submitted ? (
                <>
                  <CheckCircle className="h-6 w-6" />
                  Application Submitted!
                </>
              ) : (
                <>
                  <Briefcase className="h-6 w-6" />
                  Apply for Position
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/80 mt-1">
              {submitted
                ? "Your application has been received"
                : `${job.title} at ${job.company}`}
            </DialogDescription>
          </DialogHeader>

          {/* step indicator */}
          {!submitted && (
            <div className="flex items-center gap-2 mt-4">
              {steps.map((s, i) => (
                <div key={s.n} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s.n
                        ? "bg-white text-gray-800"
                        : "bg-white/30 text-white/60"
                    }`}
                  >
                    {step > s.n ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      s.n
                    )}
                  </div>
                  <span
                    className={`text-sm hidden sm:inline ${
                      step >= s.n ? "text-white font-medium" : "text-white/50"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-8 h-0.5 ${
                        step > s.n ? "bg-white" : "bg-white/30"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="p-6">
          {/* ===== STEP 1: Job details + personal info ===== */}
          {step === 1 && (
            <div className="space-y-6">
              {/* job card */}
              <div
                className={`rounded-xl border ${accentBorder} ${accentBg} p-4`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${primary} flex items-center justify-center text-white font-bold text-xl shrink-0`}
                  >
                    {job.company_logo ? (
                      <img
                        src={job.company_logo}
                        alt=""
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      job.company?.charAt(0) || "C"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-lg text-gray-900">
                      {job.title}
                    </h3>
                    <p className={`${accent} font-medium`}>{job.company}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />{" "}
                        {formatJobType(job.type)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />{" "}
                        {formatSalary(
                          job.salary_min,
                          job.salary_max,
                          job.currency,
                        )}
                      </span>
                      {job.is_remote && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-700"
                        >
                          <Globe className="h-3 w-3 mr-1" /> Remote
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* skills */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {job.skills.slice(0, 6).map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-xs bg-white"
                      >
                        {s}
                      </Badge>
                    ))}
                    {job.skills.length > 6 && (
                      <Badge variant="outline" className="text-xs bg-white">
                        +{job.skills.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* personal info */}
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <User className="h-5 w-5" />
                  Your Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="app-name"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <User className="h-3.5 w-3.5" /> Full Name *
                    </Label>
                    <Input
                      id="app-name"
                      value={appData.fullName}
                      onChange={(e) => update({ fullName: e.target.value })}
                      placeholder="Your full name"
                      className={accentRing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="app-email"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Mail className="h-3.5 w-3.5" /> Email Address *
                    </Label>
                    <Input
                      id="app-email"
                      type="email"
                      value={appData.email}
                      onChange={(e) => update({ email: e.target.value })}
                      placeholder="your@email.com"
                      className={accentRing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="app-phone"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Phone className="h-3.5 w-3.5" /> Phone Number
                    </Label>
                    <Input
                      id="app-phone"
                      type="tel"
                      value={appData.phone}
                      onChange={(e) => update({ phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className={accentRing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="app-linkedin"
                      className="flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Linkedin className="h-3.5 w-3.5" /> LinkedIn Profile
                    </Label>
                    <Input
                      id="app-linkedin"
                      value={appData.linkedin}
                      onChange={(e) => update({ linkedin: e.target.value })}
                      placeholder="linkedin.com/in/yourprofile"
                      className={accentRing}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="app-portfolio"
                    className="flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Globe className="h-3.5 w-3.5" /> Portfolio / Website
                  </Label>
                  <Input
                    id="app-portfolio"
                    value={appData.portfolio}
                    onChange={(e) => update({ portfolio: e.target.value })}
                    placeholder="https://yourportfolio.com"
                    className={accentRing}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: Cover letter + resume ===== */}
          {step === 2 && (
            <div className="space-y-6">
              {/* cover letter */}
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5" />
                  Cover Letter
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Tell {job.company} why you're a great fit for this role.
                  Highlight relevant experience and what excites you about this
                  opportunity.
                </p>
                <Textarea
                  value={appData.coverLetter}
                  onChange={(e) => update({ coverLetter: e.target.value })}
                  placeholder={`Dear ${job.company} Hiring Team,\n\nI am excited to apply for the ${job.title} position...`}
                  className={`min-h-[200px] resize-y ${accentRing}`}
                />
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>
                    {appData.coverLetter.length > 0
                      ? `${appData.coverLetter.split(/\s+/).filter(Boolean).length} words`
                      : "Optional but recommended"}
                  </span>
                  <span>{appData.coverLetter.length} / 5000 characters</span>
                </div>
              </div>

              <Separator />

              {/* resume upload */}
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Upload className="h-5 w-5" />
                  Resume / CV
                </h4>
                <p className="text-sm text-gray-500 mb-3">
                  Upload your resume in PDF, DOC, or DOCX format (max 5 MB).
                </p>

                <label
                  htmlFor="resume-upload"
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    appData.resumeFile
                      ? `${accentBorder} ${accentBg}`
                      : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {appData.resumeFile ? (
                    <div className="flex items-center gap-3">
                      <FileText className={`h-8 w-8 ${accent}`} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {appData.resumeFileName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(appData.resumeFile.size / 1024 / 1024).toFixed(2)}{" "}
                          MB — Click to change
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Upload className="h-8 w-8" />
                      <span className="text-sm font-medium">
                        Click to upload or drag and drop
                      </span>
                      <span className="text-xs">PDF, DOC, DOCX up to 5 MB</span>
                    </div>
                  )}
                  <input
                    id="resume-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert("File must be under 5 MB");
                          return;
                        }
                        update({
                          resumeFile: file,
                          resumeFileName: file.name,
                        });
                      }
                    }}
                  />
                </label>
              </div>

              <Separator />

              {/* additional notes */}
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5" />
                  Additional Notes
                </h4>
                <Textarea
                  value={appData.additionalNotes}
                  onChange={(e) => update({ additionalNotes: e.target.value })}
                  placeholder="Anything else you'd like the employer to know? (e.g., availability, salary expectations, references)"
                  className={`min-h-[100px] resize-y ${accentRing}`}
                />
              </div>
            </div>
          )}

          {/* ===== STEP 3: Review ===== */}
          {step === 3 && (
            <div className="space-y-5">
              <div
                className={`rounded-xl border ${accentBorder} ${accentBg} p-4`}
              >
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5" />
                  Application Summary
                </h4>

                {/* job */}
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">
                    Position
                  </p>
                  <p className="font-semibold text-gray-900">{job.title}</p>
                  <p className={`text-sm ${accent}`}>{job.company}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </p>
                </div>

                <Separator className="my-3" />

                {/* applicant info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
                      Full Name
                    </p>
                    <p className="font-medium">{appData.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
                      Email
                    </p>
                    <p className="font-medium">{appData.email}</p>
                  </div>
                  {appData.phone && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
                        Phone
                      </p>
                      <p className="font-medium">{appData.phone}</p>
                    </div>
                  )}
                  {appData.linkedin && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
                        LinkedIn
                      </p>
                      <p className="font-medium truncate">{appData.linkedin}</p>
                    </div>
                  )}
                  {appData.portfolio && (
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">
                        Portfolio
                      </p>
                      <p className="font-medium truncate">
                        {appData.portfolio}
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-3" />

                {/* attachments */}
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span>
                      Cover Letter:{" "}
                      {appData.coverLetter
                        ? `${appData.coverLetter.split(/\s+/).filter(Boolean).length} words`
                        : "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span>
                      Resume: {appData.resumeFileName || "Not uploaded"}
                    </span>
                  </div>
                  {appData.additionalNotes && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-gray-500" />
                      <span>Additional notes included</span>
                    </div>
                  )}
                </div>
              </div>

              {/* terms checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={appData.agreeToTerms}
                  onChange={(e) => update({ agreeToTerms: e.target.checked })}
                  className={`mt-1 h-4 w-4 rounded border-gray-300 ${isCareers ? "text-blue-600 focus:ring-blue-500" : "text-amber-600 focus:ring-amber-500"}`}
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  I confirm that the information provided is accurate and I
                  authorize {job.company} to process my application. I
                  understand that my data will be handled in accordance with the
                  privacy policy.
                </span>
              </label>

              {/* security note */}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Shield className="h-4 w-4" />
                <span>
                  Your application is encrypted and securely transmitted. Your
                  data is never shared with third parties.
                </span>
              </div>
            </div>
          )}

          {/* ===== STEP 4: Confirmation ===== */}
          {step === 4 && submitted && (
            <div className="text-center py-8 space-y-4">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${primary} mx-auto flex items-center justify-center`}
              >
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                You're all set!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Your application for <strong>{job.title}</strong> at{" "}
                <strong>{job.company}</strong> has been submitted successfully.
                The hiring team will review your application and get back to
                you.
              </p>
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${accentBg} ${accent} text-sm font-medium`}
              >
                <Star className="h-4 w-4" />
                Application ID: {job.id.slice(0, 8).toUpperCase()}
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleClose}
                  className={`bg-gradient-to-r ${primary} ${primaryHover} text-white px-8`}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        {!submitted && (
          <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between rounded-b-lg">
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? handleClose() : setStep(step - 1))}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-2">
              {steps.map((s) => (
                <div
                  key={s.n}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s.n ? stepDot : stepDotInactive
                  }`}
                />
              ))}
            </div>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className={`gap-2 bg-gradient-to-r ${primary} ${primaryHover} text-white`}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || submitting}
                className={`gap-2 bg-gradient-to-r ${primary} ${primaryHover} text-white`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
