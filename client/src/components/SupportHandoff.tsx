import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useSupportCopy } from "@/hooks/use-support-copy";
import { ticketRequest } from "@/lib/support-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuthContext } from "@/contexts/AuthContext";

export default function SupportHandoff({ conversationId, message }: { conversationId?: number; message?: string }) {
  const t = useSupportCopy();
  const { user } = useAuthContext();
  const [confirming, setConfirming] = useState(false);
  const handoff = useMutation({
    mutationFn: () => ticketRequest<{ id: number; status: string }>("/api/tickets/handoff", "POST",
      conversationId ? { conversationId, confirmed: true } : { message, confirmed: true }),
    onSuccess: () => setConfirming(false),
  });
  if (!user) return <Link href="/auth/signin?redirect=/versoai" className="mt-3 block underline">{t("handoff")}</Link>;
  return <div className="mt-3 space-y-2 text-sm">
    {handoff.data
      ? <Link href={`/tickets?ticket=${handoff.data.id}`} className="font-semibold underline">{t("linkedTicket")} #{handoff.data.id}</Link>
      : <Button variant="outline" onClick={() => setConfirming(true)}>{t("handoff")}</Button>}
    {handoff.isError && <p role="alert" className="text-red-700">{handoff.error.message}</p>}
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogContent className="bg-white text-slate-900">
        <DialogTitle>{t("handoff")}</DialogTitle><DialogDescription>{t("confirmHandoff")}</DialogDescription>
        <Button disabled={handoff.isPending} onClick={() => handoff.mutate()}>{t("confirm")}</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
