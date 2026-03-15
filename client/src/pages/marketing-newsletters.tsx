import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Send, Archive, Users, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function NewslettersPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // Public newsletter archive
  const { data: archive } = useQuery({
    queryKey: ["marketing", "newsletters", "archive"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/newsletters/archive");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 60_000,
  });

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/marketing/newsletters/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      if (!res.ok) throw new Error("Subscription failed");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscribed! 🎉",
        description: "You'll receive our next newsletter at " + email,
      });
      setEmail("");
      setName("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    subscribeMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Subscribe Section */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-gray-800/50 border-purple-500/30 mb-12">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Mail className="h-4 w-4" />
              Newsletter
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stay in the Loop
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Get industry insights, marketing tips, exclusive offers, and news
              about our latest services delivered straight to your inbox. Free
              forever.
            </p>

            <form onSubmit={handleSubscribe} className="max-w-md mx-auto">
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Your name (optional)"
                  className="bg-gray-800/80 border-gray-600 text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    className="bg-gray-800/80 border-gray-600 text-white flex-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                    disabled={subscribeMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {subscribeMutation.isPending ? "..." : "Subscribe"}
                  </Button>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-3">
                No spam, ever. Unsubscribe anytime with one click.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* What you'll get */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            {
              icon: Users,
              title: "Industry Insights",
              desc: "Market trends and business strategies for your sector",
            },
            {
              icon: CheckCircle,
              title: "Exclusive Offers",
              desc: "Early access to new services and special discounts",
            },
            {
              icon: Clock,
              title: "Regular Updates",
              desc: "Delivered weekly so you never miss important news",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-gray-800/30 border-gray-700">
              <CardContent className="p-6 text-center">
                <item.icon className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter Archive */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Archive className="h-5 w-5 text-purple-400" />
            Newsletter Archive
          </h2>

          {!archive || archive.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-700">
              <CardContent className="p-8 text-center">
                <Mail className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  No newsletters sent yet. Subscribe to be among the first!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {archive.map((campaign: any) => (
                <Card
                  key={campaign.id}
                  className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">
                        {campaign.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-gray-500 text-sm">
                          {campaign.sent_at
                            ? new Date(campaign.sent_at).toLocaleDateString()
                            : "—"}
                        </span>
                        {campaign.recipient_count && (
                          <Badge className="bg-gray-700 text-gray-300 text-xs">
                            {campaign.recipient_count} recipients
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600"
                    >
                      Read
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
