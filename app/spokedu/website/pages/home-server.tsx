import HomePage from './home';
import { getFeaturedRecordCards } from '@/app/lib/server/fieldRecords';

export default async function HomeServerPage() {
  return <HomePage stories={await getFeaturedRecordCards()} />;
}
