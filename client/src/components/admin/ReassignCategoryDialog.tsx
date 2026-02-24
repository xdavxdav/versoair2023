import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface ReassignCategoryDialogProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReassignCategoryDialog({
  business,
  isOpen,
  onClose,
  onSuccess,
}: ReassignCategoryDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryKeywords: Record<string, string[]> = {
    plumb: ["plumb", "water", "pipe", "drain", "faucet", "sewer"],
    electric: ["electric", "electrician", "wiring", "circuit", "power"],
    telecom: ["telecom", "phone", "mobile", "voip", "call", "communication"],
    beauty: ["beauty", "salon", "hair", "cosmetic", "aesthetic", "styling"],
    health: ["health", "hospital", "clinic", "doctor", "medical", "nursing"],
    restaurant: ["restaurant", "food", "dining", "cuisine", "meal", "chef"],
    retail: ["shop", "store", "retail", "sale", "purchase", "commercial"],
    fitness: ["gym", "fitness", "exercise", "training", "sports", "workout"],
    cloud: ["cloud", "hosting", "server", "data", "infrastructure"],
    school: ["school", "education", "student", "teacher", "learning"],
  };

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen]);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("Failed to load categories");
    }
  }

  function checkDescriptionCategoryMatch(
    description: string,
    categoryName: string,
  ): { isSuspicious: boolean; expectedKeywords: string[] } {
    const desc = description.toLowerCase();
    const cat = categoryName.toLowerCase();

    let matchedKeywords: string[] = [];
    for (const [categoryKey, keywords] of Object.entries(categoryKeywords)) {
      if (cat.includes(categoryKey)) {
        matchedKeywords = keywords;
        break;
      }
    }

    if (matchedKeywords.length === 0) {
      return { isSuspicious: false, expectedKeywords: [] };
    }

    const hasMatch = matchedKeywords.some((kw) => desc.includes(kw));
    return {
      isSuspicious: !hasMatch,
      expectedKeywords: matchedKeywords,
    };
  }

  function onCategorySelect(categoryId: number) {
    setSelectedCategory(categoryId);
    setError(null);

    const category = categories.find((c) => c.id === categoryId);
    if (category && business) {
      const mismatch = checkDescriptionCategoryMatch(
        business.description,
        category.name,
      );

      if (mismatch.isSuspicious) {
        setWarnings([
          `⚠️ Business description doesn't mention typical ${category.name} keywords`,
          `Expected keywords: ${mismatch.expectedKeywords.join(", ")}`,
        ]);
      } else {
        setWarnings([]);
      }
    }
  }

  async function handleReassign() {
    if (!business || !selectedCategory) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedCategory }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to reassign category");
      }

      const result = await res.json();

      // Success - close dialog and refresh
      if (onSuccess) {
        onSuccess();
      }
      onClose();

      // Show success message (you could use toast here)
      console.log("✅ Business reassigned successfully");
    } catch (err) {
      setError((err as Error).message);
      console.error("Error reassigning category:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!business) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reassign Business Category</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Business Info */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              {business.name}
            </p>
            <p className="text-sm text-gray-600 mt-1">{business.description}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Current Category:{" "}
                <span className="font-semibold">{business.category}</span>
              </p>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">
              New Category
            </label>
            <Select
              value={selectedCategory?.toString() || ""}
              onValueChange={(value) => onCategorySelect(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="text-yellow-800 text-sm">
                  {warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="text-red-800 text-sm">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 This change will be logged in the audit trail for compliance
              and can be rolled back if needed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedCategory || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Reassigning..." : "Reassign Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
