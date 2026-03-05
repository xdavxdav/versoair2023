import { useState, useEffect, useCallback } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Check, Users, Share2 } from "lucide-react";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referrals: number;
}

export default function ReferralCard() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReferral = useCallback(async () => {
    try {
      const res = await authenticatedFetch("/api/v1/referral/code");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail — referral is optional
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferral();
  }, [fetchReferral]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || !data) return null;

  return (
    <Card className="border-dashed border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-blue-600" />
          Refer & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          Share your referral code with friends. When they sign up, you both
          benefit!
        </p>

        {/* Referral Code */}
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={data.referralCode}
            className="font-mono text-center text-lg tracking-widest bg-white"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(data.referralCode)}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Share Link */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => copyToClipboard(data.referralLink)}
        >
          <Share2 className="h-3 w-3 mr-1" />
          Copy invite link
        </Button>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <Users className="h-4 w-4" /> Referrals
          </span>
          <Badge variant="secondary" className="font-mono">
            {data.referrals}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
