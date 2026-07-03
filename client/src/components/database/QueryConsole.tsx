import { memo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateAriaLabel } from "@/utils/a11y";
import {
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Download,
} from "lucide-react";

interface QueryResult {
  rowCount: number;
  duration: number;
  columns: string[];
  rows: any[];
}

interface QueryConsoleProps {
  sqlQuery: string;
  setSqlQuery: (query: string) => void;
  queryResult: QueryResult | null;
  isExecutingQuery: boolean;
  onExecuteQuery: () => void;
  onExportResults: (format: "csv" | "json") => void;
}

export const QueryConsole = memo(
  ({
    sqlQuery,
    setSqlQuery,
    queryResult,
    isExecutingQuery,
    onExecuteQuery,
    onExportResults,
  }: QueryConsoleProps) => {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-pink-600" />
                  SQL Query Console
                </CardTitle>
                <CardDescription>
                  Execute SQL queries against the database
                </CardDescription>
              </div>
              <Button
                onClick={onExecuteQuery}
                disabled={isExecutingQuery || !sqlQuery.trim()}
                className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                aria-label={generateAriaLabel(
                  "Execute SQL query",
                  isExecutingQuery ? "currently executing" : "ready to execute",
                )}
                title="Execute query (Ctrl+Enter)"
              >
                {isExecutingQuery ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Execute Query
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* SQL Editor */}
            <div className="space-y-2">
              <label
                htmlFor="sql-query"
                className="text-sm font-medium text-gray-700"
              >
                SQL Query
              </label>
              <Textarea
                id="sql-query"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Enter your SQL query here...&#10;Example: SELECT * FROM users LIMIT 10"
                className="font-mono text-sm min-h-[200px] bg-gray-50"
                disabled={isExecutingQuery}
                aria-label="SQL query editor"
                aria-describedby="sql-help"
              />
              <div
                id="sql-help"
                className="flex items-center gap-2 text-xs text-gray-500"
              >
                <AlertCircle className="h-3 w-3" />
                <span>
                  Execute SELECT queries to view data. Be careful with UPDATE,
                  DELETE, and DROP commands.
                </span>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-2">
              <label
                htmlFor="templates"
                className="text-sm font-medium text-gray-700"
              >
                Quick Templates
              </label>
              <div id="templates" className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT * FROM information_schema.tables WHERE table_schema = 'public';",
                    )
                  }
                  disabled={isExecutingQuery}
                  aria-label={generateAriaLabel(
                    "Load list all tables template",
                  )}
                >
                  List All Tables
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSqlQuery("SELECT * FROM users LIMIT 10;")}
                  disabled={isExecutingQuery}
                  aria-label={generateAriaLabel("Load view users template")}
                >
                  View Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSqlQuery("SELECT * FROM businesses LIMIT 10;")
                  }
                  disabled={isExecutingQuery}
                  aria-label={generateAriaLabel(
                    "Load view businesses template",
                  )}
                >
                  View Businesses
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSqlQuery(
                      "SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size FROM information_schema.tables WHERE table_schema = 'public' ORDER BY pg_total_relation_size(quote_ident(table_name)::regclass) DESC;",
                    )
                  }
                  disabled={isExecutingQuery}
                  aria-label={generateAriaLabel("Load table sizes template")}
                >
                  Table Sizes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSqlQuery("")}
                  disabled={isExecutingQuery}
                  aria-label={generateAriaLabel("Clear SQL query editor")}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Query Results */}
            {queryResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Query Results
                  </label>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      {queryResult.rowCount} rows
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-600" />
                      {queryResult.duration}ms
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExportResults("csv")}
                      className="gap-1 h-6"
                      aria-label={generateAriaLabel(
                        "Export query results as CSV",
                      )}
                      title="Download results in CSV format"
                    >
                      <Download className="h-3 w-3" />
                      CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExportResults("json")}
                      className="gap-1 h-6"
                      aria-label={generateAriaLabel(
                        "Export query results as JSON",
                      )}
                      title="Download results in JSON format"
                    >
                      <Download className="h-3 w-3" />
                      JSON
                    </Button>
                  </div>
                </div>

                {/* Results Table */}
                <div className="bg-gray-50 rounded-lg overflow-x-auto">
                  {queryResult.columns.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          {queryResult.columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-2 text-left font-medium text-gray-700 border-b"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="hover:bg-gray-100">
                            {queryResult.columns.map((col) => (
                              <td
                                key={`${rowIndex}-${col}`}
                                className="px-4 py-2 border-b text-gray-600"
                              >
                                {typeof row[col] === "object"
                                  ? JSON.stringify(row[col])
                                  : String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No results to display
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  },
);

QueryConsole.displayName = "QueryConsole";
