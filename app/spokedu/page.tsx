export { default } from './website/pages/home-server';
import { buildSpokeduMetadata } from './data/seo';
export const metadata = buildSpokeduMetadata('home');
export const revalidate = 86400;
