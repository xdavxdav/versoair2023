import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authenticatedFetch } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, X, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "/api/v1/admin/verification";

interface QueueBusiness {
  id: number;
  name: string;
  category_name?: string | null;
  address?: string | null;
  email?: string | null;
  verification_status: string | null;
  verification_reason?: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
}

interface QueueResponse {
  data: QueueBusiness[];
  pagination: { total: number | string };
}

type Decision = { business: QueueBusiness; action: "approve" | "reject" };

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body?.error?.message || body?.error || fallback;
  } catch {
    return fallback;
  }
}

export default function VerificationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery<QueueResponse>({
    queryKey: ["verification-queue"],
    queryFn: async () => {
      const response = await authenticatedFetch(`${API}/queue?limit=100`);
      if (!response.ok) throw new Error("Failed to load the verification queue");
      return response.json();
    },
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["verification-queue"] });

  const decide = useMutation({
    mutationFn: async ({ business, action }: Decision) => {
      const response = await authenticatedFetch(
        `${API}/businesses/${business.id}/verify`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: note.trim() }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Decision failed"));
      }
      return response.json();
    },
    onSuccess: (_result, { business, action }) => {
      toast({
        title: action === "approve" ? "Published" : "Rejected",
        description:
          action === "approve"
            ? `"${business.name}" is verified and live in the directory`
            : `"${business.name}" was rejected and stays hidden`,
      });
      setDecision(null);
      setNote("");
      refresh();
    },
    onError: (error: Error) =>
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      }),
  });

  const hide = useMutation({
    mutationFn: async (business: QueueBusiness) => {
      const response = await authenticatedFetch(
        `${API}/businesses/${business.id}/activate`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: false }),
        },
      );
      if (!response.ok) {
        throw new Error(await errorMessage(response, "Could not hide listing"));
      }
    },
    onSuccess: refresh,
    onError: (error: Error) =>
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      }),
  });

  const total = Number(data?.pagination?.total ?? 0);
  const isPublic = (b: QueueBusiness) => b.is_active && b.is_verified;
  const approving = decision?.action === "approve";

  return (
    <div className="min-h-screen bg-[#f3efe9] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">
            Business Verification
          </h1>
          <p className="text-slate-600">
            Approving publishes a business: verified, active, live in the
            directory. Every decision is audited.
          </p>
        </div>

        <Card className="mb-6 border border-amber-200 bg-amber-50/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-slate-900">
              {total} Awaiting Review
            </CardTitle>
            <CardDescription className="text-slate-600">
              Businesses that are not verified and public yet
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-8 text-center text-slate-500">Loading...</div>
            ) : !data?.data?.length ? (
              <div className="py-8 text-center text-slate-500">
                Nothing waiting for review
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Business</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Public</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell className="font-medium">
                          {business.name}
                          <div className="text-xs text-slate-500">
                            #{business.id}
                            {business.category_name
                              ? ` · ${business.category_name}`
                              : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {business.verification_status ?? "unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell>{business.is_verified ? "Yes" : "No"}</TableCell>
                        <TableCell>{business.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell>
                          <Badge variant={isPublic(business) ? "default" : "secondary"}>
                            {isPublic(business) ? "Public" : "Hidden"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => {
                                setNote("");
                                setDecision({ business, action: "approve" });
                              }}
                            >
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setNote("");
                                setDecision({ business, action: "reject" });
                              }}
                            >
                              <X className="h-4 w-4" /> Reject
                            </Button>
                            {isPublic(business) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => hide.mutate(business)}
                                disabled={hide.isPending}
                              >
                                <EyeOff className="h-4 w-4" /> Hide
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {approving ? "Approve and publish" : "Reject"}{" "}
              {decision?.business.name}
            </DialogTitle>
            <DialogDescription>
              {approving
                ? "Record what was checked (e.g. the registry record and date). Required."
                : "Say why this business is refused. Required."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={approving ? "Evidence checked" : "Reason"}
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDecision(null)}
              disabled={decide.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={approving ? "default" : "destructive"}
              disabled={!note.trim() || decide.isPending}
              onClick={() => decision && decide.mutate(decision)}
            >
              {approving ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
