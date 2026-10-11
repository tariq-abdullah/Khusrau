import test from 'node:test'
import assert from 'node:assert/strict'

test('checkpoint deduplication prevents identical consecutive snapshots in history', () => {
  const objectHistory = []
  const objectFuture = []
  let lastActionKind = 'text'

  function checkpoint(objects) {
    const snapshot = JSON.stringify(objects)
    const last = objectHistory[objectHistory.length - 1]
    if (last && JSON.stringify(last) === snapshot) return
    lastActionKind = 'object'
    objectHistory.push(JSON.parse(snapshot))
    if (objectHistory.length > 80) objectHistory.shift()
    objectFuture.length = 0
  }

  const state1 = [{ id: '1', x: 10, y: 10, w: 100, h: 50 }]
  checkpoint(state1)
  assert.equal(objectHistory.length, 1)

  // Clicking without moving or re-checkpointing with identical state
  checkpoint(state1)
  checkpoint(state1)
  assert.equal(objectHistory.length, 1, 'Consecutive identical states must not create history duplicate entries')

  // Changing state
  const state2 = [{ id: '1', x: 20, y: 10, w: 100, h: 50 }]
  checkpoint(state2)
  assert.equal(objectHistory.length, 2)
  assert.equal(lastActionKind, 'object')
})

test('objectUndo cleanly reverts through distinct states and pushes to future stack', () => {
  let objects = [{ id: '1', x: 30, y: 30 }]
  const objectHistory = [
    [{ id: '1', x: 10, y: 10 }],
    [{ id: '1', x: 20, y: 20 }],
    [{ id: '1', x: 30, y: 30 }] // Duplicate of current
  ]
  const objectFuture = []

  function objectUndo(redo = false) {
    const source = redo ? objectFuture : objectHistory
    const target = redo ? objectHistory : objectFuture
    if (!source.length) return
    const currentStr = JSON.stringify(objects)
    let nextState = source.pop()
    while (nextState && JSON.stringify(nextState) === currentStr && source.length) {
      nextState = source.pop()
    }
    if (!nextState || JSON.stringify(nextState) === currentStr) return
    target.push(JSON.parse(currentStr))
    objects = nextState
  }

  // First undo skips the identical snapshot [{ id: '1', x: 30, y: 30 }] and restores [{ id: '1', x: 20, y: 20 }]
  objectUndo()
  assert.deepEqual(objects, [{ id: '1', x: 20, y: 20 }])
  assert.equal(objectFuture.length, 1)
  assert.deepEqual(objectFuture[0], [{ id: '1', x: 30, y: 30 }])

  // Second undo restores [{ id: '1', x: 10, y: 10 }]
  objectUndo()
  assert.deepEqual(objects, [{ id: '1', x: 10, y: 10 }])
  assert.equal(objectFuture.length, 2)

  // Redo restores [{ id: '1', x: 20, y: 20 }]
  objectUndo(true)
  assert.deepEqual(objects, [{ id: '1', x: 20, y: 20 }])
})

test('performUndo restores deleted object when selected is empty in edit mode', () => {
  let objects = [] // Object was deleted
  let selected = []
  let tool = 'edit'
  let lastActionKind = 'object'
  const objectHistory = [[{ id: 'box-1', type: 'rectangle', x: 50, y: 50, w: 100, h: 100 }]]
  const objectFuture = []
  let tiptapUndone = false

  const mockEditor = {
    can: () => ({ undo: () => true }),
    chain: () => ({ focus: () => ({ undo: () => ({ run: () => { tiptapUndone = true } }) }) })
  }

  function objectUndo() {
    const source = objectHistory
    const target = objectFuture
    if (!source.length) return
    const currentStr = JSON.stringify(objects)
    let nextState = source.pop()
    while (nextState && JSON.stringify(nextState) === currentStr && source.length) {
      nextState = source.pop()
    }
    if (!nextState || JSON.stringify(nextState) === currentStr) return
    target.push(JSON.parse(currentStr))
    objects = nextState
    selected = []
    lastActionKind = 'object'
  }

  function performUndo(activeEl = null) {
    if (activeEl?.closest?.('[data-frame-editor]')) return 'native'
    if (activeEl?.closest?.('.tiptap')) {
      mockEditor.chain().focus().undo().run()
      return 'tiptap'
    }
    if (selected.length && objectHistory.length) {
      objectUndo()
      return 'object'
    }
    if (lastActionKind === 'object' && objectHistory.length) {
      objectUndo()
      return 'object'
    }
    if (mockEditor.can().undo()) {
      mockEditor.chain().focus().undo().run()
      return 'tiptap'
    }
    if (objectHistory.length) {
      objectUndo()
      return 'object'
    }
  }

  // User deleted the object, tool is edit, selected is []
  const undoneTarget = performUndo()
  assert.equal(undoneTarget, 'object', 'Should undo object deletion, not Tiptap')
  assert.equal(objects.length, 1)
  assert.equal(objects[0].id, 'box-1')
  assert.equal(tiptapUndone, false)
})

