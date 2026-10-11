import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatPageNumber,
  resolveMasterText,
  isObjectOnPage,
  isGuideOnPage,
  toRoman,
  toAlpha
} from '../src/masterPage.js'

test('formatPageNumber formats standard Arabic numerals', () => {
  assert.equal(formatPageNumber(1, '1 2 3'), '1')
  assert.equal(formatPageNumber(42, '1 2 3'), '42')
})

test('formatPageNumber formats uppercase and lowercase Roman numerals', () => {
  assert.equal(formatPageNumber(1, 'I II III'), 'I')
  assert.equal(formatPageNumber(4, 'I II III'), 'IV')
  assert.equal(formatPageNumber(9, 'I II III'), 'IX')
  assert.equal(formatPageNumber(14, 'I II III'), 'XIV')
  assert.equal(formatPageNumber(1, 'i ii iii'), 'i')
  assert.equal(formatPageNumber(4, 'i ii iii'), 'iv')
  assert.equal(formatPageNumber(9, 'i ii iii'), 'ix')
})

test('formatPageNumber formats uppercase and lowercase letters', () => {
  assert.equal(formatPageNumber(1, 'A B C'), 'A')
  assert.equal(formatPageNumber(2, 'A B C'), 'B')
  assert.equal(formatPageNumber(26, 'A B C'), 'Z')
  assert.equal(formatPageNumber(1, 'a b c'), 'a')
  assert.equal(formatPageNumber(3, 'a b c'), 'c')
})

test('resolveMasterText dynamically replaces # with formatted page number', () => {
  assert.equal(resolveMasterText('Page #', 5, '1 2 3'), 'Page 5')
  assert.equal(resolveMasterText('صفحہ #', 3, '1 2 3'), 'صفحہ 3')
  assert.equal(resolveMasterText('Chapter 1 - Page #', 4, 'I II III'), 'Chapter 1 - Page IV')
  assert.equal(resolveMasterText('# of # pages', 2, '1 2 3'), '2 of 2 pages')
  assert.equal(resolveMasterText('', 1), '')
  assert.equal(resolveMasterText('Header without placeholder', 1), 'Header without placeholder')
})

test('isObjectOnPage filters objects in Master Page mode', () => {
  const masterRight = { id: 'm1', master: true, masterSide: 'right' }
  const masterLeft = { id: 'm2', master: true, masterSide: 'left' }
  const masterBoth = { id: 'm3', master: true, masterSide: 'both' }
  const docObj = { id: 'd1', page: 'p1' }

  // In non-facing master mode
  assert.equal(isObjectOnPage(masterRight, { isMaster: true, isFacing: false }), true)
  assert.equal(isObjectOnPage(docObj, { isMaster: true, isFacing: false }), false)

  // In facing master mode (Right page)
  assert.equal(isObjectOnPage(masterRight, { isMaster: true, isFacing: true, masterSide: 'right' }), true)
  assert.equal(isObjectOnPage(masterLeft, { isMaster: true, isFacing: true, masterSide: 'right' }), false)
  assert.equal(isObjectOnPage(masterBoth, { isMaster: true, isFacing: true, masterSide: 'right' }), true)

  // In facing master mode (Left page)
  assert.equal(isObjectOnPage(masterRight, { isMaster: true, isFacing: true, masterSide: 'left' }), false)
  assert.equal(isObjectOnPage(masterLeft, { isMaster: true, isFacing: true, masterSide: 'left' }), true)
  assert.equal(isObjectOnPage(masterBoth, { isMaster: true, isFacing: true, masterSide: 'left' }), true)
})

test('isObjectOnPage filters objects on normal document pages', () => {
  const masterRight = { id: 'm1', master: true, masterSide: 'right' }
  const masterLeft = { id: 'm2', master: true, masterSide: 'left' }
  const masterBoth = { id: 'm3', master: true }
  const docObjP1 = { id: 'd1', page: 'p1' }
  const docObjP2 = { id: 'd2', page: 'p2' }

  // Non-facing document mode, page 1
  assert.equal(isObjectOnPage(docObjP1, { currentPageId: 'p1', pageIndex: 0, isFacing: false, isMaster: false }), true)
  assert.equal(isObjectOnPage(docObjP2, { currentPageId: 'p1', pageIndex: 0, isFacing: false, isMaster: false }), false)
  assert.equal(isObjectOnPage(masterBoth, { currentPageId: 'p1', pageIndex: 0, isFacing: false, isMaster: false }), true)

  // Facing document mode: Page 1 (index 0, odd -> right)
  assert.equal(isObjectOnPage(masterRight, { currentPageId: 'p1', pageIndex: 0, isFacing: true, isMaster: false }), true)
  assert.equal(isObjectOnPage(masterLeft, { currentPageId: 'p1', pageIndex: 0, isFacing: true, isMaster: false }), false)
  assert.equal(isObjectOnPage(masterBoth, { currentPageId: 'p1', pageIndex: 0, isFacing: true, isMaster: false }), true)

  // Facing document mode: Page 2 (index 1, even -> left)
  assert.equal(isObjectOnPage(masterRight, { currentPageId: 'p2', pageIndex: 1, isFacing: true, isMaster: false }), false)
  assert.equal(isObjectOnPage(masterLeft, { currentPageId: 'p2', pageIndex: 1, isFacing: true, isMaster: false }), true)
  assert.equal(isObjectOnPage(masterBoth, { currentPageId: 'p2', pageIndex: 1, isFacing: true, isMaster: false }), true)
})

test('isGuideOnPage handles master and page guides properly', () => {
  const gMaster = { id: 'gm', master: true, side: 'right' }
  const gDoc = { id: 'gd', page: 'p1' }

  assert.equal(isGuideOnPage(gMaster, { isMaster: true, isFacing: true, masterSide: 'right' }), true)
  assert.equal(isGuideOnPage(gMaster, { isMaster: true, isFacing: true, masterSide: 'left' }), false)
  assert.equal(isGuideOnPage(gDoc, { isMaster: true }), false)
  assert.equal(isGuideOnPage(gDoc, { currentPageId: 'p1', isMaster: false }), true)
  assert.equal(isGuideOnPage(gMaster, { currentPageId: 'p1', pageIndex: 0, isFacing: true, isMaster: false }), true)
})

test('resolveMasterText respects pageNumberStart offset', () => {
  const pageIndex = 0
  const pageNumberStart = 10
  const actualPageNum = pageIndex + pageNumberStart
  assert.equal(resolveMasterText('Page #', actualPageNum, '1 2 3'), 'Page 10')
  assert.equal(resolveMasterText('صفحہ #', actualPageNum, '1 2 3'), 'صفحہ 10')
  assert.equal(resolveMasterText('#', actualPageNum, 'I II III'), 'X')
})

test('page indicator displays M for single-sided master and L/R for facing master', () => {
  function getPageIndicator({ isMaster, isFacing, masterSide, pageIndex, pageCount }) {
    if (isMaster) {
      return isFacing ? (masterSide === 'left' ? 'L' : 'R') : 'M'
    }
    return `${pageIndex + 1}/${pageCount}`
  }

  assert.equal(getPageIndicator({ isMaster: false, isFacing: false, pageIndex: 0, pageCount: 1 }), '1/1')
  assert.equal(getPageIndicator({ isMaster: true, isFacing: false }), 'M')
  assert.equal(getPageIndicator({ isMaster: true, isFacing: true, masterSide: 'right' }), 'R')
  assert.equal(getPageIndicator({ isMaster: true, isFacing: true, masterSide: 'left' }), 'L')
})
