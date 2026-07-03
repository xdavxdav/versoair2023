import { memo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HardDrive, Download, Calendar, CheckCircle } from "lucide-react";

interface BackupManagerProps {
  backupType: "full" | "partial" | "schema";
  onBackupTypeChange: (type: "full" | "partial" | "schema") => void;
  onCreateBackup: (type: "full" | "partial" | "schema") => void;
  onRestoreBackup: () => void;
}

export const BackupManager = memo(
  ({
    backupType,
    onBackupTypeChange,
    onCreateBackup,
    onRestoreBackup,
  }: BackupManagerProps) => {
    const backupTypes = [
      {
        id: "full",
        label: "Full Backup",
        description: "Backup all database objects and data",
        icon: "📦",
      },
      {
        id: "partial",
        label: "Partial Backup",
        description: "Backup selected tables and their data",
        icon: "📋",
      },
      {
        id: "schema",
        label: "Schema Backup",
        description: "Backup only database structure without data",
        icon: "📐",
      },
    ];

    return (
      <div className="space-y-6">
        {/* Backup Type Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-amber-600" />
              Backup Type
            </CardTitle>
            <CardDescription>
              Choose the type of backup you want to create
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {backupTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() =>
                    onBackupTypeChange(type.id as "full" | "partial" | "schema")
                  }
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    backupType === type.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 hover:border-amber-300"
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-semibold text-gray-900">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Backup Actions */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Backup Actions</CardTitle>
            <CardDescription>
              Create a new backup or restore from a previous backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={() => onCreateBackup(backupType)}
                className="flex-1 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <HardDrive className="h-4 w-4" />
                Create Backup
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={onRestoreBackup}
              >
                <Download className="h-4 w-4" />
                Restore Backup
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              {backupType === "full"
                ? "Full backups include all database objects and data. Recommended for regular scheduled backups."
                : backupType === "partial"
                  ? "Partial backups include selected tables. Useful for backing up specific data."
                  : "Schema backups include only the database structure. Useful for documentation and migrations."}
            </p>
          </CardContent>
        </Card>

        {/* Recent Backups */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Recent Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "Feb 3, 2025 - 15:30", type: "Full", size: "2.4 GB" },
                { date: "Feb 2, 2025 - 14:15", type: "Full", size: "2.3 GB" },
                { date: "Feb 1, 2025 - 13:45", type: "Schema", size: "45 MB" },
              ].map((backup, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {backup.date}
                    </div>
                    <div className="text-xs text-gray-600">{backup.type}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{backup.size}</Badge>
                    <Button variant="ghost" size="sm" className="gap-1 h-8">
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

BackupManager.displayName = "BackupManager";