test('Ctrl+A selects all page objects and prevents browser menu selection when no tool or edit tool is active', () => {
  let prevented = false
  let tool = 'edit'
  let selected = []
  const pageObjects = [{ id: 'obj-1' }, { id: 'obj-2' }]

  function handleCtrlA(e) {
    const isInput = e.target.matches?.('input,textarea,select') || false
    if (isInput) return
    e.preventDefault()
    const frame = e.target.closest?.('[data-frame-editor]')
    if (frame) {
      return 'frame-text'
    }
    if (e.target.closest?.('.tiptap') || (tool === 'edit' && e.editorFocused)) {
      return 'story-text'
    }
    tool = 'select'
    selected = pageObjects.map(o => o.id)
    return 'objects'
  }

  // 1. When clicking page background or canvas with no tool or edit tool and not in text:
  const event1 = {
    target: { matches: () => false, closest: () => null },
    editorFocused: false,
    preventDefault: () => { prevented = true }
  }
  const result1 = handleCtrlA(event1)
  assert.equal(prevented, true, 'Default browser select-all must always be prevented')
  assert.equal(result1, 'objects')
  assert.equal(tool, 'select')
  assert.deepEqual(selected, ['obj-1', 'obj-2'])

  // 2. Inside a contenteditable text frame:
  prevented = false
  const event2 = {
    target: { matches: () => false, closest: sel => sel === '[data-frame-editor]' ? {} : null },
    editorFocused: false,
    preventDefault: () => { prevented = true }
  }
  const result2 = handleCtrlA(event2)
  assert.equal(prevented, true)
  assert.equal(result2, 'frame-text')

  // 3. Inside form input:
  prevented = false
  const event3 = {
    target: { matches: sel => sel.includes('input'), closest: () => null },
    editorFocused: false,
    preventDefault: () => { prevented = true }
  }
  const result3 = handleCtrlA(event3)
  assert.equal(prevented, false, 'Input element should allow native text selection')
  assert.equal(result3, undefined)
})

test('Ctrl+A selects all text in the text box when a text box is selected or active', () => {
  let tool = 'select'
  let selected = ['txt-1']
  const objects = [
    { id: 'txt-1', type: 'text', text: 'اردو متن' },
    { id: 'rect-1', type: 'rectangle' }
  ]
  let selectedText = ''
  let activeElement = 'body'

  function selectFrameText(frame) {
    tool = 'edit'
    activeElement = 'frame-editor'
    selectedText = frame.text
    return true
  }

  function handleCtrlA(e) {
    if (e.target?.matches?.('input,textarea,select')) return
    e.preventDefault()
    let frame = e.target?.closest?.('[data-frame-editor]')
    if (!frame && selected.length === 1) {
      const selObj = objects.find(o => o.id === selected[0])
      if (selObj && ['text', 'title'].includes(selObj.type)) {
        frame = selObj
      }
    }
    if (frame && selectFrameText(frame)) {
      return 'frame-text'
    }
    tool = 'select'
    selected = objects.map(o => o.id)
    return 'objects'
  }

  // 1. Text box is selected with selection tool:
  let prevented = false
  const res1 = handleCtrlA({
    target: { matches: () => false, closest: () => null },
    preventDefault: () => { prevented = true }
  })
  assert.equal(prevented, true)
  assert.equal(res1, 'frame-text')
  assert.equal(tool, 'edit')
  assert.equal(activeElement, 'frame-editor')
  assert.equal(selectedText, 'اردو متن')

  // 2. Already editing inside frame:
  selected = ['txt-1']
  tool = 'edit'
  selectedText = ''
  const res2 = handleCtrlA({
    target: { matches: () => false, closest: sel => sel === '[data-frame-editor]' ? objects[0] : null },
    preventDefault: () => { prevented = true }
  })
  assert.equal(res2, 'frame-text')
  assert.equal(selectedText, 'اردو متن')

  // 3. Rectangle selected (not text box): selects all objects on page
  selected = ['rect-1']
  tool = 'select'
  selectedText = ''
  const res3 = handleCtrlA({
    target: { matches: () => false, closest: () => null },
    preventDefault: () => { prevented = true }
  })
  assert.equal(res3, 'objects')
  assert.deepEqual(selected, ['txt-1', 'rect-1'])
})
