import { redirect } from 'next/navigation';
import { HOME_PROGRAM_SYSTEM_HREF } from '../data/site';

export default function SpokeduProgramsRedirectPage() {
  redirect(HOME_PROGRAM_SYSTEM_HREF);
}
