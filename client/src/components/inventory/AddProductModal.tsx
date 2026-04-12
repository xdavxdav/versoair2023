import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  "Electronics",
  "Apparel",
  "Food & Beverage",
  "Home & Garden",
  "Health & Beauty",
  "Sports",
  "Toys",
  "Automotive",
  "Office Supplies",
  "Construction Materials",
  "Hospitality Supplies",
  "Entertainment Merch",
  "Other",
];

const STATUS_OPTIONS = [
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Discontinued",
];

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSector?: string;
}

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  currentStock: string;
  reorderPoint: string;
  reorderQuantity: string;
  unitCost: string;
  unitPrice: string;
  supplier: string;
  warehouseLocation: string;
  dailySalesRate: string;
  status: string;
}

const defaultForm: ProductForm = {
  name: "",
  sku: "",
  category: "Other",
  currentStock: "0",
  reorderPoint: "10",
  reorderQuantity: "50",
  unitCost: "",
  unitPrice: "",
  supplier: "",
  warehouseLocation: "",
  dailySalesRate: "0",
  status: "In Stock",
};

export default function AddProductModal({
  open,
  onClose,
  onSuccess,
  defaultSector,
}: AddProductModalProps) {
  const [form, setForm] = useState<ProductForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = useCallback((field: keyof ProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Product name is required");
    if (!form.sku.trim()) return setError("SKU is required");
    if (!form.unitCost || Number(form.unitCost) < 0)
      return setError("Valid unit cost required");
    if (!form.unitPrice || Number(form.unitPrice) < 0)
      return setError("Valid unit price required");

    setSaving(true);
    setError("");
    try {
      await apiRequest("POST", "/api/inventory/products", {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category,
        currentStock: parseInt(form.currentStock) || 0,
        reorderPoint: parseInt(form.reorderPoint) || 10,
        reorderQuantity: parseInt(form.reorderQuantity) || 50,
        unitCost: form.unitCost,
        unitPrice: form.unitPrice,
        supplier: form.supplier.trim() || null,
        warehouseLocation: form.warehouseLocation.trim() || null,
        dailySalesRate: form.dailySalesRate || "0",
        status: form.status,
        sector: defaultSector || null,
      });

      setForm({ ...defaultForm });
      onSuccess();
    } catch (err: any) {
      const msg = err.message || "Failed to create product";
      // Extract message from "409: {...}" format
      if (msg.includes("SKU already exists")) {
        setError("A product with this SKU already exists");
      } else {
        setError(msg.replace(/^\d+:\s*/, ""));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ ...defaultForm });
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg bg-[#0d1117] border border-gray-700/50 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            ➕ Add New Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Name & SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">
                Product Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Widget Pro X"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">
                SKU <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder="WPX-001"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => updateField("category", v)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {CATEGORIES.map((c) => (
                    <SelectItem
                      key={c}
                      value={c}
                      className="text-gray-200 focus:bg-gray-800"
                    >
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => updateField("status", v)}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-gray-200 focus:bg-gray-800"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock & Reorder */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Current Stock</Label>
              <Input
                type="number"
                min="0"
                value={form.currentStock}
                onChange={(e) => updateField("currentStock", e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Reorder Point</Label>
              <Input
                type="number"
                min="0"
                value={form.reorderPoint}
                onChange={(e) => updateField("reorderPoint", e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">Reorder Qty</Label>
              <Input
                type="number"
                min="0"
                value={form.reorderQuantity}
                onChange={(e) => updateField("reorderQuantity", e.target.value)}
                className="bg-gray-800/50 border-gray-700 text-white mt-1"
              />
            </div>
          </div>

          {/* Cost & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">
                Unit Cost ($) <span className="text-red-400">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => updateField("unitCost", e.target.value)}
                placeholder="0.00"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">
                Unit Price ($) <span className="text-red-400">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => updateField("unitPrice", e.target.value)}
                placeholder="0.00"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
          </div>

          {/* Supplier & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-400 text-xs">Supplier</Label>
              <Input
                value={form.supplier}
                onChange={(e) => updateField("supplier", e.target.value)}
                placeholder="Acme Corp"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
            <div>
              <Label className="text-gray-400 text-xs">
                Warehouse Location
              </Label>
              <Input
                value={form.warehouseLocation}
                onChange={(e) =>
                  updateField("warehouseLocation", e.target.value)
                }
                placeholder="Aisle B, Rack 3"
                className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 mt-1"
              />
            </div>
          </div>

          {/* Daily sales rate */}
          <div className="w-1/2">
            <Label className="text-gray-400 text-xs">
              Daily Sales Rate (units/day)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.dailySalesRate}
              onChange={(e) => updateField("dailySalesRate", e.target.value)}
              className="bg-gray-800/50 border-gray-700 text-white mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-gray-700 text-gray-400 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Create Product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
