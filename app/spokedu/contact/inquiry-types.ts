export type InquiryType = 'private' | 'dispatch' | 'spomove' | 'curriculum' | 'other';

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

export type SpomoveInquiryFields = InquiryCommonFields & {
  organizationName: string;
  targetAge: string;
  expectedParticipants: string;
  preferredOperation: string;
};

export type CurriculumInquiryFields = InquiryCommonFields & {
  nameOrOrg: string;
  inquiryPurpose: string;
  utilizationTarget: string;
  /** 대상 연령 — CurriculumInquiryForm AGE_OPTIONS와 동일 분류. preferredRegion과 별개 필드 */
  targetAge: string;
};

export type OtherInquiryFields = InquiryCommonFields & {
  nameOrOrg: string;
  collaborationPurpose: string;
};

export type PrivateInquiryPayload = PrivateInquiryFields & {
  type: 'private';
  createdAt: string;
};

export type DispatchInquiryPayload = DispatchInquiryFields & {
  type: 'dispatch';
  createdAt: string;
};

export type SpomoveInquiryPayload = SpomoveInquiryFields & {
  type: 'spomove';
  createdAt: string;
};

export type CurriculumInquiryPayload = CurriculumInquiryFields & {
  type: 'curriculum';
  createdAt: string;
};

export type OtherInquiryPayload = OtherInquiryFields & {
  type: 'other';
  createdAt: string;
};

export type InquiryPayload =
  | PrivateInquiryPayload
  | DispatchInquiryPayload
  | SpomoveInquiryPayload
  | CurriculumInquiryPayload
  | OtherInquiryPayload;
