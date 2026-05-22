export type InquiryType = 'private' | 'dispatch' | 'curriculum';

export type InquiryCommonFields = {
  name: string;
  phone: string;
  email: string;
  preferredRegion: string;
  message: string;
};

export type PrivateInquiryFields = InquiryCommonFields & {
  childAge: string;
  preferredClassType: string;
  preferredLocation: string;
};

export type DispatchInquiryFields = InquiryCommonFields & {
  organizationName: string;
  targetAge: string;
  expectedParticipants: string;
  preferredOperation: string;
};

export type CurriculumInquiryFields = InquiryCommonFields & {
  nameOrOrg: string;
  inquiryPurpose: string;
  utilizationTarget: string;
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
