import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Category = {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  category_type?: string | null;
  parent_id?: number | null;
};

function buildTree(categories: Category[]) {
  const map = new Map<number, Category & { children: Category[] }>();
  categories.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: (Category & { children: Category[] })[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortFn = (a: any, b: any) => a.name.localeCompare(b.name);
  roots.forEach((r) => r.children.sort(sortFn));
  roots.sort(sortFn);
  return roots;
}

export default function CategoryTree({
  showTypeBadge = true,
  collapsible = true,
  onSelect,
  source = "business",
}: {
  showTypeBadge?: boolean;
  collapsible?: boolean;
  onSelect?: (categoryId: number) => void;
  source?: "business" | "admin";
}) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingParent, setPendingParent] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    parent_id: null as number | null,
  });

  const { data, isLoading, isError, error } = useQuery<Category[]>({
    queryKey: [source === "admin" ? "admin-categories" : "businessCategories"],
    queryFn: async () => {
      const urls =
        source === "admin"
          ? ["/api/admin/categories", "/api/business/categories"]
          : ["/api/business/categories", "/api/admin/categories"];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const json = await res.json();
          const rows =
            json.categories ||
            json.categoryData ||
            (Array.isArray(json) ? json : null);
          if (!rows) continue;
          return rows.map((r: any, idx: number) =>
            typeof r === "string"
              ? { id: -(idx + 1), name: r, parent_id: null, description: "" }
              : {
                  id: r.id ?? r.ID ?? -(idx + 1),
                  name: r.name || r.title || r.nom || String(r),
                  parent_id: r.parent_id ?? r.parentId ?? null,
                  description: r.description || r.desc || "",
                  slug: r.slug || r.Slug || undefined,
                },
          );
        } catch (err) {
          continue;
        }
      }
      throw new Error("Failed to load categories");
    },
    staleTime: 1000 * 60 * 5,
  });

  const tree = useMemo(() => buildTree((data || []) as Category[]), [data]);

  const createMutation = useMutation<any, Error, any>({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Create failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["businessCategories"] });
      toast({ title: "Category created" });
    },
    onError: (err: Error) =>
      toast({
        title: "Create failed",
        description: err?.message || "Create failed",
        variant: "destructive",
      }),
  });

  if (isLoading)
    return <div className="text-sm text-gray-500">Loading categories…</div>;
  if (isError)
    return (
      <div className="text-sm text-red-500">
        Error: {(error as Error).message}
      </div>
    );

  return (
    <nav aria-label="Categories">
      {source === "admin" && (
        <div className="flex items-center justify-end mb-2">
          <Button
            size="sm"
            onClick={() => {
              setPendingParent(null);
              setForm({ name: "", slug: "", description: "", parent_id: null });
              setShowAddDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-3 w-3" /> Add Category
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {tree.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            collapsible={collapsible}
            showTypeBadge={showTypeBadge}
            onSelect={onSelect}
            onAddChild={(id: number) => {
              setPendingParent(id);
              setForm({ name: "", slug: "", description: "", parent_id: id });
              setShowAddDialog(true);
            }}
          />
        ))}
      </ul>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingParent ? "Add Subcategory" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {pendingParent
                ? "Create a new subcategory."
                : "Create a new top-level category."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm">Slug (optional)</label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm">Parent</label>
              <Select
                value={form.parent_id ? String(form.parent_id) : "none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    parent_id: v === "none" ? null : parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  {(data || [])
                    .filter((c: any) => !c.parent_id)
                    .map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!form.name.trim())
                  return toast({
                    title: "Name required",
                    variant: "destructive",
                  });
                createMutation.mutate({
                  name: form.name.trim(),
                  slug: form.slug || undefined,
                  description: form.description || undefined,
                  parent_id: form.parent_id || null,
                });
                setShowAddDialog(false);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

function CategoryNode({
  node,
  collapsible,
  showTypeBadge,
  onSelect,
  onAddChild,
}: {
  node: Category & { children: Category[] };
  collapsible: boolean;
  showTypeBadge?: boolean;
  onSelect?: (categoryId: number) => void;
  onAddChild?: (id: number) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li>
      <div className="flex items-center gap-2">
        {hasChildren && collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-6" />
        )}

        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-800">
              <button
                onClick={() => onSelect && onSelect(node.id)}
                className="hover:underline text-left"
              >
                {node.name}
              </button>
              {node.description && (
                <div className="text-xs text-gray-500">{node.description}</div>
              )}
            </div>
            {showTypeBadge && node.category_type && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {node.category_type}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onAddChild && (
              <button
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                onClick={() => onAddChild(node.id)}
                aria-label="Add subcategory"
                title="Add subcategory"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Sub</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <ul className="pl-6 mt-1 space-y-1">
          {node.children.map((child) => (
            <li key={child.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-700">{child.name}</div>
                  {child.description && (
                    <div className="text-xs text-gray-500">
                      {child.description}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => onSelect && onSelect(child.id)}
                  >
                    Select
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
