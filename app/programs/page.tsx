import { redirect } from 'next/navigation';
import { HOME_PROGRAM_SYSTEM_HREF } from '../spokedu/data/site';

export default function ProgramsRedirectPage() {
  redirect(HOME_PROGRAM_SYSTEM_HREF);
}
