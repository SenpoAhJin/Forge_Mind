import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const out = path.resolve('docs/evidence/finish1');
await mkdir(out, { recursive: true });
console.log('Launching Chrome');
const browser = await puppeteer.launch({
  protocolTimeout: 60000,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
console.log('Chrome launched');
let page = await browser.newPage();
page.setDefaultTimeout(20000);
console.log('Page created');
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
console.log('Page configured');
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

const url = 'http://127.0.0.1:8096';
evidence.url = url;
evidence.fixture = 'Declared cached account/inventory and confirmed review fixtures; no analysis service; external HTTP blocked.';
await page.setRequestInterception(true);
page.on('request', request => request.url().startsWith(url) || /^(data|blob):/.test(request.url()) ? request.continue() : request.abort());
await page.evaluateOnNewDocument(() => {
  if (localStorage.getItem('@finish1:review-fixture')) return;
  const review = { version: 1, briefId: 'wearing-project', referenceImage: '', confirmed: true, result: null, deletedComponents: [],
    components: ['top', 'wig', 'bottom', 'shoes', 'gloves'].map(type => ({ id: type, originalAI: null, source: 'user', userCorrections: [],
      value: { type, name: type, colors: [type === 'wig' ? '#EF4444' : '#FFFFFF'], style: '', material: '', notes: '', plan: type === 'top' ? 'own' : 'buy' } })) };
  localStorage.setItem('@forgemind:reference:v1:wearing-a%40example.test:wearing-project', JSON.stringify(review));
  localStorage.setItem('@finish1:review-fixture', '1');
});
const key = '@forgemind:outfit:v3:wearing-a%40example.test:project:wearing-project';
const state = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const selectClick = async selector => { const element = await page.waitForSelector(selector); await element.evaluate(el => el.scrollIntoView({ block: "center" })); await element.click(); };
const click = label => selectClick(`[aria-label="${label}"]`);
const textClick = async text => {
  const handle = await page.waitForFunction(text => [...document.querySelectorAll('div,span')].find(element => element.childElementCount === 0 && element.textContent.trim().toLowerCase() === text.toLowerCase()), { timeout: 20000 }, text);
  const element = handle.asElement();
  await element.evaluate(element => element.scrollIntoView({ block: 'center' }));
  await element.click();
};
const wait = fn => page.waitForFunction(fn, { timeout: 20000 }, key);
const shot = async name => { await page.screenshot({ path: path.join(out, `phase2-${name}.png`), fullPage: true }); };
const run = async (name, action) => {
  try { await action(); evidence.results.push({ name, status: 'RAN PASS' }); console.log(`${name}: RAN PASS`); }
  catch (error) { evidence.results.push({ name, status: 'RAN FAILED', error: error.stack }); await shot(`failure-${name}`); throw error; }
};
const open = async () => {
  console.log('Opening exported app', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('App loaded; opening project');
  await page.waitForFunction(() => document.body.innerText.includes('Wearing verification project'), { timeout: 20000 });
  await writeFile(path.join(out, 'phase2-open-dom.txt'), await page.evaluate(() => document.body.innerText));
  await shot('opening');
  await textClick('Wearing verification project');
  await page.waitForSelector('[aria-label="Wear White shirt"]', { timeout: 45000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading 3D body'), { timeout: 45000 });
};
try {
  await open();
  await run('compare-preview-only', async () => {
    await click('Wear White shirt');
    await wait(k => JSON.parse(localStorage.getItem(k)).pieces.top.on);
    const before = await state();
    const otherStores = await page.evaluate(() => [localStorage.getItem('@forgemind:projects:v1:wearing-a%40example.test'), localStorage.getItem('@forgemind:owned_attire:wearing-a@example.test')]);
    await textClick('Compare missing Wig');
    assert.match(await page.$eval('[data-testid="compare-a"]', e => e.innerText), /1 of 5 slots · 20%/);
    assert.match(await page.$eval('[data-testid="compare-b"]', e => e.innerText), /2 of 5 slots · 40%/);
    await textClick('Show Look A'); await textClick('Show Look B'); await textClick('Use Look B');
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(await state(), before);
    assert.deepEqual(await page.evaluate(() => [localStorage.getItem('@forgemind:projects:v1:wearing-a%40example.test'), localStorage.getItem('@forgemind:owned_attire:wearing-a@example.test')]), otherStores);
    await shot('compare');
    const viewer = await page.$('[data-testid="costume-viewer"]');
    await viewer.screenshot({ path: path.join(out, 'phase2-compare-3d.png') });
    const red = await page.$eval('[data-testid="costume-viewer"] canvas', canvas => {
      const gl = canvas.getContext('webgl2'), pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let count = 0;
      for (let y = Math.floor(canvas.height * 0.6); y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] > 80 && pixels[i] > pixels[i + 1] * 1.2 && pixels[i] > pixels[i + 2] * 1.2) count++;
      }
      return count;
    });
    evidence.hypotheticalRedWigHeadPixels = red;
    assert.ok(red > 5, `Hypothetical red wig should render on the head: ${red} pixels`);
    await textClick('Keep Look A');
  });
  await run('save-two-switch-undo-remove-all', async () => {
    await page.locator('[aria-label="Look name"]').fill('Con day'); await textClick('Save current look');
    await wait(k => JSON.parse(localStorage.getItem(k)).savedLooks?.length === 1);
    await click('Wear Red wig'); await wait(k => JSON.parse(localStorage.getItem(k)).pieces.wig.on);
    await page.locator('[aria-label="Look name"]').fill('Red wig look'); await textClick('Save current look');
    await wait(k => JSON.parse(localStorage.getItem(k)).savedLooks?.length === 2);
    await textClick('Switch to Con day'); await wait(k => !JSON.parse(localStorage.getItem(k)).pieces.wig.on);
    await textClick('Undo'); await wait(k => JSON.parse(localStorage.getItem(k)).pieces.wig.on);
    await textClick('Remove all'); await wait(k => Object.values(JSON.parse(localStorage.getItem(k)).pieces).every(p => !p.on));
    await textClick('Undo'); await wait(k => JSON.parse(localStorage.getItem(k)).pieces.top.on && JSON.parse(localStorage.getItem(k)).pieces.wig.on);
    await shot('saved-looks');
  });
  await run('restart', async () => {
    const before = await state(); await open(); assert.deepEqual(await state(), before);
    await page.locator('text/Switch to Con day').wait(); await page.locator('text/Switch to Red wig look').wait();
  });
  await run('account-isolation', async () => {
    await page.evaluate(() => {
      const user = JSON.parse(localStorage.getItem('@forgemind:active_session')); user.email = 'wearing-b@example.test';
      localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
      const a = JSON.parse(localStorage.getItem('@forgemind:projects:v1:wearing-a%40example.test'));
      a.projects[0].user_id = user.email;
      localStorage.setItem('@forgemind:projects:v1:wearing-b%40example.test', JSON.stringify(a));
      localStorage.setItem('@forgemind:owned_attire:' + user.email, '[]');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' }); await textClick('Wearing verification project');
    await page.waitForFunction(() => document.body.innerText.includes('Your inventory is empty'));
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Switch to Con day')), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('@forgemind:outfit:v3:wearing-b%40example.test:project:wearing-project')), null);
    await page.evaluate(() => { const user = JSON.parse(localStorage.getItem('@forgemind:active_session')); user.email = 'wearing-a@example.test'; localStorage.setItem('@forgemind:active_session', JSON.stringify(user)); });
    await open(); assert.equal((await state()).savedLooks.length, 2);
  });
  await run('forced-failed-look-save', async () => {
    const before = await state();
    await page.evaluate(key => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if (k === key) throw new Error('Forced look save failure'); return window.originalSetItem.call(this,k,v); }; }, key);
    await page.locator('[aria-label="Look name"]').fill('Must fail'); await textClick('Save current look');
    await page.waitForFunction(() => document.body.innerText.includes('Forced look save failure'));
    assert.deepEqual(await state(), before);
    assert.equal(await page.evaluate(() => document.body.innerText.includes('Look saved.')), false);
    await shot('failed-save');
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await textClick('Retry loading outfit');
  });
  await run('deleted-inventory-slot', async () => {
    await page.evaluate(() => { const key = '@forgemind:owned_attire:wearing-a@example.test'; const items = JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(items.filter(item => item.attire_id !== 'red-wig'))); });
    await open(); await page.waitForFunction(() => document.body.innerText.includes('was deleted from inventory'));
    await textClick('Switch to Red wig look'); await wait(k => !JSON.parse(localStorage.getItem(k)).pieces.wig.on);
    await shot('deleted-inventory');
  });
  assert.deepEqual(evidence.errors, []);
} catch (error) {
  console.error(error);
  await writeFile(path.join(out, 'phase2-failure-dom.txt'), await page.evaluate(() => document.body.innerText));
  await shot('failure-open');
  process.exitCode = 1;
} finally {
  await writeFile(path.join(out, 'phase2-web-results.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
}
