/*!
 * world-clock.js
 * Drives a <fids-board> as a multi-city world clock. Uses the browser's own
 * time zone database (Intl), so DST is always correct with no extra data.
 *
 *   import { WorldClock, findCity } from './world-clock.js';
 *   const clock = new WorldClock(board, { cities: ['Los Angeles', 'London', 'Tokyo'] });
 *   clock.start();
 *   clock.setCity(2, findCity('Dubai'));
 */

// [name, country, IANA zone]
const RAW = [
  ['Abu Dhabi', 'UAE', 'Asia/Dubai'], ['Accra', 'Ghana', 'Africa/Accra'], ['Addis Ababa', 'Ethiopia', 'Africa/Addis_Ababa'],
  ['Adelaide', 'Australia', 'Australia/Adelaide'], ['Almaty', 'Kazakhstan', 'Asia/Almaty'], ['Amsterdam', 'Netherlands', 'Europe/Amsterdam'],
  ['Anchorage', 'USA', 'America/Anchorage'], ['Athens', 'Greece', 'Europe/Athens'], ['Atlanta', 'USA', 'America/New_York'],
  ['Auckland', 'New Zealand', 'Pacific/Auckland'], ['Austin', 'USA', 'America/Chicago'], ['Baghdad', 'Iraq', 'Asia/Baghdad'],
  ['Baku', 'Azerbaijan', 'Asia/Baku'], ['Bangalore', 'India', 'Asia/Kolkata'], ['Bangkok', 'Thailand', 'Asia/Bangkok'],
  ['Barcelona', 'Spain', 'Europe/Madrid'], ['Beijing', 'China', 'Asia/Shanghai'], ['Beirut', 'Lebanon', 'Asia/Beirut'],
  ['Berlin', 'Germany', 'Europe/Berlin'], ['Bogota', 'Colombia', 'America/Bogota'], ['Boston', 'USA', 'America/New_York'],
  ['Brisbane', 'Australia', 'Australia/Brisbane'], ['Brussels', 'Belgium', 'Europe/Brussels'], ['Bucharest', 'Romania', 'Europe/Bucharest'],
  ['Budapest', 'Hungary', 'Europe/Budapest'], ['Buenos Aires', 'Argentina', 'America/Argentina/Buenos_Aires'], ['Cairo', 'Egypt', 'Africa/Cairo'],
  ['Calgary', 'Canada', 'America/Edmonton'], ['Cape Town', 'South Africa', 'Africa/Johannesburg'], ['Caracas', 'Venezuela', 'America/Caracas'],
  ['Casablanca', 'Morocco', 'Africa/Casablanca'], ['Chennai', 'India', 'Asia/Kolkata'], ['Chicago', 'USA', 'America/Chicago'],
  ['Copenhagen', 'Denmark', 'Europe/Copenhagen'], ['Dallas', 'USA', 'America/Chicago'], ['Delhi', 'India', 'Asia/Kolkata'],
  ['Denver', 'USA', 'America/Denver'], ['Detroit', 'USA', 'America/Detroit'], ['Dhaka', 'Bangladesh', 'Asia/Dhaka'],
  ['Doha', 'Qatar', 'Asia/Qatar'], ['Dubai', 'UAE', 'Asia/Dubai'], ['Dublin', 'Ireland', 'Europe/Dublin'],
  ['Edinburgh', 'UK', 'Europe/London'], ['Frankfurt', 'Germany', 'Europe/Berlin'], ['Geneva', 'Switzerland', 'Europe/Zurich'],
  ['Guatemala City', 'Guatemala', 'America/Guatemala'], ['Hanoi', 'Vietnam', 'Asia/Bangkok'], ['Havana', 'Cuba', 'America/Havana'],
  ['Helsinki', 'Finland', 'Europe/Helsinki'], ['Ho Chi Minh', 'Vietnam', 'Asia/Ho_Chi_Minh'], ['Hong Kong', 'China', 'Asia/Hong_Kong'],
  ['Honolulu', 'USA', 'Pacific/Honolulu'], ['Houston', 'USA', 'America/Chicago'], ['Hyderabad', 'India', 'Asia/Kolkata'],
  ['Istanbul', 'Turkey', 'Europe/Istanbul'], ['Jakarta', 'Indonesia', 'Asia/Jakarta'], ['Jeddah', 'Saudi Arabia', 'Asia/Riyadh'],
  ['Jerusalem', 'Israel', 'Asia/Jerusalem'], ['Johannesburg', 'South Africa', 'Africa/Johannesburg'], ['Kabul', 'Afghanistan', 'Asia/Kabul'],
  ['Karachi', 'Pakistan', 'Asia/Karachi'], ['Kathmandu', 'Nepal', 'Asia/Kathmandu'], ['Kyiv', 'Ukraine', 'Europe/Kyiv'],
  ['Kolkata', 'India', 'Asia/Kolkata'], ['Kuala Lumpur', 'Malaysia', 'Asia/Kuala_Lumpur'], ['Kuwait City', 'Kuwait', 'Asia/Kuwait'],
  ['Lagos', 'Nigeria', 'Africa/Lagos'], ['Lahore', 'Pakistan', 'Asia/Karachi'], ['Las Vegas', 'USA', 'America/Los_Angeles'],
  ['Lima', 'Peru', 'America/Lima'], ['Lisbon', 'Portugal', 'Europe/Lisbon'], ['London', 'UK', 'Europe/London'],
  ['Los Angeles', 'USA', 'America/Los_Angeles'], ['Madrid', 'Spain', 'Europe/Madrid'], ['Manchester', 'UK', 'Europe/London'],
  ['Manila', 'Philippines', 'Asia/Manila'], ['Melbourne', 'Australia', 'Australia/Melbourne'], ['Mexico City', 'Mexico', 'America/Mexico_City'],
  ['Miami', 'USA', 'America/New_York'], ['Milan', 'Italy', 'Europe/Rome'], ['Minneapolis', 'USA', 'America/Chicago'],
  ['Monaco', 'Monaco', 'Europe/Monaco'], ['Montevideo', 'Uruguay', 'America/Montevideo'], ['Montreal', 'Canada', 'America/Toronto'],
  ['Moscow', 'Russia', 'Europe/Moscow'], ['Mumbai', 'India', 'Asia/Kolkata'], ['Munich', 'Germany', 'Europe/Berlin'],
  ['Nairobi', 'Kenya', 'Africa/Nairobi'], ['New Orleans', 'USA', 'America/Chicago'], ['New York', 'USA', 'America/New_York'],
  ['Oslo', 'Norway', 'Europe/Oslo'], ['Panama City', 'Panama', 'America/Panama'], ['Paris', 'France', 'Europe/Paris'],
  ['Perth', 'Australia', 'Australia/Perth'], ['Philadelphia', 'USA', 'America/New_York'], ['Phoenix', 'USA', 'America/Phoenix'],
  ['Prague', 'Czechia', 'Europe/Prague'], ['Reston', 'USA', 'America/New_York'], ['Reykjavik', 'Iceland', 'Atlantic/Reykjavik'],
  ['Riga', 'Latvia', 'Europe/Riga'], ['Rio de Janeiro', 'Brazil', 'America/Sao_Paulo'], ['Riyadh', 'Saudi Arabia', 'Asia/Riyadh'],
  ['Rome', 'Italy', 'Europe/Rome'], ['Samara', 'Russia', 'Europe/Samara'], ['San Diego', 'USA', 'America/Los_Angeles'],
  ['San Francisco', 'USA', 'America/Los_Angeles'], ['San Jose', 'Costa Rica', 'America/Costa_Rica'], ['San Juan', 'Puerto Rico', 'America/Puerto_Rico'],
  ['San Salvador', 'El Salvador', 'America/El_Salvador'], ['Santiago', 'Chile', 'America/Santiago'], ['Santo Domingo', 'Dominican Republic', 'America/Santo_Domingo'],
  ['Sao Paulo', 'Brazil', 'America/Sao_Paulo'], ['Seattle', 'USA', 'America/Los_Angeles'], ['Seoul', 'South Korea', 'Asia/Seoul'],
  ['Shanghai', 'China', 'Asia/Shanghai'], ['Shenzhen', 'China', 'Asia/Shanghai'], ['Singapore', 'Singapore', 'Asia/Singapore'],
  ['Stockholm', 'Sweden', 'Europe/Stockholm'], ['Sydney', 'Australia', 'Australia/Sydney'], ['Taipei', 'Taiwan', 'Asia/Taipei'],
  ['Tallinn', 'Estonia', 'Europe/Tallinn'], ['Tehran', 'Iran', 'Asia/Tehran'], ['Tel Aviv', 'Israel', 'Asia/Jerusalem'],
  ['Tokyo', 'Japan', 'Asia/Tokyo'], ['Toronto', 'Canada', 'America/Toronto'], ['Tunis', 'Tunisia', 'Africa/Tunis'],
  ['Vancouver', 'Canada', 'America/Vancouver'], ['Vienna', 'Austria', 'Europe/Vienna'], ['Warsaw', 'Poland', 'Europe/Warsaw'],
  ['Washington DC', 'USA', 'America/New_York'], ['Wellington', 'New Zealand', 'Pacific/Auckland'], ['Zurich', 'Switzerland', 'Europe/Zurich'],
  ['UTC', 'Coordinated Universal Time', 'UTC'],
];

