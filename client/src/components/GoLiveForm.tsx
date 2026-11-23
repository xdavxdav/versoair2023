/**
 * Go Live Form — Modal for any signed-in user to host a listening session in TMU
 * Handles session title, description, start time, and published track selection
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Mic2,
  Calendar,
  Clock,
  Music,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreateSession, useHostEligibility } from "@/hooks/use-create-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrackSelector } from "@/components/TrackSelector";
import { SESSION_LIMITS } from "@shared/listening-session";

/** The value a datetime-local input expects: local time, one hour from now, to the minute. */
function defaultStartTime(): string {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

interface GoLiveFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: number) => void;
}

export function GoLiveForm({ isOpen, onClose, onSuccess }: GoLiveFormProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);
  const [step, setStep] = useState<"details" | "tracks" | "confirm">("details");

  const { data: eligibility, isLoading: eligibilityLoading } = useHostEligibility(isOpen && !!user);
  const canHost = !!user && (eligibility?.canHost ?? true);
  const createSession = useCreateSession();

  const submit = () => {
    if (!title.trim()) return toast({ title: "Session title is required", variant: "destructive" });
    if (selectedTracks.length === 0) {
      return toast({ title: "Select at least one track", variant: "destructive" });
    }
    const startDate = new Date(startTime);
    if (!Number.isFinite(startDate.getTime()) || startDate.getTime() < Date.now()) {
      return toast({ title: "Start time must be in the future", variant: "destructive" });
    }

    createSession.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        startsAt: startDate,
        trackIds: selectedTracks,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Live session scheduled",
            description: `"${title.trim()}" starts ${startDate.toLocaleString()}`,
          });
          onSuccess?.(data.session.id);
          handleClose();
        },
        onError: (error) => {
          toast({
            title: "Could not create the session",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setSelectedTracks([]);
    setStep("details");
    onClose();
  };

  if (!isOpen) return null;

  if (eligibilityLoading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    );
  }

  if (!canHost) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#180d34]/95 border border-purple-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden backdrop-blur-xl"
          >
            <div className="p-6 flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-purple-500/20 border border-purple-400/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-fuchsia-300" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Sign In Required
              </h2>
              <p className="text-slate-300 text-sm mb-6">
                Sign in to your VersoAir account to host a live listening session with any published track on TMU.
              </p>
              <Button
                onClick={handleClose}
                className="bg-purple-500/20 border border-purple-400/35 text-purple-100 hover:bg-purple-500/30"
              >
                Got it
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#130928]/95 border border-purple-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88dvh] overflow-y-auto backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 bg-[#130928]/95 backdrop-blur border-b border-purple-500/25 px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <Mic2 className="w-5 h-5 text-fuchsia-400" />
              <h2 className="text-xl font-bold text-white">Go Live on TMU</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Step: Session Details */}
            {step === "details" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Evening Jazz Session, Late Night Beats"
                    className="w-full px-3 py-2 bg-[#090418] border border-purple-500/25 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-400/60 focus:outline-none transition-colors"
                    maxLength={SESSION_LIMITS.titleMax}
                  />
                  <p className="text-xs text-slate-400 mt-1 tabular-nums">
                    {title.length}/{SESSION_LIMITS.titleMax}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell your listeners what to expect..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#090418] border border-purple-500/25 rounded-xl text-white placeholder-slate-500 focus:border-fuchsia-400/60 focus:outline-none transition-colors resize-none"
                    maxLength={SESSION_LIMITS.descriptionMax}
                  />
                  <p className="text-xs text-slate-400 mt-1 tabular-nums">
                    {description.length}/{SESSION_LIMITS.descriptionMax}
                  </p>
                </div>

                {/* Start Time */}
                <div>
                  <label className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-300" /> Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-[#090418] border border-purple-500/25 rounded-xl text-white focus:border-fuchsia-400/60 focus:outline-none transition-colors"
                  />
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => setStep("tracks")}
                  disabled={!title.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold py-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Music
                </Button>
              </motion.div>
            )}

            {/* Step: Select Tracks */}
            {step === "tracks" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-white font-semibold mb-3">Select Tracks</h3>
                  <p className="text-slate-300 text-sm mb-4">
                    Choose from any published track in the TMU catalogue.
                  </p>
                  <TrackSelector
                    selectedTracks={selectedTracks}
                    onTracksChange={setSelectedTracks}
                    maxTracks={50}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-purple-500/20">
                  <Button
                    onClick={() => setStep("details")}
                    variant="outline"
                    className="flex-1 border-purple-500/30 bg-transparent text-slate-200 hover:bg-purple-500/15"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={selectedTracks.length === 0}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 disabled:bg-white/20 disabled:text-white/40 text-white font-semibold"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step: Confirm */}
            {step === "confirm" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Summary */}
                <Card className="bg-[#090418]/80 border-purple-500/25 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Title</p>
                    <p className="text-white font-semibold">{title}</p>
                  </div>
                  {description && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide">Description</p>
                      <p className="text-slate-200 text-sm">{description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Starts</p>
                    <p className="text-white tabular-nums">
                      {new Date(startTime).toLocaleString()}
                    </p>
                  </div>
                </Card>

                {/* Ready Badge */}
                <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3">
                  <CheckCircle className="w-4 h-4" />
                  Listening party ready to broadcast
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep("details")}
                    variant="outline"
                    disabled={createSession.isPending}
                    className="flex-1 border-purple-500/30 bg-transparent text-slate-200 hover:bg-purple-500/15"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={createSession.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {createSession.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {createSession.isPending ? "Creating..." : "Go Live"}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default GoLiveForm;
