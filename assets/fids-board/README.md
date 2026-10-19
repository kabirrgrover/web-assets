# fids-board

![FIDS board demo](demo/preview.gif)

Full walkthrough: [demo/demo.mp4](demo/demo.mp4)

A dot-matrix departures-board display (the "FIDS" look from airport boards) as a zero-dependency Web Component. Text changes animate with a scramble-then-settle flip, and an optional synthesized flap sound plays along. Includes a world-clock controller and a full demo page.

```
fids-board.js    the component + createFlapSound()     (standalone, ~17 KB)
world-clock.js   WorldClock controller + 130 cities     (optional)
index.html       full demo: settings, search, themes
demo/            walkthrough video, GIF preview, screenshot
```

## Run the demo

ES modules don't load from `file://`, so serve the folder:

```bash
npx serve .            # or: python3 -m http.server
```

## Use the board anywhere

```html
<script type="module" src="fids-board.js"></script>

<fids-board id="b" rows="3" segments="6,14" color="#ffb340"></fids-board>

<script type="module">
  const b = document.getElementById('b');
  b.setRow(0, ['UA 921', 'London']);
  b.setRow(1, ['BA 216', 'Boarding'], { scramble: true });
  b.setRow(2, 'One string spans every cell');
</script>
```

The element sizes itself by aspect ratio, so just give it a width. It works in React, Vue, Svelte, plain HTML, anything.

### Attributes (live)

| attribute | default | meaning |
|---|---|---|
| `rows` | `5` | number of rows |
| `segments` | `5,15` | widths of each column group, in cells |
| `gap` | `1.5` | space between segments, in cells |
| `color` | `#f2f2ee` | lit dot color |
| `dim` | `0.13` | opacity of unlit dots (`0` hides them) |
| `shape` | `round` | `round` for dots, `square` for pixels |
| `speed` | `45` | ms per flip while scrambling |
| `stagger` | `22` | ms delay per column, so rows settle left to right |
| `flips` | `4` | base number of random flips per cell |
| `interactive` | off | rows become clickable and fire `rowclick` |

### Methods

- `setRow(row, value, { scramble, align, force })`: `value` is an array (one string per segment) or a single string. Only changed cells flip unless `scramble: true`. `align: ['right','left']` per segment.
- `setRows([[...], [...]])`
- `getRow(row)` returns segment strings
- `scramble(rows?)` replays the flip on lit cells
- `clear()`
- `board.instant = true` disables animation (also automatic under `prefers-reduced-motion`)

### Events

- `rowclick`: `{ row }`
- `flip`: `{ count }` once per frame with flips (hook sound here)
- `settled`: animation finished

### Sound

```js
import { createFlapSound } from './fids-board.js';
const sound = createFlapSound({ volume: 0.6, style: 'clack' }); // or 'soft'
board.addEventListener('flip', (e) => sound.play(e.detail.count));
button.addEventListener('click', () => sound.unlock()); // browsers need one user gesture
```

### Custom glyphs

Supported out of the box: A to Z, 0 to 9, space and `: . , ' - + / ! ? # % & ( ) = < > * $ @ _`. Accents are stripped (São Paulo becomes SAO PAULO). Add more:

```js
import { defineGlyph } from './fids-board.js';
defineGlyph('£', ['00110','01001','01000','11100','01000','01000','11111']);
```

## World clock

```js
import { WorldClock, findCity, searchCities } from './world-clock.js';

const clock = new WorldClock(board, { cities: ['Los Angeles', 'New York', 'London'], hour12: false });
clock.start();                          // ticks every second, only changed digits flip
clock.setCity(1, findCity('Dubai'));    // swap a row
clock.addCity(findCity('Sydney'));
clock.setHour12(true);
searchCities('san');                    // ranked matches for a search box
```

Time zones come from the browser's `Intl` database, so daylight saving is always right with no extra data. Add a city by appending `['Name', 'Country', 'IANA/Zone']` to the `RAW` list in `world-clock.js`.

## Other ideas it fits

Status boards, build/deploy monitors, live metrics tickers, countdowns, a "now playing" line, event schedules, queue numbers. Anything with short uppercase text that changes.
