import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { AlertCircle, CheckCircle, Loader, Download, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";

interface Presentation {
  id: string;
  title: string;
  topic: string;
  audience: string;
  slideCount: number;
  language: string;
  status: "draft" | "outline_approved" | "generating" | "generated" | "saved" | "published";
  outline?: string;
  outlineApprovedAt?: string;
  pptxUrl?: string;
  fileSize?: number;
  createdAt: string;
}

export default function PresentationMakerPage() {
  const { user, loading: authLoading } = useAuth();
  // ⚠️ Phase 1 Demo: AI content is mocked for demonstration
  // Real Groq/Ollama integration is deferred to Phase 1.1
  const [showMockWarning] = useState(true);

  const [location, navigate] = useLocation();
  const [step, setStep] = useState<"input" | "outline" | "generate" | "download">("input");
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOutline, setEditingOutline] = useState<string>("");

  // Input form state
  const [formData, setFormData] = useState({
    topic: "",
    audience: "General Audience",
    slideCount: 10,
    language: "en",
  });

  React.useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth/signin?redirect=/versoai/presentation-maker", { replace: true });
    } else if (!["verified", "max", "enterprise"].includes(user.subscriptionTier || "")) {
      navigate("/account/billing", { replace: true });
    } else {
      loadPresentations();
    }
  }, [authLoading, user]);

  async function loadPresentations() {
    try {
      const res = await fetch("/api/presentation/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPresentations(data);
      }
    } catch (err) {
      console.error("Failed to load presentations:", err);
    }
  }

  async function createDraft() {
    if (!formData.topic || !formData.audience) {
      setError("Topic and audience are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/presentation/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          topic: formData.topic,
          audience: formData.audience,
          slideCount: formData.slideCount,
          language: formData.language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to create draft");
        setLoading(false);
        return;
      }

      setCurrentPresentation(data);
      setEditingOutline(data.outline);
      setStep("outline");
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function approveOutline() {
    if (!currentPresentation || !editingOutline.trim()) {
      setError("Outline cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/presentation/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          presentationId: currentPresentation.id,
          outline: editingOutline,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to approve outline");
        setLoading(false);
        return;
      }

      setCurrentPresentation({
        ...currentPresentation,
        outline: editingOutline,
        status: "outline_approved",
        outlineApprovedAt: new Date().toISOString(),
      });
      setStep("generate");
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function generatePresentation() {
    if (!currentPresentation) return;

    setLoading(true);
    setError(null);

    try {
      // ⚠️ DEMO ONLY: Mock AI-generated content. Real AI integration deferred to Phase 1.1
      const mockSlides = [
        {
          title: currentPresentation.topic,
          content: `An introduction to ${currentPresentation.topic}`,
          bullets: [
            "Key point 1",
            "Key point 2",
            "Key point 3",
          ],
        },
        {
          title: "Main Content",
          content: "Detailed information about the topic",
          bullets: [
            "Important detail 1",
            "Important detail 2",
            "Important detail 3",
          ],
        },
        {
          title: "Conclusion",
          content: "Summary and takeaways",
          bullets: [
            "Key takeaway 1",
            "Key takeaway 2",
            "Call to action",
          ],
        },
      ];

      const res = await fetch("/api/presentation/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          presentationId: currentPresentation.id,
          aiContent: JSON.stringify(mockSlides),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to generate presentation");
        setLoading(false);
        return;
      }

      setCurrentPresentation({
        ...currentPresentation,
        status: "generated",
        pptxUrl: data.pptxUrl,
        fileSize: data.fileSize,
      });
      setStep("download");
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  async function deletePresentation(id: string) {
    if (!confirm("Are you sure you want to delete this presentation?")) return;

    try {
      const res = await fetch(`/api/presentation/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setPresentations(presentations.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">VersoAI Presentation Maker</h1>
        <p className="text-gray-600">
          Create professional presentations powered by AI. Verified+ tier required.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main workflow panel */}
        <div className="md:col-span-2">
          {step === "input" && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Presentation</CardTitle>
                <CardDescription>
                  Start by defining your presentation topic and audience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Topic *
                    </label>
                    <Input
                      value={formData.topic}
                      onChange={(e) =>
                        setFormData({ ...formData, topic: e.target.value })
                      }
                      placeholder="e.g., Marketing Strategy for 2025"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Audience *
                    </label>
                    <Input
                      value={formData.audience}
                      onChange={(e) =>
                        setFormData({ ...formData, audience: e.target.value })
                      }
                      placeholder="e.g., Executive Team"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Number of Slides
                      </label>
                      <Input
                        type="number"
                        min="3"
                        max="50"
                        value={formData.slideCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            slideCount: parseInt(e.target.value),
                          })
                        }
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Language
                      </label>
                      <Select
                        value={formData.language}
                        onValueChange={(value) =>
                          setFormData({ ...formData, language: value })
                        }
                      >
                        <SelectTrigger disabled={loading}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={createDraft}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Draft Outline"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "outline" && currentPresentation && (
            <Card>
              <CardHeader>
                <CardTitle>Review and Edit Outline</CardTitle>
                <CardDescription>
                  Edit the outline below, then approve to proceed to content generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Outline (editable)
                    </label>
                    <Textarea
                      value={editingOutline}
                      onChange={(e) => setEditingOutline(e.target.value)}
                      placeholder="Edit your presentation outline..."
                      rows={10}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setStep("input")}
                      variant="outline"
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button onClick={approveOutline} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        "Approve and Continue"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "generate" && currentPresentation && (
            <Card>
              <CardHeader>
                <CardTitle>Generate Presentation</CardTitle>
                <CardDescription>
                  Your outline is approved. Click below to generate the PowerPoint file.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-900">
                      ✓ Outline approved and ready
                    </p>
                    <p className="text-sm text-blue-900 mt-2">
                      {currentPresentation.slideCount} slides • {currentPresentation.language === "en" ? "English" : "Français"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setStep("outline")}
                      variant="outline"
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button onClick={generatePresentation} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate PowerPoint"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "download" && currentPresentation && (
            <Card>
              <CardHeader>
                <CardTitle>Presentation Ready!</CardTitle>
                <CardDescription>
                  Your presentation has been generated successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      Presentation generated successfully
                    </AlertDescription>
                  </Alert>

                  <div className="p-4 bg-gray-50 rounded border">
                    <p className="font-semibold">{currentPresentation.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentPresentation.slideCount} slides •{" "}
                      {currentPresentation.fileSize
                        ? `${(currentPresentation.fileSize / 1024).toFixed(1)} KB`
                        : "File size unknown"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setStep("input")}
                      variant="outline"
                    >
                      Create Another
                    </Button>
                    <a
                      href={currentPresentation.pptxUrl || "#"}
                      className="flex-1"
                    >
                      <Button className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download PPTX
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Saved presentations */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Presentations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {presentations.length === 0 ? (
                  <p className="text-sm text-gray-500">No presentations yet</p>
                ) : (
                  presentations.map((pres) => (
                    <div
                      key={pres.id}
                      className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCurrentPresentation(pres);
                        if (pres.status === "generated") {
                          setStep("download");
                        } else if (pres.status === "outline_approved") {
                          setStep("generate");
                        } else {
                          setStep("outline");
                          setEditingOutline(pres.outline || "");
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-sm font-medium truncate">
                            {pres.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(pres.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePresentation(pres.id);
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center mt-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {pres.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
