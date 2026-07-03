import { memo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableMetadata, ViewMode } from "@/types/database-dashboard";
import {
  Eye,
  Plus,
  MoreVertical,
  Search,
  Filter,
  FilterX,
  Table2,
  Rows,
  Link2,
  Download,
  FileDown,
  Braces,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TableBrowserProps {
  tables: TableMetadata[];
  filteredTables: TableMetadata[];
  selectedTable: string | null;
  searchQuery: string;
  viewMode: ViewMode;
  isLoadingData: boolean;
  onSearchChange: (query: string) => void;
  onSelectTable: (tableName: string | null) => void;
  onViewData: (table: TableMetadata) => void;
  onAddRecord: (table: TableMetadata) => void;
  onExportData: (tableName: string, format: "csv" | "json") => void;
  onCopyName: (name: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

const TableGridItem = memo(
  ({
    table,
    isSelected,
    onSelect,
    onViewData,
    onAddRecord,
    onExportData,
    onCopyName,
  }: any) => (
    <Card
      className={`group cursor-pointer border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
        isSelected ? "ring-2 ring-indigo-500" : ""
      }`}
      onClick={() => onSelect(table.name)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">{table.icon}</div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {table.displayName}
              </CardTitle>
              <CardDescription className="text-xs">
                {table.name}
              </CardDescription>
            </div>
          </div>
          {table.is_view === true && (
            <Badge variant="secondary" className="text-xs">
              VIEW
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {table.description}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Rows:</span>
            <span className="font-medium">
              {table.rowCount?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Size:</span>
            <span className="font-medium">
              {table.sizeMB ? `${(table.sizeMB * 1024).toFixed(2)} KB` : "0 KB"}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Columns:</span>
            <span className="font-medium">{table.columns ?? 0}</span>
          </div>
        </div>
        {table.tags && table.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {table.tags.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewData(table);
                }}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRecord(table);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Record</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2 bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onExportData(table.name, "csv")}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportData(table.name, "json")}>
              <Braces className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyName(table.name)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  ),
);

TableGridItem.displayName = "TableGridItem";

const TableRowItem = memo(
  ({
    table,
    isSelected,
    onSelect,
    onViewData,
    onAddRecord,
    onExportData,
    onCopyName,
  }: any) => (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border hover:shadow-lg transition-all duration-200 cursor-pointer group ${
        isSelected
          ? "border-indigo-300 bg-gradient-to-r from-indigo-50/50 to-purple-50/50"
          : "border-gray-200 hover:border-indigo-200 bg-white"
      }`}
      onClick={() => onSelect(table.name)}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <div className="text-2xl">{table.icon}</div>
          {table.is_view === true && (
            <Badge className="mt-1 text-xs" variant="secondary">
              VIEW
            </Badge>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{table.displayName}</h4>
            <Badge
              variant={
                table.importance === "critical"
                  ? "destructive"
                  : table.importance === "high"
                    ? "default"
                    : "secondary"
              }
              className="text-xs"
            >
              {table.importance?.toUpperCase() || "N/A"}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">{table.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="text-xs">
              <Table2 className="h-3 w-3 mr-1" />
              {table.columns ?? 0} columns
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Rows className="h-3 w-3 mr-1" />
              {table.rowCount?.toLocaleString() ?? 0} rows
            </Badge>
            {table.hasFK && (
              <Badge variant="outline" className="text-xs">
                <Link2 className="h-3 w-3 mr-1" />
                Foreign Keys
              </Badge>
            )}
            {table.tags?.slice(0, 2).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewData(table);
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View Data</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRecord(table);
                }}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add Record</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onExportData(table.name, "csv")}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportData(table.name, "json")}>
              <Braces className="h-4 w-4 mr-2" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCopyName(table.name)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  ),
);

TableRowItem.displayName = "TableRowItem";

export const TableBrowser = memo(
  ({
    tables,
    filteredTables,
    selectedTable,
    searchQuery,
    viewMode,
    isLoadingData,
    onSearchChange,
    onSelectTable,
    onViewData,
    onAddRecord,
    onExportData,
    onCopyName,
    onViewModeChange,
  }: TableBrowserProps) => {
    return (
      <div className="space-y-6">
        {/* Search and Filter Bar */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tables by name or description..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* View Mode Selector */}
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === ViewMode.GRID ? "default" : "outline"}
                    size="sm"
                    onClick={() => onViewModeChange(ViewMode.GRID)}
                  >
                    Grid View
                  </Button>
                  <Button
                    variant={viewMode === ViewMode.LIST ? "default" : "outline"}
                    size="sm"
                    onClick={() => onViewModeChange(ViewMode.LIST)}
                  >
                    List View
                  </Button>
                </div>

                <div className="text-xs text-gray-500 ml-auto">
                  {filteredTables.length} of {tables.length} tables
                </div>
              </div>

              {searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchChange("");
                    onSelectTable(null);
                  }}
                  className="gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tables Grid/List */}
        {filteredTables.length === 0 ? (
          <Card className="border-0 shadow-md text-center py-12">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No tables found
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onSearchChange("");
                  onSelectTable(null);
                }}
                className="gap-2"
              >
                <FilterX className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map((table: TableMetadata) => (
              <TableGridItem
                key={table.name}
                table={table}
                isSelected={selectedTable === table.name}
                onSelect={onSelectTable}
                onViewData={onViewData}
                onAddRecord={onAddRecord}
                onExportData={onExportData}
                onCopyName={onCopyName}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTables.map((table: TableMetadata) => (
              <TableRowItem
                key={table.name}
                table={table}
                isSelected={selectedTable === table.name}
                onSelect={onSelectTable}
                onViewData={onViewData}
                onAddRecord={onAddRecord}
                onExportData={onExportData}
                onCopyName={onCopyName}
              />
            ))}
          </div>
        )}
      </div>
    );
  },
);

TableBrowser.displayName = "TableBrowser";
