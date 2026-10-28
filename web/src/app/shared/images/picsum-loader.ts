import { ImageLoaderConfig } from '@angular/common';

// Intrinsic size of the image as rendered, passed to NgOptimizedImage through [loaderParams]
export interface PicsumLoaderParams {
  width: number;
  height: number;
}

const DEFAULT_SIZE: PicsumLoaderParams = { width: 600, height: 400 };

// NgOptimizedImage loader for Picsum: `ngSrc` is the photo id and the image is requested at the
// size it is displayed. The base src has no width, srcset entries do (e.g. 2x on retina screens),
// and the height always keeps the aspect ratio of the loader params.
export function picsumLoader(config: ImageLoaderConfig): string {
  const size = (config.loaderParams as PicsumLoaderParams | undefined) ?? DEFAULT_SIZE;
  const width = Math.round(config.width ?? size.width);
  const height = Math.round((width * size.height) / size.width);
  return `https://picsum.photos/id/${config.src}/${width}/${height}`;
}

// Height for a photo shown at `width`, keeping its original aspect ratio
export function scaledHeight(photo: { width: number; height: number }, width: number): number {
  return Math.round((width * photo.height) / photo.width);
}
