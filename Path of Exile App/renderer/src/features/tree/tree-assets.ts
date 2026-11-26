import {fetchJson} from '@/adapters/api';

interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Atlas {
  filename: string;
  coords: Record<string, SpriteRect>;
}

export interface TreeSprite extends SpriteRect {
  image: CanvasImageSource;
}

export type TreeSprites = (atlas: string, key: string | undefined) => TreeSprite | undefined;

const images = new Map<string, Promise<HTMLImageElement | undefined>>();

function loadImage(filename: string) {
  let request = images.get(filename);
  if (!request) {
    request = new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(undefined);
      image.src = '/tree-data/' + filename;
    });
    images.set(filename, request);
    void request.then(image => {
      if (!image) images.delete(filename);
    });
  }
  return request;
}

export async function loadTreeSprites(): Promise<TreeSprites> {
  const {sprites} = await fetchJson<{sprites: Record<string, Atlas>}>('/tree-data/sprites.json');
  const atlases = new Map<string, Record<string, TreeSprite>>();
  await Promise.all(Object.entries(sprites).map(async ([name, atlas]) => {
    // Sockets use the empty frames. The planner has no equipped-jewel or tattoo state.
    if (name === 'jewel' || name === 'jewelRadius' || name === 'tattooActiveEffect') return;
    // The source names the CDN files. Only their bundled basenames are used here.
    const filename = atlas.filename.match(/\/([a-z0-9-]+\.(?:png|jpg|webp))(?:\?|$)/)?.[1];
    if (!filename) return;
    const image = await loadImage(filename);
    if (!image) return;
    atlases.set(name, Object.fromEntries(Object.entries(atlas.coords)
      .filter(([, rect]) => rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0 &&
        rect.x + rect.w <= image.naturalWidth && rect.y + rect.h <= image.naturalHeight)
      .map(([key, rect]) => [key, {...rect, image}])));
  }));
  return (atlas, key) => key ? atlases.get(atlas)?.[key] : undefined;
}
