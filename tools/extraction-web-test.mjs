import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'docs/evidence/extraction';
const image = 'data:image/png;base64,' + (await readFile(`${out}/synthetic-reference.png`)).toString('base64');
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 1000, hasTouch: true });
const evidence = { fixture: 'Synthetic full-body diagram; cached test account/inventory. Real local service unless a test explicitly intercepts it.', results: [], pageErrors: [], stages: [] };
page.on('pageerror', e => evidence.pageErrors.push(e.message));
await page.setRequestInterception(true);
let mode = 'real', release, aborted = false;
page.on('request', request => {
  const url = request.url();
  if (url.includes(':3000/') || url.includes(':5000/')) return request.abort();
  if (url.includes('/api/extract-reference')) {
    if (mode === 'offline') return request.abort();
    if (mode === 'hold') { release = request; return; }
  }
  request.continue();
});
page.on('requestfailed', request => { if (request.url().includes('/api/extract-reference')) aborted = true; });
await page.evaluateOnNewDocument(image => {
  if (localStorage.getItem('@extraction:seeded')) return;
  const email = 'extraction-a@example.test';
  const user = { user_id: '00000000-0000-4000-8000-000000000001', email, display_name: 'Extraction fixture', is_cosplayer: true, is_organizer: false, base_body_selection: 'female', verification_status: 'not_submitted' };
  localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
  localStorage.setItem('@forgemind:data_consent', JSON.stringify({ accepted: true }));
  const key = '@forgemind:planning-briefs:v1:' + email;
  localStorage.setItem(key+':image:test', image);
  localStorage.setItem(key, JSON.stringify({ version: 1, briefs: [{ brief_id: 'extraction-brief', status: 'brief', character_name: 'Extraction test reference', skill_level: 'beginner', budget: 0, target_date: '2027-12-01', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', reference_key: key+':image:test' }] }));
  const base = { user_id: user.user_id, client_id: null, entry_method: 'text', entry_language: 'english', photo_urls: [], auto_categorized_style: '', flexibility_tag: 'as-is-only', condition_rating: 5, condition_photo_history: [], availability_status: 'free', committed_to_project_id: null, acquired_date: '2026-11-01', acquisition_cost: 0, notes: '', version: 1, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' };
  localStorage.setItem('@forgemind:owned_attire:'+email, JSON.stringify([{ ...base, attire_id: 'owned-black-wig', original_input_text: 'black wig', auto_categorized_type: 'wig', auto_categorized_color: 'black' }]));
  localStorage.setItem('@extraction:seeded', '1');
}, image);
const key = '@forgemind:reference:v1:extraction-a%40example.test:extraction-brief';
const outfitKey = '@forgemind:outfit:v3:extraction-a%40example.test:project:extraction-brief';
const text = () => page.evaluate(() => document.body.innerText);
const click = async label => {
  const element = await page.waitForFunction(label => [...document.querySelectorAll('[tabindex],button,[role="button"]')].find(e => e.textContent.trim().toLowerCase() === label.toLowerCase()), { timeout: 20000 }, label);
  await element.asElement().scrollIntoView();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await element.asElement().click();
};
const waitText = label => page.waitForFunction(label => document.body.innerText.includes(label), { timeout: 60000 }, label);
const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
const shot = name => page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
const openBrief = async () => { await page.waitForSelector('[aria-label="Edit brief for Extraction test reference"]', { timeout: 60000 }); await page.click('[aria-label="Edit brief for Extraction test reference"]'); await waitText('Start with a clear brief'); };
const run = async (id, action) => {
  try { await action(); evidence.results.push({ id, status: 'RAN PASS', platform: 'Expo web / PhoneFrame' }); console.log(`${id}: RAN PASS`); }
  catch (e) { evidence.results.push({ id, status: 'FAILED', error: e.stack }); console.log(`${id}: FAILED ${e.message}`); await shot(`failure-${id}`); throw e; }
};
try {
  await page.goto('http://127.0.0.1:8091', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await openBrief();
  await run('T2', async () => {
    mode = 'hold'; const before = await page.evaluate(() => localStorage.getItem('@forgemind:planning-briefs:v1:extraction-a@example.test'));
    await click('Analyze with AI →'); await waitText('Sending image');
    await click('Cancel'); await waitText('Start with a clear brief');
    if (release) { await release.abort().catch(() => {}); release = null; }
    assert.equal(await state(), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('@forgemind:planning-briefs:v1:extraction-a@example.test')), before);
    await shot('cancel-unchanged');
  });
  await run('T3', async () => {
    mode = 'offline'; await click('Analyze with AI →'); await waitText('Cannot reach the local analysis service');
    await shot('unreachable'); await click('Retry'); await waitText('Cannot reach the local analysis service');
    await click('Enter components manually'); await waitText('No components yet');
    await click('+ Add missed component'); await waitText('Step 04'); await click('Save component'); await waitText('Component saved.');
    assert.equal((await state()).components.length, 1); assert.equal((await state()).components[0].originalAI, null);
    await shot('manual-component-saved');
    // Clear only this declared fixture review so the next test starts a fresh analysis.
    await page.evaluate(key => localStorage.removeItem(key), key);
    // Return through stack header to run a fresh real analysis.
    await page.goto('http://127.0.0.1:8091', { waitUntil: 'domcontentloaded' }); await openBrief();
  });
  await run('T1-synthetic-and-T4', async () => {
    mode = 'real';
    await page.evaluate(() => { window.__stages = []; const observer = new MutationObserver(() => { for (const s of ['Sending image', 'Analyzing…', 'Done']) if (document.body.innerText.includes(s) && !window.__stages.includes(s)) window.__stages.push(s); }); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); });
    await click('Analyze with AI →'); await waitText('6. accessory');
    const body = await text(); assert.ok(body.includes('Please check')); assert.ok(body.includes('Band: Low')); assert.ok(!body.includes('Band: High'));
    evidence.stages = await page.evaluate(() => window.__stages); await shot('six-components-real-service');
  });
  await run('T5', async () => {
    await click('Edit wig ✎'); await waitText('Step 04');
    await page.click('[aria-label="Target color #000000"]'); await click('curly'); await click('Own it'); await click('Save component');
    await waitText('Component saved.'); const saved = await state();
    assert.equal(saved.components[0].value.style, 'curly'); assert.equal(saved.components[0].value.plan, 'own');
    assert.ok(saved.components[0].originalAI); assert.equal(saved.components[0].userCorrections.length, 1); await shot('edited-wig');
  });
  await run('T6', async () => {
    await click('Edit gloves ✎'); await click('Delete component'); await waitText('Component deleted.'); assert.equal((await state()).components.length, 5);
    await click('+ Add missed component'); await click('gloves'); await click('Save component'); await waitText('Component saved.'); assert.equal((await state()).components.length, 6);
  });
  await run('T8', async () => {
    const before = await state();
    await page.evaluate(() => { const original = Storage.prototype.setItem; window.__restore = () => Storage.prototype.setItem = original; Storage.prototype.setItem = function(k,v) { if (k.startsWith('@forgemind:reference:')) throw new Error('Injected storage full'); return original.call(this,k,v); }; });
    await click('Confirm components'); await waitText('Could not save components'); assert.deepEqual(await state(), before); assert.ok(!(await text()).includes('Components confirmed and saved.'));
    await shot('write-failure'); await page.evaluate(() => window.__restore()); await click('Confirm components'); await waitText('Components confirmed and saved.');
  });
  await run('T7-local-restart', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' }); await openBrief(); await click('Analyze with AI →'); await waitText('Confirmed components · locked'); assert.equal((await state()).confirmed, true); await shot('restored-confirmed');
  });
  await run('T9', async () => {
    await click('Open outfit preview and wardrobe'); await waitText('Confirmed reference components supply');
    await page.waitForSelector('[data-testid="costume-viewer"] canvas', { timeout: 60000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Loading 3D body'), { timeout: 60000 });
    await waitText('Wear full costume');
    assert.ok(!(await text()).includes('No extracted reference data is available'));
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), outfitKey);
    if (stored) assert.ok(Object.values(stored.pieces).every(p => !p.on));
    await shot('confirmed-targets-bare');
    const viewer = await page.$('[data-testid="costume-viewer"]'); await viewer.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await viewer.screenshot({ path: `${out}/brief-preview-bare.png` });
  });
  await run('T10', async () => {
    await page.waitForSelector('[aria-label="Wear black wig"]'); await page.click('[aria-label="Wear black wig"]');
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.pieces.wig?.itemId === 'owned-black-wig', {}, outfitKey);
    assert.ok((await text()).includes('Black wig is now on your Wig slot')); await shot('owned-wig-worn');
    assert.ok((await text()).includes('Matches character color'));
    const viewer = await page.$('[data-testid="costume-viewer"]'); await viewer.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await viewer.screenshot({ path: `${out}/brief-preview-owned-wig.png` });
  });
  await run('T7-cached-account-isolation', async () => {
    await page.evaluate(image => {
      const user = JSON.parse(localStorage.getItem('@forgemind:active_session'));
      user.email = 'extraction-b@example.test'; user.user_id = '00000000-0000-4000-8000-000000000002';
      localStorage.setItem('@forgemind:active_session', JSON.stringify(user));
      const key = '@forgemind:planning-briefs:v1:' + user.email;
      localStorage.setItem(key+':image:test', image);
      const a = JSON.parse(localStorage.getItem('@forgemind:planning-briefs:v1:extraction-a@example.test'));
      a.briefs[0].reference_key = key+':image:test';
      localStorage.setItem(key, JSON.stringify(a));
    }, image);
    mode = 'offline'; await page.reload({ waitUntil: 'domcontentloaded' }); await openBrief(); await click('Analyze with AI →'); await waitText('Cannot reach the local analysis service');
    assert.ok(!(await text()).includes('Confirmed components · locked'));
    assert.equal(await page.evaluate(() => localStorage.getItem('@forgemind:reference:v1:extraction-b%40example.test:extraction-brief')), null);
    await shot('account-b-isolated');
  });
  await run('T11-browser-http-errors', async () => {
    mode = 'real';
    const responses = await page.evaluate(async () => {
      const cases = [new Blob(['not an image'], { type: 'image/png' }), new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])], { type: 'image/png' }), new Blob([new Uint8Array(1024*1024+1)], { type: 'image/jpeg' })];
      const results = [];
      for (const blob of cases) { const data = new FormData(); data.append('image', blob, 'misleading.png'); const response = await fetch('http://192.168.254.168:5055/api/extract-reference', { method: 'POST', body: data }); results.push({ status: response.status, body: await response.json() }); }
      return results;
    });
    assert.deepEqual(responses.map(r => r.status), [400,400,413]); evidence.uploadErrors = responses;
  });
  await run('T11-corrupt-image-ui', async () => {
    await page.evaluate(() => localStorage.setItem('@forgemind:planning-briefs:v1:extraction-b@example.test:image:test', 'data:image/png;base64,bm90IGFuIGltYWdl'));
    await page.reload({ waitUntil: 'domcontentloaded' }); await openBrief(); await click('Analyze with AI →');
    await waitText('The file is not a readable JPEG, PNG or WebP image.'); await shot('corrupt-image-error');
  });
} finally {
  evidence.cancelRequestAborted = aborted;
  await writeFile(`${out}/web-results.json`, JSON.stringify(evidence, null, 2)); await browser.close();
}
