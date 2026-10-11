import { spawn } from 'child_process';
import fs from 'fs';

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless',
  '--remote-debugging-port=9244',
  '--window-size=1200,900',
  'http://127.0.0.1:5173/'
]);

setTimeout(async () => {
  try {
    const tabs = await (await fetch('http://127.0.0.1:9244/json')).json();
    const tab = tabs.find(t => t.url.includes('5173'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const cur = id++;
      const fn = e => {
        const m = JSON.parse(e.data);
        if (m.id === cur) { ws.removeEventListener('message', fn); res(m.result); }
      };
      ws.addEventListener('message', fn);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    // 1. Select text box tool
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('aside button'));
        const textBtn = btns.find(b => b.title === 'Text box tool');
        if (textBtn) textBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 200));

    // 2. Drag create text box
    await send('Runtime.evaluate', {
      expression: `(() => {
        const paper = document.querySelector('.paper');
        const pr = paper.getBoundingClientRect();
        const startX = pr.left + 50;
        const startY = pr.top + 50;
        const endX = startX + 350;
        const endY = startY + 180;

        paper.dispatchEvent(new PointerEvent('pointerdown', { clientX: startX, clientY: startY, button: 0, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: endX, clientY: endY, button: 0, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: endX, clientY: endY, button: 0, bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 300));

    // 3. Set columns to 2
    await send('Runtime.evaluate', {
      expression: `(() => {
        const colInput = document.querySelector('input[aria-label="Box columns"]');
        if (colInput) {
          colInput.focus();
          colInput.value = '2';
          colInput.dispatchEvent(new Event('input', { bubbles: true }));
          colInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          colInput.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 300));

    // 4. Enter text in edit mode
    await send('Runtime.evaluate', {
      expression: `(() => {
        const editBtn = Array.from(document.querySelectorAll('aside button'))[1];
        editBtn.click();
        const ft = document.querySelector('.canvas-object [data-frame-editor]');
        if (ft) {
          ft.focus();
          ft.innerText = 'یہ پہلا کالم ہے جس میں اردو کی عبارت لکھی جا رہی ہے اور یہ کافی لمبی عبارت ہے تاکہ اگلے کالم میں بھی جائے۔';
          ft.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    // Check column guides in DOM
    const initialCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.querySelector('.canvas-object');
        const guides = box.querySelector('.column-guides');
        const dividers = guides ? Array.from(guides.querySelectorAll('.column-divider')) : [];
        const lines = guides ? Array.from(guides.querySelectorAll('.col-line')) : [];
        return {
          boxW: box.offsetWidth,
          hasGuides: !!guides,
          guidesStyle: guides ? { left: guides.style.left, width: guides.style.width } : null,
          dividerCount: dividers.length,
          dividerStyle: dividers.map(d => ({ left: d.style.left, width: d.style.width })),
          lineCount: lines.length,
          lineColors: lines.map(l => l.style.background)
        };
      })()`,
      returnByValue: true
    });
    console.log('Initial guides check:', JSON.stringify(initialCheck.result.value, null, 2));

    const shot1 = await send('Page.captureScreenshot');
    fs.writeFileSync('/Users/abdullah/.gemini/antigravity-ide/brain/a5688224-9974-4ae1-9cb8-3f6210e061e9/scratch/verified_initial_2col.png', Buffer.from(shot1.data, 'base64'));

    // 5. Select tool and resize wider
    await send('Runtime.evaluate', {
      expression: `(() => {
        const selectBtn = Array.from(document.querySelectorAll('aside button'))[0];
        selectBtn.click();
        const box = document.querySelector('.canvas-object');
        box.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
        const handle = box.querySelector('.handle-se') || box.querySelector('.handle-e');
        const hr = handle.getBoundingClientRect();
        handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: hr.left, clientY: hr.top, button: 0, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: hr.left + 300, clientY: hr.top, button: 0, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointerup', { clientX: hr.left + 300, clientY: hr.top, button: 0, bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const resizedCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.querySelector('.canvas-object');
        const guides = box.querySelector('.column-guides');
        const dividers = guides ? Array.from(guides.querySelectorAll('.column-divider')) : [];
        const ft = box.querySelector('[data-frame-editor]');
        const range = document.createRange();
        range.selectNodeContents(ft);
        const rects = Array.from(range.getClientRects()).map(r => ({
          left: Math.round(r.left - box.getBoundingClientRect().left),
          top: Math.round(r.top - box.getBoundingClientRect().top),
          width: Math.round(r.width),
          height: Math.round(r.height)
        }));
        return {
          boxW: box.offsetWidth,
          guidesStyle: guides ? { left: guides.style.left, width: guides.style.width } : null,
          dividerStyle: dividers.map(d => ({ left: d.style.left, width: d.style.width })),
          lineRects: rects
        };
      })()`,
      returnByValue: true
    });
    console.log('Resized check:', JSON.stringify(resizedCheck.result.value, null, 2));

    const shot2 = await send('Page.captureScreenshot');
    fs.writeFileSync('/Users/abdullah/.gemini/antigravity-ide/brain/a5688224-9974-4ae1-9cb8-3f6210e061e9/scratch/verified_resized_wider.png', Buffer.from(shot2.data, 'base64'));

    ws.close();
    chrome.kill();
    process.exit(0);
  } catch (err) {
    console.error(err);
    chrome.kill();
    process.exit(1);
  }
}, 2000);
