import RecordsPage from './records';
import { listPublicRecordCards } from '@/app/lib/server/fieldRecords';

export default async function RecordsServerPage() {
  return <RecordsPage initialRecords={await listPublicRecordCards()} />;
}
