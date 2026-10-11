import test from 'node:test'
import assert from 'node:assert/strict'
import { distToBoxBorder, findNearestTextBox } from '../src/objects.js'

test('distToBoxBorder calculates exact distance to nearest border', () => {
  const box = { x: 50, y: 50, w: 200, h: 100, rotation: 0 }

  // Point right on the top edge
  assert.equal(distToBoxBorder({ x: 100, y: 50 }, box), 0)

  // Point 4px outside the top edge
  assert.equal(distToBoxBorder({ x: 100, y: 46 }, box), 4)

  // Point 6px inside the left edge
  assert.equal(distToBoxBorder({ x: 56, y: 90 }, box), 6)

  // Point 5px outside the right edge
  assert.equal(distToBoxBorder({ x: 255, y: 90 }, box), 5)

  // Point 8px inside the bottom edge
  assert.equal(distToBoxBorder({ x: 150, y: 142 }, box), 8)

  // Point in center of the box (50px from top and bottom)
  assert.equal(distToBoxBorder({ x: 150, y: 100 }, box), 50)
})

test('distToBoxBorder handles rotated boxes accurately', () => {
  const box = { x: 100, y: 100, w: 100, h: 100, rotation: 90 }
  // A square rotated 90 degrees around center occupies the same footprint
  // Point on its perimeter
  const dEdge = distToBoxBorder({ x: 100, y: 150 }, box)
  assert.ok(Math.abs(dEdge) < 0.001)

  // Point 10px outside
  const dOut = distToBoxBorder({ x: 90, y: 150 }, box)
  assert.ok(Math.abs(dOut - 10) < 0.001)
})

test('findNearestTextBox selects whichever textbox border is nearest', () => {
  const boxA = { id: 'box-a', type: 'text', x: 20, y: 50, w: 100, h: 100 }
  const boxB = { id: 'box-b', type: 'text', x: 140, y: 50, w: 100, h: 100 }

  // Point closer to boxA's right border (x=120) than boxB's left border (x=140)
  // At x=124, y=80: 4px from boxA, 16px from boxB
  const res1 = findNearestTextBox({ x: 124, y: 80 }, [boxA, boxB])
  assert.equal(res1.nearest.id, 'box-a')
  assert.equal(res1.distance, 4)

  // Point closer to boxB's left border (x=140)
  // At x=137, y=80: 3px from boxB, 17px from boxA
  const res2 = findNearestTextBox({ x: 137, y: 80 }, [boxA, boxB])
  assert.equal(res2.nearest.id, 'box-b')
  assert.equal(res2.distance, 3)
})

test('textbox is selectable only near borders: interior clicks exceed tolerance', () => {
  const box = { id: 'main-box', type: 'text', x: 50, y: 50, w: 300, h: 200 }
  const borderTol = 10

  // Click near border (6px from top edge) -> selectable
  const clickNear = { x: 120, y: 56 }
  const dNear = distToBoxBorder(clickNear, box)
  assert.ok(dNear <= borderTol, 'Click 6px from border must be within border tolerance')

  // Click in interior (x=200, y=150: center of box) -> NOT selectable
  const clickInterior = { x: 200, y: 150 }
  const dInterior = distToBoxBorder(clickInterior, box)
  assert.ok(dInterior > borderTol, 'Interior click (50px from border) must exceed border tolerance')
})
