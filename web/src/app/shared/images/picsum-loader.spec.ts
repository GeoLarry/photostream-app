import { picsumLoader, scaledHeight } from './picsum-loader';

describe('picsumLoader', () => {
  it('should request grid cards at 600x400', () => {
    expect(picsumLoader({ src: '42', loaderParams: { width: 600, height: 400 } }))
      .toBe('https://picsum.photos/id/42/600/400');
  });

  it('should default to the grid size when no loader params are given', () => {
    expect(picsumLoader({ src: '42' })).toBe('https://picsum.photos/id/42/600/400');
  });

  it('should keep the aspect ratio for srcset widths', () => {
    expect(picsumLoader({ src: '42', width: 1200, loaderParams: { width: 600, height: 400 } }))
      .toBe('https://picsum.photos/id/42/1200/800');
  });

  it('should request the detail image at 1200px wide with the photo aspect ratio', () => {
    const height = scaledHeight({ width: 5000, height: 3333 }, 1200);
    expect(height).toBe(800);
    expect(picsumLoader({ src: '7', loaderParams: { width: 1200, height } }))
      .toBe('https://picsum.photos/id/7/1200/800');
  });
});
