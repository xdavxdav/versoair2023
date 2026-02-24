import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2 } from "lucide-react";

interface BusinessCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  count?: number;
}

interface BusinessManagerProps {
  businessCategories: BusinessCategory[];
  selectedBusinessType: string | null;
  isCategoriesLoading: boolean;
  onSelectCategory: (categoryId: string) => void;
  onManageCategory: (
    categoryName: string,
    categories: BusinessCategory[],
  ) => void;
  onSearchInCategory: (categoryName: string) => void;
}

export const BusinessManager = memo(
  ({
    businessCategories,
    selectedBusinessType,
    isCategoriesLoading,
    onSelectCategory,
    onManageCategory,
    onSearchInCategory,
  }: BusinessManagerProps) => {
    const selectedCategory = businessCategories.find(
      (cat: any) => cat.id === selectedBusinessType,
    );

    return (
      <div className="space-y-6">
        {/* Categories Selection Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Select Business Category
            </CardTitle>
            <CardDescription>
              Choose a category to view, manage, or search businesses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCategoriesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {businessCategories.map((category: any) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedBusinessType === category.id
                        ? "default"
                        : "outline"
                    }
                    className={`h-24 w-full gap-2 transition-all ${
                      selectedBusinessType === category.id
                        ? "ring-2 ring-offset-2 ring-indigo-500"
                        : ""
                    }`}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-2xl">{category.icon || "📁"}</span>
                      <span className="text-xs font-medium line-clamp-2 text-center">
                        {category.name}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Manage/Search */}
        {selectedCategory && (
          <div className="space-y-4">
            {/* Manage Tab */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 Manage {selectedCategory.name}
                </CardTitle>
                <CardDescription>
                  Add, edit, or remove {selectedCategory.name.toLowerCase()}{" "}
                  entries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500">
                    <span>➕</span>
                    Add New {selectedCategory.name}
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <span>📊</span>
                    View Statistics
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Manage all {selectedCategory.name.toLowerCase()} entries in
                  your database. Add new entries, edit existing ones, or delete
                  outdated records.
                </p>
              </CardContent>
            </Card>

            {/* Search Tab */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 Search {selectedCategory.name}
                </CardTitle>
                <CardDescription>
                  Find and filter {selectedCategory.name.toLowerCase()} by
                  various criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={`Search ${selectedCategory.name.toLowerCase()}...`}
                    className="pl-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm">
                    Sort A-Z
                  </Button>
                  <Button variant="outline" size="sm">
                    Sort Z-A
                  </Button>
                  <Button variant="outline" size="sm">
                    Filter Active
                  </Button>
                  <Button variant="outline" size="sm">
                    Reset Filters
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Use the search box and filters above to find specific
                  {selectedCategory.name.toLowerCase()} entries.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  },
);

BusinessManager.displayName = "BusinessManager";
