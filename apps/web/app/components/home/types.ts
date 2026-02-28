export type ParticipationType = "First-come" | "Lottery" | "Members-only";

export type StartingSoonSession = {
  id: number;
  vtuber: string;
  title: string;
  thumbnail: string;
  startsInSeconds: number;
  slotsTotal: number;
  slotsLeft: number;
  participationType: ParticipationType;
  isSubscribed: boolean;
  tags: string[];
  description: string;
  duration: string;
  glowColor: string;
};

export type LiveSession = {
  id: number;
  vtuber: string;
  title: string;
  thumbnail: string;
  viewers: number;
  slotsTotal: number;
  slotsLeft: number;
  participationType: "First-come" | "Lottery";
  isSubscribed: boolean;
  tags: string[];
  description: string;
  duration: string;
  userHistory?: {
    totalParticipations: number;
    lastParticipation: string;
  };
};

export type ScheduleItem = {
  id: number;
  time: string;
  vtuber: string;
  title: string;
  thumbnail: string;
  isMembersOnly: boolean;
  isLottery: boolean;
  hasReserved: boolean;
  tags: string[];
};

export type ModalSession = {
  id: number;
  vtuber: string;
  title: string;
  thumbnail: string;
  startsIn: string;
  slotsLeft: number;
  description: string;
  duration: string;
  participationType: "First-come" | "Lottery";
  isSubscribed: boolean;
  userHistory?: {
    totalParticipations: number;
    lastParticipation: string;
  };
};

export type TypeInfo = {
  label: string;
  bg: string;
  icon: string;
};
