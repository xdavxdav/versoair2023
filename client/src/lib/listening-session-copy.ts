/**
 * FR/EN copy for the public listening-session pages. Anything that is not French
 * reads English (see `sessionLang`). A test keeps both languages in step.
 */
import type { SessionLang } from "./listening-session-format";

export interface SessionCopy {
  // List page
  listTitle: string;
  listIntro: string;
  sectionLive: string;
  sectionUpcoming: string;
  sectionReplays: string;
  emptyList: string;
  loadingList: string;
  loadError: string;
  retry: string;
  hostedBy: (host: string) => string;
  trackCount: (count: number) => string;
  cardJoin: string;
  cardDetails: string;
  cardReplay: string;

  // Detail page
  back: string;
  notFoundTitle: string;
  notFoundBody: string;
  loadingSession: string;
  sessionLoadError: string;
  reconnecting: string;
  startsIn: (countdown: string) => string;
  pillLive: string;
  pillEnded: string;
  pillCancelled: string;
  localTimeNote: string;
  copyLink: string;
  linkCopied: string;
  aboutTitle: string;

  // Listening
  joinSession: string;
  joinedWaiting: string;
  leaveSession: string;
  mute: string;
  unmute: string;
  listeningLive: string;
  liveInvite: string;
  tapToListen: string;
  tapHint: string;
  syncing: string;
  nowPlaying: string;
  upNext: string;
  shortBreak: string;
  breakThenNext: (title: string) => string;
  trackUnavailableNow: string;
  trackRetrying: string;
  streamNote: string;
  leftForPlayer: string;
  endedNote: string;
  cancelledNote: string;
  replayButton: string;
  replayNote: string;

  // Tracklist
  tracklistTitle: string;
  tracklistMeta: (count: number, length: string) => string;
  trackUnavailable: string;
  signedBadgeLabel: (grade: string) => string;
  trackPlaying: string;

  // Chat
  chatTitle: string;
  chatHost: string;
  chatEmpty: string;
  chatBeforeStart: string;
  chatEnded: string;
  chatPlaceholder: string;
  chatSend: string;
  chatSending: string;
  chatSignIn: string;
  chatPublicNote: string;
  chatSlowMode: string;
  chatFailed: string;
  chatTooLong: (max: number) => string;
  chatRefreshFailed: string;
  chatLoading: string;
  chatLoadEarlier: string;
}

const en: SessionCopy = {
  listTitle: "Listening sessions",
  listIntro:
    "Live listening parties hosted by Verso Air. Everyone hears the same track at the same moment, and the host talks with you in the live chat.",
  sectionLive: "Live now",
  sectionUpcoming: "Upcoming",
  sectionReplays: "Replays",
  emptyList: "No session is scheduled yet. Check back soon.",
  loadingList: "Loading sessions…",
  loadError: "We couldn't load the sessions.",
  retry: "Try again",
  hostedBy: (host) => `Hosted by ${host}`,
  trackCount: (count) => (count === 1 ? "1 track" : `${count} tracks`),
  cardJoin: "Join",
  cardDetails: "Details",
  cardReplay: "Replay",

  back: "All sessions",
  notFoundTitle: "Session not found",
  notFoundBody: "This session doesn't exist or is no longer available.",
  loadingSession: "Loading the session…",
  sessionLoadError: "We couldn't load this session.",
  reconnecting: "Connection lost. Reconnecting…",
  startsIn: (countdown) => `Starts in ${countdown}`,
  pillLive: "LIVE NOW",
  pillEnded: "Ended",
  pillCancelled: "Cancelled",
  localTimeNote: "Shown in your local time",
  copyLink: "Copy link",
  linkCopied: "Link copied",
  aboutTitle: "About this session",

  joinSession: "Join the session",
  joinedWaiting: "You're in. The music starts by itself when the session goes live.",
  leaveSession: "Leave",
  mute: "Mute",
  unmute: "Unmute",
  listeningLive: "You're listening live",
  liveInvite: "It's live. Join to hear it with everyone, in sync.",
  tapToListen: "Tap to start the sound",
  tapHint: "Your browser needs a tap before it can play sound.",
  syncing: "Syncing with the live session…",
  nowPlaying: "Now playing",
  upNext: "Up next",
  shortBreak: "Short break between tracks",
  breakThenNext: (title) => `Short break · next: ${title}`,
  trackUnavailableNow: "This track isn't available right now. The session carries on.",
  trackRetrying: "We couldn't load this track. Trying again…",
  streamNote: "Listening here counts as streams for the artists.",
  leftForPlayer: "You started something else, so you left the live session.",
  endedNote: "This session has ended. You can replay it below.",
  cancelledNote: "This session was cancelled.",
  replayButton: "Play the replay",
  replayNote: "The replay plays the set in order, at your own pace.",

  tracklistTitle: "Tracklist",
  tracklistMeta: (count, length) =>
    `${count === 1 ? "1 track" : `${count} tracks`} · ${length}`,
  trackUnavailable: "Unavailable",
  signedBadgeLabel: (grade) => `Verso Signed artist, grade ${grade}`,
  trackPlaying: "Playing now",

  chatTitle: "Live chat",
  chatHost: "Host",
  chatEmpty: "No messages yet. Say hello!",
  chatBeforeStart: "The chat opens when the session starts.",
  chatEnded: "The session has ended, so the chat is closed.",
  chatPlaceholder: "Say something…",
  chatSend: "Send",
  chatSending: "Sending…",
  chatSignIn: "Sign in to chat",
  chatPublicNote: "Messages are public and also appear on the community wall.",
  chatSlowMode: "Slow mode: please wait about 30 seconds between messages.",
  chatFailed: "Your message couldn't be sent. Try again.",
  chatTooLong: (max) => `Messages are limited to ${max} characters.`,
  chatRefreshFailed: "We couldn't refresh the chat.",
  chatLoading: "Loading the chat…",
  chatLoadEarlier: "Show earlier messages",
};

