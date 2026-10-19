# catalog-tree

![catalog-tree](demo/preview.gif)

A root node branches into category pills. The active category fans out into a scattered field of thumbnails, each tied back to its pill by a curved line. Switching categories collapses the field into its node and springs the next one out. Hover lifts a thumbnail, darkens its branch and shows its name. Click opens a lightbox that grows out of the thumbnail, blurs the page behind it, and has a filmstrip for extra images.

Zero dependencies. About 25 KB of JS and 6 KB of CSS, unminified and commented.

## Files

```
catalog-tree.js     the component (UMD: <script>, import, or require)
catalog-tree.css    styles + theme tokens
index.html          working demo (plain scripts, opens straight from file://)
demo-data.js        106 generated placeholder projects (delete for real use)
demo/               video, GIF preview, screenshot
```

Load straight from this repo:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/kabirrgrover/web-assets@main/assets/catalog-tree/catalog-tree.css">
<script src="https://cdn.jsdelivr.net/gh/kabirrgrover/web-assets@main/assets/catalog-tree/catalog-tree.js"></script>
```

Pin a commit instead of `@main` for production.

## Quick start

```html
<link rel="stylesheet" href="catalog-tree.css">
<div id="catalog" style="height: 100vh"></div>

<script src="catalog-tree.js"></script>
<script>
  const tree = CatalogTree.mount('#catalog', {
    rootLabel: 'Catalog',
    categories: [
      { id: 'logo', label: 'Logo' },
      { id: 'digital', label: 'Digital' },
      { id: 'physical', label: 'Physical' }
    ],
    items: [
      {
        id: 'momentous',
        title: 'Momentous',
        category: 'digital',
        thumb: '/img/momentous/thumb.jpg',
        images: ['/img/momentous/1.jpg', '/img/momentous/2.jpg'],
        ratio: 1.6            // optional, read from the image if left out
      }
    ],
    initial: 'digital'
  });
</script>
```

The host element needs a real height. The component fills it.

### React / Next

```jsx
import { useEffect, useRef } from 'react';
import CatalogTree from './catalog-tree';
import './catalog-tree.css';

export function Catalog({ categories, items }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = CatalogTree.mount(ref.current, { categories, items, initial: categories[0].id });
    return () => t.destroy();
  }, [categories, items]);
  return <div ref={ref} style={{ height: '100vh' }} />;
}
```

In Next.js, put this in a `'use client'` component.

## Options

| Option | Default | What it does |
|---|---|---|
| `rootLabel` | `'Catalog'` | Text on the root pill. Its count is the total item count. |
| `categories` | `[]` | `{ id, label }` in display order. |
| `items` | `[]` | `{ id, title, category, thumb, images?, ratio?, stageRatio? }` |
| `initial` | first category | Category shown on load. |
| `breakpoint` | `720` | Below this host width the tree runs top-down instead of left-to-right. |
| `hoverScale` | `1.45` | How much a thumbnail grows on hover. |
| `density` | `1.1` | Above 1 leaves more empty space in the scatter; 1 packs it tight. |
| `seed` | `11` | Change it to get a different arrangement. Layout is stable for a given seed. |
| `padding` | `24` | Inner padding of the field in px. |
| `intro` | `true` | Burst the first category out on mount. |
| `lightbox` | `true` | Use the built-in lightbox. |
| `blurTargets` | `null` | Extra elements (header, footer) to blur while the lightbox is open. |
| `onCategory(id)` | | Fires on category change. |
| `onOpen(item)` | | Fires on click. Return `false` to skip the lightbox and route somewhere else. |
| `onClose(item)` | | Fires when the lightbox closes. |

## Methods

```js
tree.setCategory('physical');
tree.open('momentous', 2);   // item id, starting image index
tree.close();
tree.next(); tree.prev();    // lightbox navigation
tree.destroy();
```

## Theming

Override tokens on `.ct-host` (or any ancestor):

```css
.ct-host {
  --ct-bg: #0f0f0f;
  --ct-text: #f2f2f2;
  --ct-line: #3a3a3a;          /* branch lines */
  --ct-line-hot: #ffffff;      /* hovered branch + active outline */
  --ct-pill-bg: #1a1a1a;
  --ct-pill-border: #2a2a2a;
  --ct-stage-bg: #1c1c1c;      /* lightbox backdrop behind the image */
  --ct-radius: 3px;
  --ct-font: "Your Font", sans-serif;
}
```

Full list is at the top of `catalog-tree.css`. The demo shows light and dark mapped to the page theme.

## Behavior notes

- Motion is a per-item spring, so lines and thumbnails stay attached mid-flight. The loop sleeps when everything settles.
- Incoming thumbnails stagger by distance from their pill, so the field ripples outward.
- Keyboard: Tab through pills and thumbnails, Enter opens, arrow keys page images, Esc closes. Focus is trapped in the lightbox and returned to the thumbnail after.
- `prefers-reduced-motion` turns the springs and FLIP off and snaps instead.
- Resizes re-lay the field (debounced) without replaying the intro.
- Around 100 to 150 thumbnails per category is comfortable. Past that, use smaller thumbs or paginate categories.
