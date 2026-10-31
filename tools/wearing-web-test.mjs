import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const out = path.resolve('wearing-evidence');
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
let page = await browser.newPage();
const evidence = { console: [], errors: [], results: [] };
const configure = async page => {
  await page.setViewport({ width: 1280, height: 1000, hasTouch: true });
  page.on('console', message => { if (message.type() === 'error') evidence.console.push(message.text()); });
  page.on('pageerror', error => evidence.errors.push(error.message));
  // Block backend access without request interception, which disables browser caching.
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  await client.send('Network.setBlockedURLs', { urls: ['*:3000/*', '*:5000/*'] });
};
await configure(page);
await page.evaluateOnNewDocument(() => {
  if (localStorage.getItem('@wearing:fixture-initialized')) return;
  const email = 'wearing-a@example.test';
  const user = { user_id: '00000000-0000-4000-8000-000000000001', email, password_hash: '', display_name: 'Wearing Test', is_cosplayer: true, is_organizer: false, base_body_selection: 'female', is_holder_verified: false, verification_status: 'not_submitted', organizer_role: null };
  const base = { user_id: user.user_id, client_id: null, entry_method: 'text', entry_language: 'english', photo_urls: [], auto_categorized_style: '', flexibility_tag: 'as-is-only', condition_rating: 5, condition_photo_history: [], availability_status: 'free', committed_to_project_id: null, original_project_ref: null, reserved_trade_id: null, acquired_date: '2026-10-31', acquisition_cost: 0, notes: '', version: 1, created_at: '2026-10-31T12:00:00Z', updated_at: '2026-10-31T12:00:00Z' };
  const items = [
    ['shirt', 'White shirt', 'top', 'white'], ['pants', 'Black pants', 'bottom', 'black'],
    ['boots', 'Black boots', 'footwear', 'black'], ['silver-wig', 'Silver wig', 'wig', 'silver'],
    ['red-wig', 'Red wig', 'wig', 'red'], ['blindfold', 'Blindfold', 'accessory', 'black'],
    ['gloves', 'Black gloves', 'accessory', 'black'],
  ].map(([attire_id, original_input_text, auto_categorized_type, auto_categorized_color]) => ({ ...base, attire_id, original_input_text, auto_categorized_type, auto_categorized_color }));
  const slots = Object.fromEntries(['wig', 'top', 'bottom', 'gloves', 'shoes'].map(slot => [slot, { present: true, color: slot === 'wig' ? 'silver' : slot === 'top' ? 'white' : 'black', keywords: [], confidence: 'medium' }]));
  const extracted_outfit = { version: '1.0.0', slots, unmapped: ['blindfold'] };
  const project = { project_id: 'wearing-project', user_id: email, character_id: 'wearing-character', variant_id: '', project_name: 'Wearing verification project', stated_budget: 5000, stated_skill_level: 'intermediate', start_date: '2026-10-31', target_completion_date: '2026-12-01', linked_event_id: null, opted_in_readiness_sharing: false, status: 'planning', created_at: base.created_at, updated_at: base.updated_at, extracted_outfit };
  localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
  localStorage.setItem('@forgemind:data_consent', JSON.stringify({ accepted: true }));
  localStorage.setItem('@forgemind:owned_attire:' + email, JSON.stringify(items));
  localStorage.setItem('@forgemind:projects:v1:' + encodeURIComponent(email), JSON.stringify({ version: 1, projects: [project], tasks: [], budgetItems: [], milestones: [] }));
  localStorage.setItem('@forgemind:characters:' + email, JSON.stringify([{ id: 'wearing-character', user_id: email, name: 'Wearing test character', series: 'Test fixture', targetColors: ['white', 'black'], styleTags: [], created_at: base.created_at, updated_at: base.updated_at, extracted_outfit }]));
  localStorage.setItem('@wearing:fixture-initialized', '1');
});

