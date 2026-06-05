export type OnboardingGuideSlide = {
  id: string;
  title: string;
  body: string;
  illustrationCaption: string;
  illustrationKey:
    | "welcome"
    | "createNeed"
    | "createOffer"
    | "discoverTrades"
    | "sendProposal"
    | "staySafe"
    | "accountGuide";
};

export const ONBOARDING_GUIDE_SLIDES: OnboardingGuideSlide[] = [
  {
    id: "welcome",
    illustrationKey: "welcome",
    illustrationCaption: "Need + Offer can become a trade.",
    title: "Welcome to Hellowhen",
    body: "Post what you need and what you can offer, then connect around clear trades.",
  },
  {
    id: "create_need",
    illustrationKey: "createNeed",
    illustrationCaption: "A clear Need helps others understand you.",
    title: "Create a Need",
    body: "Add a title, useful details, a category, and optional images so people know what you need.",
  },
  {
    id: "create_offer",
    illustrationKey: "createOffer",
    illustrationCaption: "Offers can be services, items, or help.",
    title: "Create an Offer",
    body: "Share what you can give back, from practical help to creative work or useful items.",
  },
  {
    id: "discover_trades",
    illustrationKey: "discoverTrades",
    illustrationCaption: "Browse trade cards one by one.",
    title: "Discover Trades",
    body: "Explore the Trades feed, open cards that interest you, and find possible matches.",
  },
  {
    id: "send_proposal",
    illustrationKey: "sendProposal",
    illustrationCaption: "Proposals are private between both users.",
    title: "Send a Proposal",
    body: "Choose what you can offer or need, then send a private message to start the conversation.",
  },
  {
    id: "stay_safe",
    illustrationKey: "staySafe",
    illustrationCaption: "Keep important agreement details inside the app.",
    title: "Stay Safe",
    body: "Agree clearly, avoid sensitive information, and report problems if something feels wrong.",
  },
  {
    id: "account",
    illustrationKey: "accountGuide",
    illustrationCaption: "You can replay this guide later from Account.",
    title: "Account & Guide",
    body: "Manage your profile, settings, support, and user guide from the Account area.",
  },
];
