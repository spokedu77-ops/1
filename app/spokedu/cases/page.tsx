import { redirect } from 'next/navigation';
import { SPOKEDU_BASE_PATH } from '../data/site';

export default function SpokeduCasesPage() {
  redirect(`${SPOKEDU_BASE_PATH}/records`);
}
