import type { ThreadLabScenario } from "./threadLab.types";

export const threadLabScenario: ThreadLabScenario = {
  tradeTitle: "Landing page design ↔ Product photos",
  tradeStatus: "Open",
  tradeMeta: "Remote · This week · Public trade",
  needTitle: "Landing page design",
  needDescription:
    "I need a clean one-page landing page for a small product launch. The page should include a hero, sections, and a clear CTA.",
  offerTitle: "Product photography",
  offerDescription:
    "I can shoot and edit a small set of product photos for ecommerce or a launch page. Includes 10 edited photos.",
  owner: {
    id: "mina",
    name: "Mina",
    initials: "MI",
    roleLabel: "Trade owner",
  },
  applicant: {
    id: "sara",
    name: "Sara",
    initials: "SA",
    roleLabel: "Applicant",
  },
  publicMessages: [
    {
      id: "pub-1",
      authorId: "sara",
      body: "Is remote collaboration okay for this trade? I can share Figma comments and a quick review call.",
      createdAtLabel: "12 min",
    },
    {
      id: "pub-2",
      authorId: "mina",
      body: "Yes, remote is fine. I mainly need a clean first version and clear sections.",
      createdAtLabel: "9 min",
    },
    {
      id: "pub-3",
      authorId: "sara",
      body: "Great. I’ll send a private proposal with more details.",
      createdAtLabel: "5 min",
      edited: true,
    },
  ],
  privateMessages: [
    {
      id: "priv-1",
      authorId: "sara",
      body: "I can review the page structure first, then prepare a clean layout direction by Friday.",
      createdAtLabel: "12:24",
    },
    {
      id: "priv-2",
      authorId: "mina",
      body: "That works. I can do the photo set this weekend. Do you need white background only?",
      createdAtLabel: "12:29",
    },
    {
      id: "priv-3",
      authorId: "sara",
      body: "White background is perfect. I’ll keep all details here so the agreement stays clear.",
      createdAtLabel: "12:31",
      edited: true,
    },
  ],
  proposalStatus: "Pending proposal",
  proposalSummary:
    "Sara offers a landing page review and asks for product photos in return.",
  acceptedDealSummary:
    "Accepted deal snapshot: Mina gives product photos. Sara gives landing page review.",
  safetyNotes: [
    "Keep important agreement details in this private thread.",
    "Do not share passwords, card details, or sensitive documents.",
    "Use report problem before marking a deal completed if something feels wrong.",
  ],
};
