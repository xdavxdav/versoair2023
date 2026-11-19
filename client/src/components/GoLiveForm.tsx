/**
 * Go Live Form — Modal for signed-in users to create listening sessions in TMU
 * Handles session title, description, start time, and track selection
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

  const {
    data: eligibility,
    isLoading: eligibilityLoading,
    error: eligibilityError,
    refetch: refetchEligibility,
  } = useHostEligibility(isOpen && !!user);
  const canHost = eligibility?.canHost ?? false;
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
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-verso-navy rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-amber-500/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Could Not Confirm Session Access
              </h2>
              <p className="text-white/60 mb-6">
                {eligibilityError instanceof Error
                  ? eligibilityError.message
                  : "Session hosting is temporarily unavailable. Please try again."}
              </p>
              <Button
                onClick={() => void refetchEligibility()}
                className="bg-amber-500/20 border border-amber-500/30 text-amber-500 hover:bg-amber-500/30"
              >
                Try again
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
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-verso-navy rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-verso-navy/95 backdrop-blur border-b border-amber-500/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic2 className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-white">Go Live on TMU</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/40 hover:text-white/80 transition-colors"
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
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Evening Jazz Session, Late Night Beats"
                    className="w-full px-3 py-2 bg-verso-navy/40 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none transition-colors"
                    maxLength={SESSION_LIMITS.titleMax}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {title.length}/{SESSION_LIMITS.titleMax}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell your listeners what to expect..."
                    rows={3}
                    className="w-full px-3 py-2 bg-verso-navy/40 border border-white/10 rounded-lg text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
                    maxLength={SESSION_LIMITS.descriptionMax}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {description.length}/{SESSION_LIMITS.descriptionMax}
                  </p>
                </div>

                {/* Start Time */}
                <div>
                  <label className="text-sm font-medium text-white/80 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-verso-navy/40 border border-white/10 rounded-lg text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => setStep("tracks")}
                  disabled={!title.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-verso-navy font-semibold py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <p className="text-white/60 text-sm mb-4">
                    Choose from any published track in the catalog.
                  </p>
                  <TrackSelector
                    selectedTracks={selectedTracks}
                    onTracksChange={setSelectedTracks}
                    maxTracks={50}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => setStep("details")}
                    variant="outline"
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={selectedTracks.length === 0}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-white/20 disabled:text-white/40 text-verso-navy font-semibold"
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
                <Card className="bg-verso-navy/40 border-white/10 p-4 space-y-3">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wide">Title</p>
                    <p className="text-white font-semibold">{title}</p>
                  </div>
                  {description && (
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wide">Description</p>
                      <p className="text-white/80 text-sm">{description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wide">Starts</p>
                    <p className="text-white">
                      {new Date(startTime).toLocaleString()}
                    </p>
                  </div>
                </Card>

                {/* Verification Badge */}
                <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <CheckCircle className="w-4 h-4" />
                  Verified artist: ready to broadcast
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep("details")}
                    variant="outline"
                    disabled={createSession.isPending}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={submit}
                    disabled={createSession.isPending}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-verso-navy font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
