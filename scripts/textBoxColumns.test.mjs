import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeColumnGuides,
  MM_TO_PX
} from '../src/masterPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('computeColumnGuides divides columns with equal widths', () => {
  const contentWidth = 340; // width inside insets
  const columns = 2;
  const gap = 4.233 * MM_TO_PX; // ~16px gap
  const guides = computeColumnGuides(contentWidth, columns, gap);

  assert.equal(guides.length, 1);
  const expectedColWidth = (contentWidth - gap) / 2;
  assert.ok(Math.abs(guides[0].left - expectedColWidth) < 0.001);
  assert.ok(Math.abs(guides[0].width - gap) < 0.001);

  // Column 1 width = guides[0].left
  // Column 2 width = contentWidth - (guides[0].left + guides[0].width)
  const col1 = guides[0].left;
  const col2 = contentWidth - (guides[0].left + guides[0].width);
  assert.ok(Math.abs(col1 - col2) < 0.0001, `Columns must be equally divided: col1=${col1}, col2=${col2}`);
});

test('computeColumnGuides equally divides 3 columns with custom gap', () => {
  const contentWidth = 600;
  const columns = 3;
  const gap = 20;
  const guides = computeColumnGuides(contentWidth, columns, gap);

  assert.equal(guides.length, 2);
  const colWidth = (600 - 2 * 20) / 3; // (600 - 40) / 3 = 560 / 3 = 186.666...
  assert.ok(Math.abs(guides[0].left - colWidth) < 0.001);
  assert.ok(Math.abs(guides[0].width - 20) < 0.001);
  assert.ok(Math.abs(guides[1].left - (colWidth * 2 + 20)) < 0.001);
  assert.ok(Math.abs(guides[1].width - 20) < 0.001);

  const col1 = guides[0].left;
  const col2 = guides[1].left - (guides[0].left + guides[0].width);
  const col3 = contentWidth - (guides[1].left + guides[1].width);
  assert.ok(Math.abs(col1 - col2) < 0.0001);
  assert.ok(Math.abs(col2 - col3) < 0.0001);
});

test('objectColumnGuides logic respects object inset and settings.gap fallback', () => {
  function objectColumnGuides(o, settings) {
    if (!o || (o.columns || 1) <= 1) return [];
    const inset = o.inset ?? 5;
    const w = Math.max(10, o.w - 2 * inset);
    const gap = o.columnGap ?? ((settings.gap ?? 4.233) * MM_TO_PX);
    return computeColumnGuides(w, o.columns, gap);
  }

  const settings = { gap: 6.0 };
  const objWithoutGap = { w: 400, inset: 5, columns: 2 };
  const guidesDefaultGap = objectColumnGuides(objWithoutGap, settings);

  assert.equal(guidesDefaultGap.length, 1);
  const expectedDefaultGap = 6.0 * MM_TO_PX;
  assert.ok(Math.abs(guidesDefaultGap[0].width - expectedDefaultGap) < 0.001);

  const objWithCustomGap = { w: 400, inset: 5, columns: 2, columnGap: 25 };
  const guidesCustomGap = objectColumnGuides(objWithCustomGap, settings);
  assert.equal(guidesCustomGap[0].width, 25);
  const expectedColWidth = (390 - 25) / 2;
  assert.ok(Math.abs(guidesCustomGap[0].left - expectedColWidth) < 0.001);
});

test('CSS rules enforce balanced column fill and single orphan/widow to avoid stacking', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/style.css'), 'utf-8');

  // .frame-text and .flow-measure must balance columns and have orphans: 1, widows: 1
  assert.ok(css.includes('column-fill:balance'), 'CSS must include column-fill:balance');
  assert.ok(css.includes('orphans:1'), 'CSS must include orphans:1');
  assert.ok(css.includes('widows:1'), 'CSS must include widows:1');
});

test('App.vue renders column-guides for multi-column text boxes when guides are enabled', () => {
  const appVue = fs.readFileSync(path.join(__dirname, '../src/App.vue'), 'utf-8');

  // Verify column-guides element is rendered conditionally
  assert.ok(
    appVue.includes("v-if=\"['text','title'].includes(o.type)&&(o.columns||1)>1&&settings.guides\""),
    'App.vue must render column-guides for text and title objects when columns > 1 and settings.guides is true'
  );

  // Verify column guides use preferences.app.columnGuidesColor
  assert.ok(
    appVue.includes('preferences.app.columnGuidesColor'),
    'App.vue must style col-line with preferences.app.columnGuidesColor'
  );

  // Verify objectColumnGuides helper is defined in App.vue
  assert.ok(
    appVue.includes('function objectColumnGuides(o)'),
    'App.vue must define objectColumnGuides helper'
  );

  // Verify columnGap fallback uses settings.gap
  assert.ok(
    appVue.includes('settings.gap??4.233'),
    'App.vue must fallback columnGap to settings.gap'
  );
});
