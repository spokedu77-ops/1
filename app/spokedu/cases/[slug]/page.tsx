import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../../data/site';

type CaseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function SpokeduCaseDetailPage(_props: CaseDetailPageProps) {
  redirect(`${SPOKEDU_BASE_PATH}/records`);
}
