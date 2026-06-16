export type ChainParticipantId = "you" | "sara" | "alex";

export type ChainParticipant = {
  id: ChainParticipantId;
  name: string;
  initials: string;
  roleLabel: string;
  needTitle: string;
  offerTitle: string;
  receivesFromId: ChainParticipantId;
  givesToId: ChainParticipantId;
  timingLabel: string;
  modeLabel: string;
  effortLabel: string;
  joined: boolean;
};

export type ChainLabScenario = {
  id: string;
  title: string;
  subtitle: string;
  statusLabel: string;
  helperText: string;
  currentUserId: ChainParticipantId;
  order: ChainParticipantId[];
  participants: ChainParticipant[];
};
