export type InquiryType = 'private' | 'dispatch' | 'curriculum';

export type InquiryCommonFields = {
  name: string;
  phone: string;
  email: string;
  type: InquiryType;
  message: string;
  createdAt: string;
};

export type PrivateInquiryFields = {
  childAge: string;
  exerciseExperience: string;
  concern: string;
  preferredClassType: string;
  preferredLocation: string;
  preferredTime: string;
};

export type DispatchInquiryFields = {
  organizationName: string;
  organizationType: string;
  targetAge: string;
  expectedParticipants: string;
  availableSpace: string;
  preferredProgram: string;
  proposalNeeded: string;
};

export type CurriculumInquiryFields = {
  contentType: string;
  targetAge: string;
  purpose: string;
  trainingNeeded: string;
  partnershipType: string;
};

export type PrivateInquiryPayload = InquiryCommonFields &
  PrivateInquiryFields & {
    type: 'private';
  };

export type DispatchInquiryPayload = InquiryCommonFields &
  DispatchInquiryFields & {
    type: 'dispatch';
  };

export type CurriculumInquiryPayload = InquiryCommonFields &
  CurriculumInquiryFields & {
    type: 'curriculum';
  };

export type InquiryPayload = PrivateInquiryPayload | DispatchInquiryPayload | CurriculumInquiryPayload;
