import type { MeHubSection, NavLabTab, PlanPreview, TradeFilter, TradePreview } from "./navLab.types";

export const navLabTabs: NavLabTab[] = [
  {
    id: "plans",
    label: "Plans",
    tagline: "Find people around bigger goals.",
  },
  {
    id: "me",
    label: "Me",
    tagline: "Your activity, tools, and account in one calm hub.",
  },
  {
    id: "trade",
    label: "Trade",
    tagline: "Find one exchange at a time.",
  },
];

export const meHubSections: MeHubSection[] = [
  {
    id: "activity",
    title: "Activity",
    eyebrow: "What you are doing",
    summary: "Trades, proposals, needs, and offers stay together here instead of becoming separate main tabs.",
    items: [
      { id: "my-trades", label: "My trades", count: 4, subtitle: "Open and accepted exchanges" },
      { id: "proposals", label: "Proposals", count: 2, subtitle: "Private requests and replies" },
      { id: "my-needs", label: "My needs", count: 7, subtitle: "Things you are looking for" },
      { id: "my-offers", label: "My offers", count: 5, subtitle: "Skills, time, access, or objects" },
    ],
  },
  {
    id: "plans",
    title: "Plans",
    eyebrow: "Bigger goals",
    summary: "Created and joined plans can become the future home for multi-step social projects.",
    items: [
      { id: "created-plans", label: "Created plans", count: 3, subtitle: "Your public or private goals" },
      { id: "joined-plans", label: "Joined plans", count: 1, subtitle: "Plans where you offered help" },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    eyebrow: "Personal utilities",
    summary: "Private organization tools stay close to the user without feeling like old account settings.",
    items: [
      { id: "saved-library", label: "Saved Library", count: 12, subtitle: "Saved people, trades, needs, and offers" },
      { id: "agenda", label: "Agenda", subtitle: "Private follow-ups and reminders" },
      { id: "notifications", label: "Notifications", count: 3, subtitle: "Updates that need attention" },
    ],
  },
  {
    id: "account",
    title: "Account",
    eyebrow: "Profile and settings",
    summary: "The account area becomes a smaller section instead of the whole identity of the tab.",
    items: [
      { id: "public-profile", label: "Public profile", subtitle: "How others see you" },
      { id: "settings", label: "Settings", subtitle: "Language, privacy, and preferences" },
      { id: "support", label: "Support", subtitle: "Help, safety, and feedback" },
    ],
  },
];

export const planPreviews: PlanPreview[] = [
  {
    id: "launch-app-paris",
    category: "Startup",
    title: "Launch my app in Paris",
    status: "Open",
    summary: "A public goal page for finding early testers, copy feedback, and simple launch help.",
    needs: ["5 app testers", "French copy review", "Landing page feedback"],
    offers: ["Product photo editing", "UX feedback"],
    interestedCount: 3,
    joinedCount: 1,
    nextStep: "Ask for help on app testing",
  },
  {
    id: "practice-french-locally",
    category: "Social",
    title: "Practice French locally",
    status: "Open",
    summary: "A calm social plan for language practice, walks, and small mutual support.",
    needs: ["Conversation walk", "Cafe practice partner", "Help with French slang"],
    offers: ["English conversation", "Portrait photos"],
    interestedCount: 4,
    joinedCount: 2,
    nextStep: "Join as a conversation partner",
  },
  {
    id: "move-apartment",
    category: "Local",
    title: "Move into a new apartment",
    status: "Draft",
    summary: "A practical plan that groups small local needs and useful offers before becoming trades.",
    needs: ["Someone with a small car", "Borrow a drill", "Help carrying plants"],
    offers: ["Website feedback", "Cook a homemade meal", "Photo editing"],
    interestedCount: 0,
    joinedCount: 0,
    nextStep: "Create first open need",
  },
];

export const tradeFilters: TradeFilter[] = [
  {
    id: "all",
    label: "All",
    helper: "Trades, open needs, open offers, and starter ideas together.",
  },
  {
    id: "trades",
    label: "Trades",
    helper: "Need plus offer exchange cards only.",
  },
  {
    id: "needs",
    label: "Needs",
    helper: "Open needs from people who are still deciding what they can offer.",
  },
  {
    id: "offers",
    label: "Offers",
    helper: "Open offers from people ready to help first.",
  },
];

export const tradePreviews: TradePreview[] = [
  {
    id: "landing-photos",
    type: "trade",
    needTitle: "Landing page feedback",
    offerTitle: "Product photos",
    meta: "Remote · Creative · 7 days left",
    footerLabel: "Open trade",
  },
  {
    id: "french-walk-video",
    type: "trade",
    needTitle: "Practice French on a walk",
    offerTitle: "Basic video editing help",
    meta: "Paris · Social · This week",
    footerLabel: "Open trade",
  },
  {
    id: "open-need-admin-letter",
    type: "open_need",
    title: "Explain a French admin letter",
    meta: "Open need · Local / remote · Flexible",
    footerLabel: "Offer help",
  },
  {
    id: "open-offer-product-photos",
    type: "open_offer",
    title: "I can take simple product photos outdoors",
    meta: "Open offer · Creative · Weekend",
    footerLabel: "Use this offer",
  },
  {
    id: "starter-tripod-photos",
    type: "starter",
    needTitle: "Borrow a tripod for one day",
    offerTitle: "Edit five photos",
    meta: "Starter idea · Object / access",
    footerLabel: "Create your version",
    placementNote: "Preview: appears after a few real items when the feed is quiet.",
  },
  {
    id: "open-need-quiet-table",
    type: "open_need",
    title: "Find a quiet table for a video call",
    meta: "Open need · Access · Today",
    footerLabel: "Offer a place",
  },
];
