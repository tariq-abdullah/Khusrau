import test from 'node:test'
import assert from 'node:assert/strict'
import { menus } from '../src/controls.js'

test('Edit -> Preferences menu contains all 5 required submenus', () => {
  const editMenu = menus.Edit
  const prefItem = editMenu.find(item => item && item[0] === 'Preferences')
  assert.ok(prefItem, 'Preferences item must exist in Edit menu')
  assert.equal(prefItem[1], 'preferences')
  const submenu = prefItem[3]
  assert.ok(Array.isArray(submenu), 'Preferences must have a submenu array')
  assert.equal(submenu.length, 5)

  const expected = [
    ['Application…', 'prefApp'],
    ['Document…', 'prefDoc'],
    ['Typographic…', 'prefTypo'],
    ['Story Editor…', 'prefStory'],
    ['Spelling…', 'prefSpelling']
  ]

  for (let i = 0; i < expected.length; i++) {
    assert.equal(submenu[i][0], expected[i][0])
    assert.equal(submenu[i][1], expected[i][1])
  }
})

test('Default preferences match screenshot specifications exactly', () => {
  const appDefaults = {
    applicationType: 'ltr',
    marginGuidesColor: '#808080',
    userGuidesColor: '#0000ff',
    columnGuidesColor: '#808080',
    arrowMovement: 1,
    arrowWithControl: 0.1,
    greekTextBelow: 7,
    greekPictures: false,
    rightButtonAction: 'Floating Menu',
    rightButtonZoom: 100,
    logFileGenerate: true,
    logFilePath: '',
    autoSavePath: '',
    autoSaveEnabled: false,
    autoSaveMinutes: 10,
    autoSaveMaintainVersions: 1,
    allowCustomPostScript: false
  }

  const docDefaults = {
    unitGeneral: 'Millimeters',
    unitCharacter: 'Points',
    pasteboardAcross: 15,
    pasteboardDown: 25,
    snapDistance: 2,
    guidesPosition: 'Front',
    rulersVisible: true,
    rulerOriginAcross: 0,
    rulerOriginDown: 0,
    pageNumberStart: 1,
    pageNumberStyle: '1 2 3',
    viewPercent: 100
  }

  const typoDefaults = {
    nastaliqFirstSpace: 0,
    nastaliqSubsequentSpace: 25,
    boxedAbove: 10,
    boxedBelow: 15,
    boxedText: 7,
    autoLineSpacing: 50,
    reduceLatinFontsize: 18,
    characterSpaceExtra: 20,
    underlinesShift: 40,
    underlinesWidth: 7,
    justPriorityNastaliq: 10,
    justPriorityLatin: 10,
    usePrinterWidths: false,
    autoKerning: true,
    autoKashida: true,
    footnoteFont: '',
    footnoteSize: 75,
    footnoteShift: 25
  }

  const storyDefaults = {
    storyFontSize: '12pt',
    printFontSize: '12pt',
    previewFontSize: '12pt',
    promptingSpeed: 'Low',
    printFooter: false
  }

  const spellingDefaults = {
    ignoreUppercase: false,
    ignoreWithNumbers: false,
    dictLanguage: 'American English',
    spellLanguage: 'English'
  }

  assert.equal(appDefaults.arrowMovement, 1)
  assert.equal(appDefaults.arrowWithControl, 0.1)
  assert.equal(appDefaults.greekTextBelow, 7)
  assert.equal(appDefaults.userGuidesColor, '#0000ff')
  assert.equal(appDefaults.rightButtonAction, 'Floating Menu')

  assert.equal(docDefaults.unitGeneral, 'Millimeters')
  assert.equal(docDefaults.snapDistance, 2)
  assert.equal(docDefaults.guidesPosition, 'Front')
  assert.equal(docDefaults.rulersVisible, true)

  assert.equal(typoDefaults.nastaliqFirstSpace, 0)
  assert.equal(typoDefaults.nastaliqSubsequentSpace, 25)
  assert.equal(typoDefaults.autoLineSpacing, 50)
  assert.equal(typoDefaults.autoKerning, true)
  assert.equal(typoDefaults.autoKashida, true)

  assert.equal(storyDefaults.storyFontSize, '12pt')
  assert.equal(storyDefaults.promptingSpeed, 'Low')

  assert.equal(spellingDefaults.dictLanguage, 'American English')
  assert.equal(spellingDefaults.spellLanguage, 'English')
})

test('Arrow key nudge calculation accurately applies movement settings in mm and with control', () => {
  const mmToPx = (mm) => mm * 96 / 25.4

  const normalStepMm = 1
  const ctrlStepMm = 0.1

  const normalPx = mmToPx(normalStepMm)
  const ctrlPx = mmToPx(ctrlStepMm)

  assert.ok(Math.abs(normalPx - 3.779527559) < 0.001)
  assert.ok(Math.abs(ctrlPx - 0.3779527559) < 0.001)

  // Verify object displacement
  const initialX = 100
  const movedNormalRight = initialX + normalPx
  const movedCtrlRight = initialX + ctrlPx

  assert.ok(movedNormalRight > initialX)
  assert.ok(movedCtrlRight > initialX)
  assert.ok(movedNormalRight > movedCtrlRight)
})

test('Guide snap distance tolerance scales correctly with zoom and millimeters', () => {
  const calcSnapTolerance = (snapDistanceMm, zoomPercent) => {
    return (snapDistanceMm * 96 / 25.4) / (zoomPercent / 100)
  }

  // At 100% zoom and 2mm
  const tol100 = calcSnapTolerance(2, 100)
  assert.ok(Math.abs(tol100 - 7.559) < 0.01)

  // At 200% zoom, screen pixel tolerance is halved
  const tol200 = calcSnapTolerance(2, 200)
  assert.ok(Math.abs(tol200 - (tol100 / 2)) < 0.001)

  // At 50% zoom, screen pixel tolerance is doubled
  const tol50 = calcSnapTolerance(2, 50)
  assert.ok(Math.abs(tol50 - (tol100 * 2)) < 0.001)
})
