export type ExplanationAudience = 'parent' | 'center' | 'school';

export type MasterExplanationDto = {
  id: string;
  programId: string;
  programTitle: string;
  audience: ExplanationAudience;
  text: string;
  createdAt: string;
};

export type CreateExplanationInput = Omit<MasterExplanationDto, 'id' | 'createdAt'>;
