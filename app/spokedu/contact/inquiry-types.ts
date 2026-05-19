export type InquiryType = 'private' | 'dispatch' | 'curriculum';

export type PrivateInquiryFields = {
  guardianName: string;
  phone: string;
  childAge: string;
  exerciseExperience: string;
  concern: string;
  preferredClassType: string;
  preferredLocation: string;
  preferredTime: string;
};

export type DispatchInquiryFields = {
  organizationName: string;
  managerName: string;
  phone: string;
  organizationType: string;
  targetAge: string;
  expectedParticipants: string;
  availableSpace: string;
  preferredSchedule: string;
  preferredProgram: string;
  proposalNeeded: string;
};

export type CurriculumInquiryFields = {
  nameOrOrg: string;
  phone: string;
  contentType: string;
  targetAge: string;
  purpose: string;
  trainingNeeded: string;
  partnershipType: string;
};

export type PrivateInquiryPayload = PrivateInquiryFields & {
  type: 'private';
  createdAt: string;
};

export type DispatchInquiryPayload = DispatchInquiryFields & {
  type: 'dispatch';
  createdAt: string;
};

export type CurriculumInquiryPayload = CurriculumInquiryFields & {
  type: 'curriculum';
  createdAt: string;
};

export type InquiryPayload = PrivateInquiryPayload | DispatchInquiryPayload | CurriculumInquiryPayload;
