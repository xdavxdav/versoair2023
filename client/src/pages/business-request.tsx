import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BusinessForm, type BusinessFormResult } from "@/components/BusinessForm";
import { useLanguage } from "@/components/LanguageSwitcher";
import { useAuthContext } from "@/contexts/AuthContext";
import { resolveLang } from "@/lib/submit-json";
import { clearBusinessIntent } from "@/lib/signup-resume";

const COPY = {
  en: {
    title: "Register your business",
    intro:
      "Tell us about your business. Our team reviews every request before anything is published.",
    stepsTitle: "How it works",
    steps: [
      {
        title: "Send your request",
        body: "Fill in the form with your business details.",
      },
      {
        title: "We review it",
        body: "The Verso Air team checks the details and may contact you by e-mail.",
      },
      {
        title: "You go live",
        body: "Once approved, your business is listed and the Careers portal unlocks so you can post jobs.",
      },
    ],
    start: "Register a business",
    pendingTitle: "Request received: pending review",
    pendingBody: (name: string) =>
      `We are reviewing ${name}. It will not appear in the directory until it is approved.`,
    reference: "Reference",
    followTickets: "Follow this request in Tickets",
    emailOnly:
      "Our team received your request by e-mail. Keep the reference above if you need to contact us.",
    another: "Register another business",
    account: "Back to my account",
  },
  fr: {
    title: "Enregistrez votre entreprise",
    intro:
      "Présentez-nous votre entreprise. Notre équipe examine chaque demande avant toute publication.",
    stepsTitle: "Comment ça marche",
    steps: [
      {
        title: "Envoyez votre demande",
        body: "Remplissez le formulaire avec les informations de votre entreprise.",
      },
      {
        title: "Nous l'examinons",
        body: "L'équipe Verso Air vérifie les informations et peut vous contacter par e-mail.",
      },
      {
        title: "Vous êtes en ligne",
        body: "Une fois la demande approuvée, votre entreprise est répertoriée et le portail Carrières se débloque pour publier des offres.",
      },
    ],
    start: "Enregistrer une entreprise",
    pendingTitle: "Demande reçue : en cours d'examen",
    pendingBody: (name: string) =>
      `Nous examinons ${name}. Elle n'apparaîtra pas dans l'annuaire avant son approbation.`,
    reference: "Référence",
    followTickets: "Suivre cette demande dans Tickets",
    emailOnly:
      "Notre équipe a reçu votre demande par e-mail. Conservez la référence ci-dessus si vous devez nous contacter.",
    another: "Enregistrer une autre entreprise",
    account: "Retour à mon compte",
  },
} as const;

const STEP_ICONS = [ClipboardList, ShieldCheck, Briefcase] as const;

export default function BusinessRequestPage() {
  const { user } = useAuthContext();
  const { currentLang } = useLanguage();
  const copy = COPY[resolveLang(currentLang)];
  const [submitted, setSubmitted] = useState<BusinessFormResult | null>(null);
  // Remounting the form is what reopens its dialog for another business.
  const [formKey, setFormKey] = useState(0);

  // The intent saved before sign-up only needs to carry the visitor here once.
  useEffect(() => {
    clearBusinessIntent();
  }, []);

  const submitter = user?.displayName || user?.name || user?.username || null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Building2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold">{copy.title}</h1>
          <p className="text-muted-foreground">{copy.intro}</p>
        </header>

        {submitted ? (
          <Card role="status" aria-live="polite">
            <CardHeader className="items-center text-center">
              <CheckCircle2
                className="h-10 w-10 text-primary"
                aria-hidden="true"
              />
              <CardTitle>{copy.pendingTitle}</CardTitle>
              <CardDescription>
                {copy.pendingBody(submitted.name)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {submitted.referenceId ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">
                    {copy.reference}:{" "}
                  </span>
                  <span className="font-mono font-semibold">
                    {submitted.referenceId}
                  </span>
                </p>
              ) : null}
              {!submitted.recorded ? (
                <p className="text-sm text-muted-foreground">{copy.emailOnly}</p>
              ) : null}
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                {submitted.recorded ? (
                  <Button asChild>
                    <Link href="/tickets">{copy.followTickets}</Link>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(null);
                    setFormKey((key) => key + 1);
                  }}
                >
                  {copy.another}
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/profile">{copy.account}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section aria-labelledby="business-request-steps">
              <h2 id="business-request-steps" className="mb-4 text-lg font-semibold">
                {copy.stepsTitle}
              </h2>
              <ol className="grid gap-4 sm:grid-cols-3">
                {copy.steps.map((step, index) => {
                  const Icon = STEP_ICONS[index];
                  return (
                    <li
                      key={step.title}
                      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
                    >
                      <Icon
                        className="mb-3 h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                      <p className="font-medium">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="flex justify-center">
              <BusinessForm
                key={formKey}
                requireApproval
                defaultOpen
                username={submitter}
                triggerLabel={copy.start}
                onSuccess={setSubmitted}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