export const CITIES = RAW.map(([name, country, tz]) => ({ name, country, tz }));

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Exact (case-insensitive) lookup by city name. */
export function findCity(name) {
  const n = fold(name);
  return CITIES.find((c) => fold(c.name) === n) || null;
}

/** Ranked search: name prefix, then word prefix, then contains, then country. */
export function searchCities(query, limit = 8) {
  const q = fold(query.trim());
  if (!q) return [];
  const scored = [];
  for (const c of CITIES) {
    const name = fold(c.name);
    const country = fold(c.country);
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (country.startsWith(q)) score = 3;
    if (score >= 0) scored.push([score, c]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, limit).map((s) => s[1]);
}

const partsCache = new Map();
function zoneParts(tz, date) {
  let fmt = partsCache.get(tz);
  if (!fmt) {
    const opts = {
      hourCycle: 'h23', hour: '2-digit', minute: '2-digit',
      weekday: 'short', day: '2-digit', month: 'short', timeZoneName: 'shortOffset',
    };
    try {
      fmt = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: tz });
    } catch {
      fmt = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: 'UTC' }); // unknown zone in this browser
    }
    partsCache.set(tz, fmt);
  }
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

/** "06:28" (24h) or "06:28PM" (12h) for a zone. */
export function timeIn(tz, hour12 = false, date = new Date()) {
  const p = zoneParts(tz, date);
  const h = parseInt(p.hour, 10) % 24;
  if (!hour12) return `${String(h).padStart(2, '0')}:${p.minute}`;
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${p.minute}${h < 12 ? 'AM' : 'PM'}`;
}

/** "GMT-4" style offset label. */
export function offsetLabel(tz, date = new Date()) {
  const o = zoneParts(tz, date).timeZoneName || 'GMT';
  return o === 'GMT' ? 'GMT+0' : o;
}

/** "Sun, 04 Oct" style date label. */
export function dateLabel(tz, date = new Date()) {
  const p = zoneParts(tz, date);
  return `${p.weekday}, ${p.day} ${p.month}`;
}

export class WorldClock {
  /**
   * @param {HTMLElement} board  a <fids-board>
   * @param {object} opts
   *   cities: array of city objects or names
   *   hour12: boolean
   *   labelWidth: cells for the city name segment (default 15)
   */
  constructor(board, opts = {}) {
    this.board = board;
    this.hour12 = !!opts.hour12;
    this.labelWidth = opts.labelWidth || 15;
    this.cities = (opts.cities || ['Los Angeles', 'New York', 'London', 'Dubai', 'Tokyo'])
      .map((c) => (typeof c === 'string' ? findCity(c) : c))
      .filter(Boolean);
    this._timer = 0;
    this._configure();
  }

  _configure() {
    this.board.setAttribute('rows', String(this.cities.length));
    this.board.setAttribute('segments', `${this.hour12 ? 7 : 5},${this.labelWidth}`);
  }

  _rowValue(city, now) {
    return [timeIn(city.tz, this.hour12, now), city.name];
  }

  /** Paint every row. scramble=true flips the whole board. */
  render(scramble = false) {
    const now = new Date();
    this.cities.forEach((c, i) => this.board.setRow(i, this._rowValue(c, now), { scramble }));
  }

  start() {
    this.stop();
    this.render(true);
    const tick = () => {
      this.render(false); // only cells whose digit changed will flip
      this._timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    this._timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }

  stop() { clearTimeout(this._timer); this._timer = 0; }

  setCity(row, city) {
    if (!city || row < 0 || row >= this.cities.length) return;
    this.cities[row] = city;
    this.board.setRow(row, this._rowValue(city, new Date()), { scramble: true });
  }

  setHour12(on) {
    this.hour12 = !!on;
    this._configure();
    this.render(true);
  }

  addCity(city) {
    this.cities.push(city);
    this._configure();
    this.render(false);
  }

  removeCity(row) {
    if (this.cities.length <= 1) return;
    this.cities.splice(row, 1);
    this._configure();
    this.render(true);
  }
}
