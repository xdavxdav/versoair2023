import { GEOADMIN_CONTACTS } from "@/lib/geoadmin-pricing";
import { useLocalizedContent } from "@/hooks/use-localized-content";

export default function GeoAdminContacts({ light = false }: { light?: boolean }) {
  const localize = useLocalizedContent(false);
  const linkClass = `inline-flex min-h-11 items-center rounded-md underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${light ? "text-emerald-800" : "text-[#f4d779]"}`;
  return localize(
    <div data-testid="geoadmin-contacts" className="min-w-0 space-y-3 text-sm">
      <p className="font-semibold">Contact Us</p>
      {GEOADMIN_CONTACTS.map(contact => (
        <div key={contact.phone} className="flex min-w-0 flex-wrap items-center gap-x-4">
          <a href={`tel:${contact.phone}`} className={linkClass}>
            <span translate="no" className="notranslate">{contact.display}</span>
          </a>
          <a
            href={`https://wa.me/${contact.phone.slice(1)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            aria-label={`WhatsApp ${contact.display}`}
          >
            WhatsApp<span className="sr-only"> (new tab)</span>
          </a>
        </div>
      ))}
      <a href="mailto:support@versoair.com" className={`${linkClass} break-all`}>
        support@versoair.com
      </a>
    </div>,
  );
}
