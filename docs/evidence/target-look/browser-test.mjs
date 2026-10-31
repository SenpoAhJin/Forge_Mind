import puppeteer from 'puppeteer-core';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'docs/evidence/target-look', url = 'http://127.0.0.1:8092';
const browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({width:1280,height:1000});
const evidence = {url, fixture:'Declared synthetic review and cached inventory/account; no image analysis claimed.',results:[],errors:[]};
page.on('pageerror', error => evidence.errors.push(error.message));
await page.setRequestInterception(true);
page.on('request', req => req.url().includes(':3000/') || req.url().includes(':5000/') ? req.abort() : req.continue());
const image = 'data:image/png;base64,'+(await readFile('docs/evidence/extraction/synthetic-reference.png')).toString('base64');
const reviewKey = '@forgemind:reference:v1:target-a%40example.test:target-project';
const outfitKey = '@forgemind:outfit:v3:target-a%40example.test:project:target-project';
await page.evaluateOnNewDocument(image => {
  if(localStorage.getItem('@target:seeded')) return;
  const email='target-a@example.test', user={user_id:'00000000-0000-4000-8000-000000000001',email,display_name:'Target fixture',is_cosplayer:true,is_organizer:false,base_body_selection:'female',verification_status:'not_submitted'};
  localStorage.setItem('@forgemind:active_session',JSON.stringify(user));
  localStorage.setItem('@forgemind:data_consent',JSON.stringify({accepted:true}));
  const base='@forgemind:planning-briefs:v1:'+email;
  localStorage.setItem(base+':image:test',image);
  localStorage.setItem(base,JSON.stringify({version:1,briefs:[{brief_id:'target-project',status:'brief',character_name:'Target fixture',skill_level:'beginner',budget:0,target_date:'2027-12-01',created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',reference_key:base+':image:test'}]}));
  const result={schema_version:1,image:{width:100,height:200},method:'fallback',mode:'full',warnings:['Declared fixture fallback warning'],components:['wig','top','bottom','gloves','shoes','accessory'].map(type=>({type,zone:[0,0,1,1],colors:[{hex:'#EF4444',share:1,palette_id:'red'}],style:null,candidates:[],band:'low',warnings:['Declared fixture']}))};
  const review={version:1,briefId:'target-project',referenceImage:image,confirmed:true,result,deletedComponents:[],components:result.components.map((ai,i)=>({id:'component-'+i,originalAI:ai,source:'auto',userCorrections:[],value:{type:ai.type,name:ai.type,colors:['#EF4444'],style:ai.type==='wig'?'curly':'',material:'',notes:'',plan:'buy'}}))};
  localStorage.setItem('@forgemind:reference:v1:target-a%40example.test:target-project',JSON.stringify(review));
  const item={user_id:user.user_id,client_id:null,entry_method:'text',entry_language:'english',photo_urls:[],auto_categorized_style:'',flexibility_tag:'as-is-only',condition_rating:5,condition_photo_history:[],availability_status:'free',committed_to_project_id:null,acquired_date:'2026-11-01',acquisition_cost:0,notes:'',version:1,created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',auto_categorized_type:'wig'};
  localStorage.setItem('@forgemind:owned_attire:'+email,JSON.stringify([{...item,attire_id:'black-wig',original_input_text:'black wig',auto_categorized_color:'black'},{...item,attire_id:'white-wig',original_input_text:'white wig',auto_categorized_color:'white'}]));
  localStorage.setItem('@target:seeded','1');
},image);
const click=async label=>{
  const handle=await page.waitForFunction(label=>[...document.querySelectorAll('[tabindex],[role="button"],[role="switch"],button')].find(e=>e.textContent.trim().toLowerCase().startsWith(label.toLowerCase())),{timeout:20000},label);
  await handle.asElement().scrollIntoView(); await handle.asElement().click();
};
const wait=label=>page.waitForFunction(label=>document.body.innerText.includes(label),{timeout:60000},label);
const cards=()=>page.$$eval('[data-testid^="target-card-"]',nodes=>nodes.map(n=>n.dataset.testid));
const saved=key=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'null'),key);
const previewShot=async name=>{ const canvas=await page.$('[data-testid="costume-viewer"]'); await canvas.scrollIntoView(); await new Promise(resolve=>setTimeout(resolve,800)); await page.screenshot({path:out+'/'+name+'.png',fullPage:true}); };
const open=async()=>{ await page.goto(url,{waitUntil:'domcontentloaded'}); await page.waitForSelector('[aria-label="Edit brief for Target fixture"]',{timeout:60000}); await page.click('[aria-label="Edit brief for Target fixture"]'); await wait('Start with a clear brief'); await click('Analyze with AI'); await wait('Confirmed components'); await click('Open outfit preview and wardrobe'); await wait('Target look from your reference'); await page.waitForFunction(()=>document.querySelector('canvas')&&!document.body.innerText.includes('Loading 3D body'),{timeout:60000}); };
const run=async(id,action)=>{try{await action(); evidence.results.push({id,status:'RAN PASS'});console.log(id+' PASS');}catch(e){evidence.results.push({id,status:'FAILED',error:e.stack});await page.screenshot({path:out+'/failure-'+id+'.png',fullPage:true});throw e;}};
try{
 if(process.env.TARGET_FOLLOWUP){
  await open();
  await run('per-slot-wig-removal',async()=>{await page.click('[aria-label="Wear black wig"]');await wait('Black wig');await page.waitForFunction(()=>!document.querySelector('[data-testid="target-card-wig"]'));const toggle=await page.$('[aria-label="Show Wig"]');await toggle.scrollIntoView();await toggle.click();await page.waitForSelector('[data-testid="target-card-wig"]');assert.equal((await cards()).length,5);});
  await run('empty-state-analyze-navigation',async()=>{await page.evaluate(()=>{const user=JSON.parse(localStorage.getItem('@forgemind:active_session'));user.email='target-b@example.test';localStorage.setItem('@forgemind:active_session',JSON.stringify(user));});await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');const project=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo')&&e.textContent.includes('Open dashboard')));await project.asElement().scrollIntoView();await project.asElement().click();await wait('No confirmed reference for this project');await click('Back to Analyze');await wait('Start with a clear brief');assert.ok(!(await page.evaluate(()=>document.body.innerText)).includes('Saved brief could not be found'));await page.screenshot({path:out+'/empty-state-analyze.png',fullPage:true});});
 }else{
 await open();
 await run('T1',async()=>{assert.equal((await cards()).length,5);await wait('Not shown in 3D yet');await wait('Low confidence - please check');await wait('curly: default 3D shape used.');await previewShot('five-ghosts');});
 await run('T2',async()=>{await page.click('[aria-label="Wear black wig"]');await wait('Black wig');await page.waitForFunction(()=>!document.querySelector('[data-testid="target-card-wig"]'));assert.equal((await cards()).length,4);assert.equal((await saved(outfitKey)).pieces.wig.itemId,'black-wig');await previewShot('owned-wig');});
 await run('T3',async()=>{await click('Remove all');await page.waitForSelector('[data-testid="target-card-wig"]');assert.equal((await cards()).length,5);});
 await run('T4',async()=>{await page.click('[aria-label="Wear black wig"]');await wait('Black wig');await page.click('[aria-label="Wear white wig"]');await wait('White wig');assert.equal((await saved(outfitKey)).pieces.wig.itemId,'white-wig');assert.equal((await cards()).length,4);await previewShot('second-wig-head');});
 await run('T5',async()=>{for(const label of ['Male','Side','Back','Female','Front']){await click(label);await page.waitForFunction(()=>!document.body.innerText.includes('Loading 3D body'),{timeout:60000});assert.equal((await cards()).length,4);}assert.equal((await saved(outfitKey)).pieces.wig.itemId,'white-wig');});
 await run('T7',async()=>{await click('Target look: On');assert.equal((await cards()).length,0);assert.equal((await saved(outfitKey)).pieces.wig.itemId,'white-wig');await click('Target look: Off');assert.equal((await cards()).length,4);await click('Remove all');await page.waitForSelector('[data-testid="target-card-wig"]');assert.equal((await cards()).length,5);});
 await run('T8',async()=>{const before=await saved(reviewKey), inventory=await page.evaluate(()=>localStorage.getItem('@forgemind:owned_attire:target-a@example.test'));const button=await page.$('[data-testid="target-card-wig"] [tabindex]:last-child');await button.scrollIntoView();await button.click();await wait('Sourcing set to Make it.');const after=await saved(reviewKey);assert.equal(after.components[0].value.plan,'make');assert.deepEqual({...after.components[0].value,plan:before.components[0].value.plan},before.components[0].value);assert.deepEqual(after.components[0].originalAI,before.components[0].originalAI);assert.equal(await page.evaluate(()=>localStorage.getItem('@forgemind:owned_attire:target-a@example.test')),inventory);assert.ok(Object.values((await saved(outfitKey)).pieces).every(p=>!p.on));});
 await run('T6',async()=>{await click('Edit confirmed components');await wait('Component list unlocked');await click('Edit wig');await page.click('[aria-label="Target color #EF4444"]');await page.click('[aria-label="Target color #000000"]');await click('Save component');await wait('Component saved.');await click('Confirm components');await wait('Components confirmed and saved.');await click('Open outfit preview and wardrobe');await wait('Wig - #000000');assert.equal((await saved(reviewKey)).components[0].value.colors[0],'#000000');});
 await run('T9-restart',async()=>{await page.click('[aria-label="Wear black wig"]');await wait('Black wig');await open();assert.equal((await cards()).length,4);assert.equal((await saved(outfitKey)).pieces.wig.itemId,'black-wig');});
 await previewShot('restored-preview');
 await run('T11',async()=>{
   await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');
   const project=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo')&&e.textContent.includes('Open dashboard')));
   await project.asElement().scrollIntoView();await project.asElement().click();await wait('3D Preview');
   await wait('No confirmed reference for this project');await click('Use reference: Target fixture');await wait('Target look from your reference');
   await page.waitForSelector('[data-testid="target-card-wig"]');assert.equal((await cards()).length,5);
   await page.click('[aria-label="Wear black wig"]');await wait('Black wig');assert.equal((await cards()).length,4);await previewShot('dashboard-preview');
   const projects=await saved('@forgemind:projects:v1:target-a%40example.test');assert.equal(projects.projects.find(p=>p.project_id==='proj-gojo-s2-uniform').reference_brief_id,'target-project');
 });
 await run('planning-view',async()=>{
   await page.evaluate(()=>localStorage.setItem('@forgemind:characters:target-a@example.test',JSON.stringify([{id:'char-jujutsu-kaisen-gojo',name:'Gojo fixture',series:'Declared fixture',targetColors:[]}])));
   await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');const tab=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex],a')].find(e=>e.textContent.trim().endsWith('Characters')&&e.textContent.length<30));await tab.asElement().click();await wait('Gojo fixture');
   const character=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo fixture')&&e.textContent.includes('Declared fixture')));await character.asElement().click();await wait('Target look from your reference');assert.equal((await cards()).length,4);await previewShot('planning-preview');
 });
 await run('all-worn-empty-ghosts',async()=>{
   await page.evaluate(()=>{const key='@forgemind:owned_attire:target-a@example.test',items=JSON.parse(localStorage.getItem(key));for(const [id,category] of [['top','top'],['bottom','bottom'],['gloves','accessory'],['shoes','footwear']])items.push({...items[0],attire_id:'fixture-'+id,original_input_text:'black '+id,auto_categorized_type:category});localStorage.setItem(key,JSON.stringify(items));});
   await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');const project=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo')&&e.textContent.includes('Open dashboard')));await project.asElement().scrollIntoView();await project.asElement().click();await wait('Target look from your reference');await click('Wear full costume');await wait('Your available inventory pieces are now shown.');assert.equal((await cards()).length,0);await previewShot('all-owned-worn');await click('Remove all');await page.waitForSelector('[data-testid="target-card-wig"]');assert.equal((await cards()).length,5);
 });
 await run('marketplace-navigation',async()=>{
   const before=await saved(reviewKey),outfit=await saved('@forgemind:outfit:v3:target-a%40example.test:project:proj-gojo-s2-uniform');
   const button=await page.$('[data-testid="target-card-top"] [tabindex]');await button.scrollIntoView();await button.click();await wait('Join the Marketplace');assert.deepEqual(await saved(reviewKey),before);assert.deepEqual(await saved('@forgemind:outfit:v3:target-a%40example.test:project:proj-gojo-s2-uniform'),outfit);
 });
 await run('T10-no-review-and-corrupt',async()=>{
   await page.evaluate(key=>localStorage.setItem(key,'corrupt review'),reviewKey);
   await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');
   const project=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo')&&e.textContent.includes('Open dashboard')));await project.asElement().scrollIntoView();await project.asElement().click();
   await wait('Saved reference could not be read');assert.equal((await cards()).length,0);assert.equal(await page.evaluate(key=>localStorage.getItem(key),reviewKey),'corrupt review');await previewShot('corrupt-review');
 });
 await run('T9-cached-account',async()=>{
   await page.evaluate(()=>{const user=JSON.parse(localStorage.getItem('@forgemind:active_session'));user.email='target-b@example.test';user.user_id='00000000-0000-4000-8000-000000000002';localStorage.setItem('@forgemind:active_session',JSON.stringify(user));});
   await page.goto(url,{waitUntil:'domcontentloaded'});await wait('Open dashboard');const project=await page.waitForFunction(()=>[...document.querySelectorAll('[tabindex]')].find(e=>e.textContent.includes('Gojo')&&e.textContent.includes('Open dashboard')));await project.asElement().scrollIntoView();await project.asElement().click();await wait('No confirmed reference for this project');assert.equal((await cards()).length,0);await previewShot('account-b-bare');
 });
 }
}catch(e){await page.screenshot({path:out+'/failure-open.png',fullPage:true}); console.error(e.stack);process.exitCode=1;}finally{await writeFile(out+(process.env.TARGET_FOLLOWUP?'/followup-results.json':'/web-results.json'),JSON.stringify(evidence,null,2));await browser.close();}
