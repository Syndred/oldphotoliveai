jest.mock('@/components/AnimationLandingPage', () => ({ __esModule: true, default: () => null }));

import { generateMetadata as animate } from '@/app/[locale]/animate/page';
import { generateMetadata as animateFree } from '@/app/[locale]/animate-free/page';
import { generateMetadata as bringToLife } from '@/app/[locale]/bring-to-life/page';
import { generateMetadata as toVideo } from '@/app/[locale]/to-video/page';
import { getAnimationLandingPage } from '@/content/animation-landing-pages';

describe('English-only animation canonicals', () => {
  it.each([
    ['/animate', animate],
    ['/animate-free', animateFree],
    ['/bring-to-life', bringToLife],
    ['/to-video', toVideo],
  ] as const)('%s points to the canonical English destination', async (path, generateMetadata) => {
    for (const locale of ['en', 'zh', 'es', 'ja']) {
      const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(metadata.alternates?.canonical).toBe(`https://oldphotoliveai.com${path}`);
      expect(metadata.alternates?.languages).toEqual({
        en: `https://oldphotoliveai.com${path}`,
        'x-default': `https://oldphotoliveai.com${path}`,
      });
    }
  });
});


describe('animation search snippets', () => {
  it.each([
    ['animate-free', /animate a clear old portrait/i],
    ['bring-to-life', /bring old photos to life with AI/i],
    ['to-video', /photo-to-video AI/i],
    ['animate', /animate old photos with AI/i],
  ] as const)('describes the %s intent and actual purchase terms concisely', (slug, intent) => {
    const page = getAnimationLandingPage(slug);
    expect(page.description).toMatch(intent);
    expect(page.description).toContain('$1.99');
    expect(page.description).toMatch(/no subscription/i);
    expect(page.description.length).toBeLessThanOrEqual(160);
    expect(page.description).not.toMatch(/upload your photo, sign in|free trial|free credits/i);
  });

  it('answers the workflow questions without repeating a generic checkout script', () => {
    const pages = ['animate-free', 'bring-to-life', 'to-video', 'animate'] as const;
    const firstAnswers = pages.map(slug => getAnimationLandingPage(slug).faqs[0].answer);
    expect(new Set(firstAnswers).size).toBe(firstAnswers.length);
    for (const slug of pages) {
      const page = getAnimationLandingPage(slug);
      const body = [page.heroDescription, ...page.highlights, ...page.benefits.map(item => item.body), ...page.guideSections.map(item => item.body), ...page.faqs.map(item => item.answer)].join(' ');
      expect(body).not.toContain('Upload your photo, sign in, and pay $1.99 before processing with your selected tool.');
    }
  });
});