try {
  await page.goto(process.env.WEARING_TEST_URL ?? 'http://127.0.0.1:8090', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('Wearing verification project'), { timeout: 60000 });
  await page.locator('text/Wearing verification project').click();
  await page.waitForSelector('[data-testid="costume-viewer"] canvas', { timeout: 45000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading 3D body'), { timeout: 45000 });
  await page.waitForSelector('[aria-label="Wear White shirt"]', { timeout: 20000 });
  const key = '@forgemind:outfit:v3:wearing-a%40example.test:project:wearing-project';
  const click = selector => page.locator(selector).click();
  const clickText = text => click(`text/${text}`);
  const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
  const wait = expected => page.waitForFunction((key, expected) => {
    const outfit = JSON.parse(localStorage.getItem(key) ?? 'null');
    return outfit && Object.entries(expected).every(([slot, fields]) => Object.entries(fields).every(([field, value]) => outfit.pieces[slot]?.[field] === value));
  }, { timeout: 15000 }, key, expected);
  const wear = async (name, expected) => { await click(`[aria-label="Wear ${name}"]`); await wait(expected); };
  const shot = async name => {
    const viewer = (await page.$$('[data-testid="costume-viewer"]')).at(-1);
    await viewer.scrollIntoView();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await viewer.screenshot({ path: path.join(out, `${name}.png`) });
  };
  const test = async (number, action) => {
    try { await action(); evidence.results.push({ number, platform: 'Expo web / PhoneFrame', status: 'RAN', result: 'PASS' }); console.log(`Web ${number}: RAN PASS`); }
    catch (error) { evidence.results.push({ number, platform: 'Expo web / PhoneFrame', status: 'RAN', result: 'FAIL', error: error.stack }); console.log(`Web ${number}: RAN FAIL ${error.message}`); await shot(`failure-${number}`).catch(() => undefined); }
  };
  await shot('dashboard-bare');
  await test(1, async () => {
    await wear('White shirt', { top: { on: true, itemId: 'shirt', color: '#FFFFFF' } });
    await wear('Black pants', { bottom: { on: true, itemId: 'pants' } });
    await wear('Black boots', { shoes: { on: true, itemId: 'boots' } });
    await wear('Silver wig', { wig: { on: true, itemId: 'silver-wig', color: '#C0C0C0' } });
    for (const slot of ['top', 'bottom', 'shoes', 'wig']) assert.equal((await state()).pieces[slot].on, true);
    await shot('four-owned-items');
  });
  await test(2, async () => {
    await wear('Red wig', { wig: { on: true, itemId: 'red-wig', color: '#EF4444' } });
    await shot('red-wig-head');
    const red = await page.$eval('[data-testid="costume-viewer"] canvas', canvas => {
      const gl = canvas.getContext('webgl2');
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0, minY = canvas.height, maxY = 0;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        if (pixels[index] > 100 && pixels[index] > pixels[index + 1] * 1.6 && pixels[index] > pixels[index + 2] * 1.6) {
          count++; minY = Math.min(minY, canvas.height - y - 1); maxY = Math.max(maxY, canvas.height - y - 1);
        }
      }
      return { count, minY, maxY, height: canvas.height };
    });
    evidence.redWigPixels = red;
    assert.ok(red.count > 20, `Red wig must render, got ${red.count} red pixels`);
    assert.ok(red.maxY / red.height < 0.4, `Wig must be above shoulders: ${JSON.stringify(red)}`);
  });
  await test(3, async () => {
    await wear('Red wig', { wig: { on: false } });
    assert.equal((await state()).pieces.top.on, true);
    assert.equal((await state()).pieces.shoes.on, true);
  });
  await test(4, async () => {
    await clickText('Wear full costume'); await wait({ top: { on: true }, shoes: { on: true } });
    await click('[aria-label="Show Top"]'); await wait({ top: { on: false } });
    await click('[aria-label="Shoes color #FFFFFF"]'); await wait({ shoes: { color: '#FFFFFF', on: true } });
    assert.equal((await state()).pieces.top.on, false);
  });
  await test(5, async () => {
    await clickText('Remove all');
    await wait({ top: { on: false }, bottom: { on: false }, shoes: { on: false }, wig: { on: false } });
    assert.ok(Object.values((await state()).pieces).every(piece => !piece.on));
    await shot('remove-all-bare');
  });
  await test(6, async () => {
    await clickText('Wear full costume'); await wait({ top: { on: true }, wig: { on: true } });
    const before = await state();
    for (const body of ['Male', 'Female']) {
      await clickText(body);
      await page.waitForFunction(() => !document.body.innerText.includes('Loading 3D body'), { timeout: 30000 });
      for (const angle of ['Front', 'Side', 'Back']) {
        await clickText(angle); await shot(`${body}-${angle}`);
        assert.deepEqual(await state(), before);
      }
    }
    await clickText('Front');
  });
  await test(7, async () => {
    await click('[aria-label="Top color #FFFFFF"]'); await wait({ top: { color: '#FFFFFF' } });
    assert.ok(await page.$eval('[aria-label="Show Top"]', element => element.parentElement.innerText.includes('Matches character color')));
    await page.locator('[aria-label="Custom top color"]').fill('#123456');
    await page.$eval('[aria-label="Custom top color"]', element => {
      const button = [...element.parentElement.querySelectorAll('[tabindex="0"]')].find(element => element.innerText === 'Apply color');
      if (!button) throw new Error('Apply color button was not found');
      button.click();
    });
    await wait({ top: { color: '#123456' } });
    assert.equal(await page.$eval('[aria-label="Show Top"]', element => element.parentElement.innerText.includes('Matches character color')), false);
  });
  await test('drag-and-pinch', async () => {
    await shot('before-gestures');
    const canvas = await page.$('[data-testid="costume-viewer"] canvas');
    const box = await canvas.boundingBox();
    const read = () => page.$eval('[data-testid="costume-viewer"] canvas', canvas => canvas.toDataURL());
    const before = await read();
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y); await page.mouse.down();
    await page.mouse.move(center.x + 70, center.y + 10, { steps: 12 }); await page.mouse.up();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 400)));
    assert.notEqual(await read(), before, 'Drag must change the rendered view');
    const rotated = await read();
    const client = await page.createCDPSession();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x - 25, y: center.y, id: 1 }, { x: center.x + 25, y: center.y, id: 2 }] });
    for (const distance of [35, 45, 55]) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x - distance, y: center.y, id: 1 }, { x: center.x + distance, y: center.y, id: 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 400)));
    assert.notEqual(await read(), rotated, 'Pinch must change the rendered view');
    await shot('after-gestures');
    await clickText('Front');
  });
  await test('save-failure', async () => {
    const before = await state();
    await page.evaluate(() => {
      window.wearingOriginalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('@forgemind:outfit:v3:')) throw new Error('Test storage failure');
        return window.wearingOriginalSetItem.call(this, key, value);
      };
    });
    await click('[aria-label="Show Top"]');
    await page.waitForFunction(() => document.body.innerText.includes('Could not save outfit'), { timeout: 15000 });
    assert.deepEqual(await state(), before);
    await page.evaluate(() => { Storage.prototype.setItem = window.wearingOriginalSetItem; });
    await clickText('Retry loading outfit');
  });
  const reopen = async () => {
    const previous = page;
    page = await browser.newPage();
    await configure(page);
    await previous.close();
    await page.goto(process.env.WEARING_TEST_URL ?? 'http://127.0.0.1:8090', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('Wearing verification project'), { timeout: 45000 });
    await page.locator('text/Wearing verification project').click();
    await page.waitForSelector('[data-testid="costume-viewer"] canvas', { timeout: 30000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading 3D body'), { timeout: 30000 });
  };
  await test(8, async () => {
    const before = await state(); await reopen(); assert.deepEqual(await state(), before);
    assert.ok(await page.$eval('[aria-label="Show Top"]', element => element.innerText.includes('Shown')));
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('@forgemind:active_session'));
      user.email = 'wearing-b@example.test'; user.user_id = '00000000-0000-4000-8000-000000000002';
      localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
      const data = JSON.parse(localStorage.getItem('@forgemind:projects:v1:wearing-a%40example.test'));
      data.projects[0].user_id = user.email;
      localStorage.setItem('@forgemind:projects:v1:wearing-b%40example.test', JSON.stringify(data));
      localStorage.setItem('@forgemind:owned_attire:' + user.email, '[]');
    });
    await reopen();
    assert.ok((await page.evaluate(() => document.body.innerText)).includes('Your inventory is empty'));
    assert.equal(await page.$('[aria-label="Wear White shirt"]'), null);
    assert.ok(await page.$eval('[aria-label="Show Top"]', element => element.innerText.includes('Empty')));
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('@forgemind:active_session'));
      user.email = 'wearing-a@example.test'; user.user_id = '00000000-0000-4000-8000-000000000001';
      localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
    });
    await reopen(); assert.deepEqual(await state(), before);
  });
  await test(9, async () => {
    await shot('dashboard-body-and-owned-items');
    await page.screenshot({ path: path.join(out, 'phoneframe-dashboard.png') });
    assert.equal(evidence.errors.length, 0);
  });
  await test('planning-screen', async () => {
    // Select the visible tab, not a retained stack header with the same text.
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll('*')].filter(element => element.textContent === 'Characters' && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
      elements.at(-1)?.click();
    });
    await page.waitForFunction(() => document.body.innerText.includes('Wearing test character'), { timeout: 20000 });
    await clickText('Wearing test character');
    await page.waitForSelector('[aria-label="Wear White shirt"]', { timeout: 20000 });
    const tapPlanningShirt = () => page.$$eval('[aria-label="Wear White shirt"]', elements => elements.at(-1).click());
    if ((await state()).pieces.top.on) {
      await tapPlanningShirt(); await wait({ top: { on: false } });
    }
    await tapPlanningShirt(); await wait({ top: { on: true } });
    await page.waitForFunction(() => document.body.innerText.includes('White shirt is now on your Top slot'), { timeout: 15000 });
    await shot('character-planning-owned-shirt');
    await reopen();
  });
  await test(10, async () => {
    await page.evaluate(() => localStorage.setItem('@forgemind:owned_attire:wearing-a@example.test', '[]'));
    await reopen();
    await page.waitForFunction(() => document.body.innerText.includes('Your inventory is empty'), { timeout: 15000 });
    assert.ok(await page.$eval('[aria-label="Show Top"]', element => element.innerText.includes('Empty')));
    await clickText('Wear full costume');
    await wait({ top: { on: false }, bottom: { on: false }, shoes: { on: false }, wig: { on: false } });
    await shot('empty-inventory');
  });
  assert.equal(evidence.results.filter(result => result.result === 'FAIL').length, 0, 'Some web acceptance tests failed');
} catch (error) {
  evidence.errors.push(error.stack);
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => undefined);
  console.error(error);
  console.log((await page.evaluate(() => document.body.innerText)).slice(0, 8000));
  process.exitCode = 1;
} finally {
  await writeFile(path.join(out, 'web-results.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
}
