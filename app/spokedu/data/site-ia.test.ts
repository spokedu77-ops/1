import { homePage } from './home-page';
import {
  AUDIENCE_TRACK_ORDER,
  AUDIENCE_TRACK_PATHS,
  SPOKEDU_BASE_PATH,
  siteNavItems,
} from './site';

const audiencePaths = AUDIENCE_TRACK_ORDER.map((trackId) => AUDIENCE_TRACK_PATHS[trackId]);

describe('spokedu site IA', () => {
  it('aligns nav audience tracks with 기관→개인→커리큘럼 order', () => {
    const navAudiencePaths = siteNavItems
      .map((item) => item.path)
      .filter((path) => audiencePaths.includes(path));

    expect(navAudiencePaths).toEqual(audiencePaths);
  });

  it('aligns home audience paths with nav track order', () => {
    expect(homePage.audiencePaths.items.map((item) => item.trackId)).toEqual([...AUDIENCE_TRACK_ORDER]);
    expect(homePage.audiencePaths.items.map((item) => item.href)).toEqual(
      AUDIENCE_TRACK_ORDER.map((trackId) => `${SPOKEDU_BASE_PATH}${AUDIENCE_TRACK_PATHS[trackId]}`),
    );
  });
});