const fr: SessionCopy = {
  listTitle: "Sessions d'écoute",
  listIntro:
    "Des écoutes en direct animées par Verso Air. Tout le monde entend le même morceau au même moment, et l'animateur échange avec vous dans le chat en direct.",
  sectionLive: "En direct maintenant",
  sectionUpcoming: "À venir",
  sectionReplays: "Replays",
  emptyList: "Aucune session n'est programmée pour le moment. Revenez bientôt.",
  loadingList: "Chargement des sessions…",
  loadError: "Impossible de charger les sessions.",
  retry: "Réessayer",
  hostedBy: (host) => `Animé par ${host}`,
  trackCount: (count) => (count <= 1 ? `${count} titre` : `${count} titres`),
  cardJoin: "Rejoindre",
  cardDetails: "Détails",
  cardReplay: "Réécouter",

  back: "Toutes les sessions",
  notFoundTitle: "Session introuvable",
  notFoundBody: "Cette session n'existe pas ou n'est plus disponible.",
  loadingSession: "Chargement de la session…",
  sessionLoadError: "Impossible de charger cette session.",
  reconnecting: "Connexion perdue. Reconnexion…",
  startsIn: (countdown) => `Commence dans ${countdown}`,
  pillLive: "EN DIRECT",
  pillEnded: "Terminée",
  pillCancelled: "Annulée",
  localTimeNote: "Affiché dans votre fuseau horaire",
  copyLink: "Copier le lien",
  linkCopied: "Lien copié",
  aboutTitle: "À propos de cette session",

  joinSession: "Rejoindre la session",
  joinedWaiting: "Vous y êtes. La musique démarre toute seule quand la session commence.",
  leaveSession: "Quitter",
  mute: "Couper le son",
  unmute: "Réactiver le son",
  listeningLive: "Vous écoutez en direct",
  liveInvite: "C'est en direct. Rejoignez pour écouter avec tout le monde, en même temps.",
  tapToListen: "Touchez pour lancer le son",
  tapHint: "Votre navigateur exige un geste avant de pouvoir jouer du son.",
  syncing: "Synchronisation avec la session en direct…",
  nowPlaying: "En cours",
  upNext: "À suivre",
  shortBreak: "Courte pause entre deux titres",
  breakThenNext: (title) => `Courte pause · à suivre : ${title}`,
  trackUnavailableNow: "Ce titre n'est pas disponible pour le moment. La session continue.",
  trackRetrying: "Impossible de charger ce titre. Nouvelle tentative…",
  streamNote: "Écouter ici compte comme des écoutes pour les artistes.",
  leftForPlayer: "Vous avez lancé autre chose, vous avez donc quitté la session en direct.",
  endedNote: "Cette session est terminée. Vous pouvez la réécouter ci-dessous.",
  cancelledNote: "Cette session a été annulée.",
  replayButton: "Écouter le replay",
  replayNote: "Le replay joue le set dans l'ordre, à votre rythme.",

  tracklistTitle: "Liste des titres",
  tracklistMeta: (count, length) =>
    `${count <= 1 ? `${count} titre` : `${count} titres`} · ${length}`,
  trackUnavailable: "Indisponible",
  signedBadgeLabel: (grade) => `Artiste signé Verso, grade ${grade}`,
  trackPlaying: "En lecture",

  chatTitle: "Chat en direct",
  chatHost: "Animateur",
  chatEmpty: "Pas encore de message. Dites bonjour !",
  chatBeforeStart: "Le chat ouvre au début de la session.",
  chatEnded: "La session est terminée, le chat est donc fermé.",
  chatPlaceholder: "Écrivez un message…",
  chatSend: "Envoyer",
  chatSending: "Envoi…",
  chatSignIn: "Connectez-vous pour discuter",
  chatPublicNote: "Les messages sont publics et apparaissent aussi sur le mur de la communauté.",
  chatSlowMode: "Mode lent : patientez environ 30 secondes entre deux messages.",
  chatFailed: "Votre message n'a pas pu être envoyé. Réessayez.",
  chatTooLong: (max) => `Les messages sont limités à ${max} caractères.`,
  chatRefreshFailed: "Impossible d'actualiser le chat.",
  chatLoading: "Chargement du chat…",
  chatLoadEarlier: "Afficher les messages précédents",
};

export const SESSION_COPY: Record<SessionLang, SessionCopy> = { en, fr };

export const getSessionCopy = (lang: SessionLang): SessionCopy => SESSION_COPY[lang];
