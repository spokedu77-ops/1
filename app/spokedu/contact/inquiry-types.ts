export type InquiryType = 'private' | 'dispatch' | 'curriculum';

export type InquiryCommonFields = {
  name: string;
  phone: string;
  email: string;
  message: string;
};

export type PrivateInquiryFields = InquiryCommonFields & {
  childAge: string;
  exerciseExperience: string;
  concern: string;
  preferredClassType: string;
  preferredLocation: string;
  preferredTime: string;
};

export type DispatchInquiryFields = InquiryCommonFields & {
  organizationName: string;
  organizationType: string;
  targetAge: string;
  expectedParticipants: string;
  availableSpace: string;
  preferredSchedule: string;
  preferredProgram: string;
  proposalNeeded: string;
};

export type CurriculumInquiryFields = InquiryCommonFields & {
  nameOrOrg: string;
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
