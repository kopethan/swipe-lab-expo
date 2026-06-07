export type ThreadLabMode = "public" | "private";

export type ThreadParticipant = {
  id: string;
  name: string;
  initials: string;
  roleLabel: string;
};

export type ThreadMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAtLabel: string;
  edited?: boolean;
  deleted?: boolean;
};

export type ThreadLabScenario = {
  tradeTitle: string;
  tradeStatus: string;
  tradeMeta: string;
  needTitle: string;
  needDescription: string;
  offerTitle: string;
  offerDescription: string;
  owner: ThreadParticipant;
  applicant: ThreadParticipant;
  publicMessages: ThreadMessage[];
  privateMessages: ThreadMessage[];
  proposalStatus: string;
  proposalSummary: string;
  acceptedDealSummary: string;
  safetyNotes: string[];
};
