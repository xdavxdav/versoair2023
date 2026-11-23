// Authored copy for the site footer and the "Report an issue" reminder.
// Brand names (VERSO AIR INC., LinkedIn, Facebook) are not translated.
export const FOOTER_COPY = [
  ["Incorporated in Ontario · Toronto, Canada", "Société constituée en Ontario · Toronto, Canada"],
  ["Company", "Entreprise"],
  ["Explore", "Explorer"],
  ["Support", "Assistance"],
  ["Legal", "Mentions légales"],
  ["Contact", "Contact"],
  ["Marketplace", "Marketplace"],
  ["Events", "Événements"],
  ["FAQ", "FAQ"],
  ["Cookies", "Cookies"],
  ["Report an issue", "Signaler un problème"],
  ["Something not working? Report an issue", "Un problème ? Signalez-le"],
  ["All rights reserved.", "Tous droits réservés."],
  ["Footer navigation", "Navigation du pied de page"],
  ["Social media", "Réseaux sociaux"],
] as const;

export const FOOTER_ES = {
  "Incorporated in Ontario · Toronto, Canada": "Sociedad constituida en Ontario · Toronto, Canadá",
  "Company": "Empresa",
  "Explore": "Explorar",
  "Support": "Asistencia",
  "Legal": "Legal",
  "Contact": "Contacto",
  "Marketplace": "Marketplace",
  "Events": "Eventos",
  "FAQ": "Preguntas frecuentes",
  "Cookies": "Cookies",
  "Report an issue": "Informar de un problema",
  "Something not working? Report an issue": "¿Algo no funciona? Infórmalo",
  "All rights reserved.": "Todos los derechos reservados.",
  "Footer navigation": "Navegación del pie de página",
  "Social media": "Redes sociales",
} satisfies Record<(typeof FOOTER_COPY)[number][0], string>;
