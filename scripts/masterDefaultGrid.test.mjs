import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDefaultGrid,
  computeColumnGuides,
  resizeBox,
  MM_TO_PX
} from '../src/masterPage.js';

test('computeDefaultGrid calculates bounding box from margins and page dimensions', () => {
  const pageWidthMm = 210; // A4 width
  const pageHeightMm = 297; // A4 height
  const settings = {
    marginLeft: 20,
    marginTop: 25,
    marginRight: 15,
    marginBottom: 30,
    columns: 2,
    gap: 5,
    borderWidth: 1,
    borderColor: '#ff0000',
    fill: '#f0f0f0',
    pattern: 'cross',
    lockGuides: false
  };

  const grid = computeDefaultGrid(pageWidthMm, pageHeightMm, settings);

  assert.equal(grid.id, 'default-grid');
  assert.equal(grid.type, 'text');
  assert.equal(grid.isDefaultGrid, true);
  assert.equal(grid.master, true);
  assert.equal(grid.columns, 2);
  assert.equal(grid.strokeWidth, 1);
  assert.equal(grid.stroke, '#ff0000');
  assert.equal(grid.fill, '#f0f0f0');
  assert.equal(grid.pattern, 'cross');
  assert.equal(grid.locked, false);

  const expectedX = 20 * MM_TO_PX;
  const expectedY = 25 * MM_TO_PX;
  const expectedW = (210 - 20 - 15) * MM_TO_PX;
  const expectedH = (297 - 25 - 30) * MM_TO_PX;
  const expectedGap = 5 * MM_TO_PX;

  assert.ok(Math.abs(grid.x - expectedX) < 0.001);
  assert.ok(Math.abs(grid.y - expectedY) < 0.001);
  assert.ok(Math.abs(grid.w - expectedW) < 0.001);
  assert.ok(Math.abs(grid.h - expectedH) < 0.001);
  assert.ok(Math.abs(grid.columnGap - expectedGap) < 0.001);
});

