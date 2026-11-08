export { default } from '../spokedu/website/pages/home-server';
import { buildSpokeduMetadata } from '../spokedu/data/seo';
export const metadata = buildSpokeduMetadata('home');
export const revalidate = 86400;
