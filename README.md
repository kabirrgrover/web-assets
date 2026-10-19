# web-assets

Reusable web components and UI pieces I build once and drop into future projects. Each asset is self-contained: copy its folder, import the file, done. No build step, no dependencies unless noted.

## Assets

| Asset | What it is | Preview |
|---|---|---|
| [fids-board](assets/fids-board) | Dot-matrix departures board as a Web Component. Scramble-then-settle flip animation, synthesized flap sound, dots or pixels, any color. Ships with a world clock and a full demo. | <img src="assets/fids-board/demo/screenshot.png" width="320"> |

## Using an asset

Every asset folder has the same layout:

```
assets/<name>/
  <name>.js     the reusable piece (ES module)
  index.html    working demo
  README.md     API, options, examples
  demo/         video, GIF preview, screenshot
```

Run any demo by serving its folder (ES modules don't load from `file://`):

```bash
cd assets/fids-board && npx serve .
```

Or load straight from this repo via jsDelivr:

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/kabirrgrover/web-assets@main/assets/fids-board/fids-board.js"></script>
```

## Adding a new asset

1. Make `assets/<name>/` following the layout above.
2. Record a short demo into `demo/` (`demo.mp4`, `preview.gif`, `screenshot.png`).
3. Add a row to the table above.

## License

MIT