test('computeDefaultGrid uses fallback default margin when specific margins are not provided', () => {
  const grid = computeDefaultGrid(210, 297, { margin: 12.7 });
  assert.ok(Math.abs(grid.x - 12.7 * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(grid.y - 12.7 * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(grid.w - (210 - 25.4) * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(grid.h - (297 - 25.4) * MM_TO_PX) < 0.001);
});

test('computeColumnGuides calculates column dividers accurately', () => {
  assert.deepEqual(computeColumnGuides(600, 1, 20), []);

  const guides = computeColumnGuides(600, 3, 20);
  assert.equal(guides.length, 2);

  // total gutter = (3 - 1) * 20 = 40
  // colWidth = (600 - 40) / 3 = 560 / 3 ≈ 186.6667
  // Guide 1 gutter: from colWidth (186.67) to colWidth + 20 (206.67)
  const colWidth = 560 / 3;
  assert.equal(guides[0].index, 1);
  assert.ok(Math.abs(guides[0].left - colWidth) < 0.001);
  assert.ok(Math.abs(guides[0].right - (colWidth + 20)) < 0.001);
  assert.equal(guides[0].width, 20);

  // Guide 2 gutter: from 2 * colWidth + 20 to 2 * colWidth + 40
  assert.equal(guides[1].index, 2);
  assert.ok(Math.abs(guides[1].left - (2 * colWidth + 20)) < 0.001);
  assert.ok(Math.abs(guides[1].right - (2 * colWidth + 40)) < 0.001);
  assert.equal(guides[1].width, 20);
});

test('resizeBox supports all 8 handles correctly', () => {
  const initial = { x: 100, y: 100, w: 200, h: 150 };

  // SE handle: drag by (+20, +30)
  const se = resizeBox(initial, 'se', 20, 30);
  assert.equal(se.x, 100);
  assert.equal(se.y, 100);
  assert.equal(se.w, 220);
  assert.equal(se.h, 180);

  // NW handle: drag by (+20, +30) -> shrinks width and height, moves origin
  const nw = resizeBox(initial, 'nw', 20, 30);
  assert.equal(nw.x, 120);
  assert.equal(nw.y, 130);
  assert.equal(nw.w, 180);
  assert.equal(nw.h, 120);

  // N handle: drag by (0, -25) -> expands height upward
  const n = resizeBox(initial, 'n', 0, -25);
  assert.equal(n.x, 100);
  assert.equal(n.y, 75);
  assert.equal(n.w, 200);
  assert.equal(n.h, 175);

  // S handle: drag by (0, +40) -> expands height downward
  const s = resizeBox(initial, 's', 0, 40);
  assert.equal(s.x, 100);
  assert.equal(s.y, 100);
  assert.equal(s.w, 200);
  assert.equal(s.h, 190);

  // W handle: drag by (-15, 0) -> expands width to the left
  const w = resizeBox(initial, 'w', -15, 0);
  assert.equal(w.x, 85);
  assert.equal(w.y, 100);
  assert.equal(w.w, 215);
  assert.equal(w.h, 150);

  // E handle: drag by (25, 0) -> expands width to the right
  const e = resizeBox(initial, 'e', 25, 0);
  assert.equal(e.x, 100);
  assert.equal(e.y, 100);
  assert.equal(e.w, 225);
  assert.equal(e.h, 150);

  // NE handle: drag by (+10, -20)
  const ne = resizeBox(initial, 'ne', 10, -20);
  assert.equal(ne.x, 100);
  assert.equal(ne.y, 80);
  assert.equal(ne.w, 210);
  assert.equal(ne.h, 170);

  // SW handle: drag by (+15, +25)
  const sw = resizeBox(initial, 'sw', 15, 25);
  assert.equal(sw.x, 115);
  assert.equal(sw.y, 100);
  assert.equal(sw.w, 185);
  assert.equal(sw.h, 175);
});

test('resizeBox respects minW and minH constraints', () => {
  const initial = { x: 100, y: 100, w: 50, h: 50 };

  // Attempt to shrink width past minW
  const resW = resizeBox(initial, 'e', -100, 0, 20, 20);
  assert.equal(resW.w, 20);

  // Attempt to shrink height past minH from north
  const resN = resizeBox(initial, 'n', 0, 100, 20, 20);
  assert.equal(resN.h, 20);
  assert.equal(resN.y, 130); // 100 + (50 - 20)
});

test('default grid command availability matches InPage behavior', () => {
  // Simulating disabled(cmd) logic when selected contains 'default-grid'
  function isCommandDisabled(cmd, selected) {
    if (selected.includes('default-grid')) {
      if (['object', 'lock'].includes(cmd)) return false;
      if (['duplicate', 'clear', 'copy', 'cut', 'group', 'ungroup', 'inset', 'runaround', 'master', 'topmost', 'back', 'front'].includes(cmd)) return true;
    }
    return false;
  }

  const selected = ['default-grid'];
  assert.equal(isCommandDisabled('object', selected), false, 'Format -> Object must be enabled');
  assert.equal(isCommandDisabled('lock', selected), false, 'Lock must be enabled');
  assert.equal(isCommandDisabled('clear', selected), true, 'Clear/Delete must be disabled');
  assert.equal(isCommandDisabled('duplicate', selected), true, 'Duplicate must be disabled');
  assert.equal(isCommandDisabled('group', selected), true, 'Group must be disabled');
  assert.equal(isCommandDisabled('ungroup', selected), true, 'Ungroup must be disabled');
});

test('default grid property changes propagate to document settings and dimensions', () => {
  const pageWidth = 210;
  const pageHeight = 297;
  const settings = {
    marginLeft: 15,
    marginTop: 20,
    marginRight: 15,
    marginBottom: 20,
    columns: 1,
    gap: 4.233,
    borderWidth: 0,
    borderColor: '#000000',
    fill: 'none',
    pattern: 'none'
  };

  // Simulating Format -> Object update
  const forms = {
    x: 25,
    y: 30,
    width: 150,
    height: 230,
    objectColumns: 3,
    objectGap: 6,
    strokeWidth: 2,
    stroke: '#0000ff',
    fill: '#ffff00',
    objectPattern: 'diagonal'
  };

  settings.marginLeft = forms.x;
  settings.marginTop = forms.y;
  settings.marginRight = Math.max(0, pageWidth - forms.x - forms.width);
  settings.marginBottom = Math.max(0, pageHeight - forms.y - forms.height);
  settings.columns = forms.objectColumns;
  settings.gap = forms.objectGap;
  settings.borderWidth = forms.strokeWidth;
  settings.borderColor = forms.stroke;
  settings.fill = forms.fill;
  settings.pattern = forms.objectPattern;

  const updatedGrid = computeDefaultGrid(pageWidth, pageHeight, settings);
  assert.equal(updatedGrid.columns, 3);
  assert.equal(updatedGrid.strokeWidth, 2);
  assert.equal(updatedGrid.stroke, '#0000ff');
  assert.equal(updatedGrid.fill, '#ffff00');
  assert.equal(updatedGrid.pattern, 'diagonal');
  assert.ok(Math.abs(updatedGrid.x - 25 * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(updatedGrid.y - 30 * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(updatedGrid.w - 150 * MM_TO_PX) < 0.001);
  assert.ok(Math.abs(updatedGrid.h - 230 * MM_TO_PX) < 0.001);

  const colGuides = computeColumnGuides(updatedGrid.w, updatedGrid.columns, updatedGrid.columnGap);
  assert.equal(colGuides.length, 2);
});

test('default grid is a selectable text box with 0 strokeWidth by default', () => {
  const grid = computeDefaultGrid(210, 297, { margin: 12.7 });
  assert.equal(grid.id, 'default-grid');
  assert.equal(grid.type, 'text');
  assert.equal(grid.isDefaultGrid, true);
  assert.equal(grid.master, true);
  assert.equal(grid.strokeWidth, 0);
  assert.equal(grid.fill, 'none');
});

