jest.mock('@/components/AnimationLandingPage', () => ({ __esModule: true, default: () => null }));

import { generateMetadata as animate } from '@/app/[locale]/animate/page';
import { generateMetadata as animateFree } from '@/app/[locale]/animate-free/page';
import { generateMetadata as bringToLife } from '@/app/[locale]/bring-to-life/page';
import { generateMetadata as toVideo } from '@/app/[locale]/to-video/page';

describe('English-only animation canonicals', () => {
  it.each([
    ['/animate', animate],
    ['/animate-free', animateFree],
    ['/bring-to-life', bringToLife],
    ['/to-video', toVideo],
  ] as const)('%s points to the canonical English destination', (path, generateMetadata) => {
    for (const locale of ['en', 'zh', 'es', 'ja']) {
      const metadata = generateMetadata({ params: { locale } });
      expect(metadata.alternates?.canonical).toBe(`https://oldphotoliveai.com${path}`);
      expect(metadata.alternates?.languages).toEqual({
        en: `https://oldphotoliveai.com${path}`,
        'x-default': `https://oldphotoliveai.com${path}`,
      });
    }
  });
});
