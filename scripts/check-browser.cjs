// Browser checks of actual UI. Adapters contain selectors only, expectations are common.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const arm = process.argv[2];
const adapters = JSON.parse(fs.readFileSync(path.join(root,'shared/browser-adapters.json'),'utf8'));
const a=adapters[arm];
if (!a) throw new Error('Unknown UI adapter: '+arm);
const results=[];
(async()=>{
  const launch={headless:true};
  if(process.env.CHROME_EXECUTABLE) launch.executablePath=process.env.CHROME_EXECUTABLE;
  const browser=await chromium.launch(launch);
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ru-RU'});
  const page=await context.newPage();
  const pageErrors=[]; const externalRequests=[]; let dialogs=0;
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('dialog',async dialog=>{dialogs++; await dialog.dismiss();});
  page.on('request',request=>{if(!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) externalRequests.push(request.url());});
  const url=(process.env.TRACKER_BASE_URL||'http://127.0.0.1:8765')+'/'+arm+'/';
  const reset=async()=>{await page.goto(url); await page.locator(a.rows).first().waitFor();};
  const count=()=>page.locator(a.rows).count();
  const expectMetrics=async(total,done,progress)=>{
    if (a.summary) {
      const text=await page.locator(a.summary).innerText();
      const match=text.match(/Выполнено ([\d\s,.]+) из ([\d\s,.]+) ч/);
      assert.ok(match,'Hours summary is readable');
      assert.equal(Number(match[1].trim().replace(',', '.')),done);
      assert.equal(Number(match[2].trim().replace(',', '.')),total);
    } else {
      assert.equal(Number((await page.locator(a.total).innerText()).trim().replace(',', '.')),total);
      assert.equal(Number((await page.locator(a.done).innerText()).trim().replace(',', '.')),done);
    }
    assert.equal((await page.locator(a.progress).innerText()).trim(),progress+'%');
  };
  const check=async(id,fn)=>{const started=new Date().toISOString(); try{const details=await fn();results.push({id,status:'PASS',started,details}); console.log(id+' PASS '+(details||''));} catch(e){results.push({id,status:'FAIL',started,error:e.message});console.log(id+' FAIL '+e.message);}};
  await check('T1',async()=>{await reset();assert.equal(await count(),3);await expectMetrics(8,2,25); return '3 tasks; 8 h total; 2 h done; 25%';});
  await check('T2',async()=>{await reset(); const row=page.locator(a.rows).filter({hasText:'Практика'}); await row.getByRole('checkbox').check(); await expectMetrics(8,6,75);await row.getByRole('checkbox').uncheck(); await expectMetrics(8,2,25);return 'Practice checked: 75%; unchecked: 25%';});
  await check('T3',async()=>{await reset();await page.locator(a.filterActive).click(); assert.equal(await count(),2);assert.match(await page.locator(a.rows).allTextContents().then(x=>x.join(' ')),/Практика/);assert.match(await page.locator(a.rows).allTextContents().then(x=>x.join(' ')),/Повторение/); await expectMetrics(8,2,25);await page.locator(a.filterDone).click();assert.equal(await count(),1);assert.match(await page.locator(a.rows).innerText(),/Чтение/);await expectMetrics(8,2,25);return 'Active: 2; done: 1; metrics remain 25%';});
  await check('T4',async()=>{
    const cases=[['','2','titleError'],['   ','2','titleError'],['Проверка','','hoursError'],['Проверка','-1','hoursError'],['Проверка','0','hoursError'],['Проверка','0.7','hoursError'],['Проверка','24.5','hoursError']];
    for(const [title,hours,error] of cases){await reset();await page.locator(a.title).fill(title);await page.locator(a.hours).fill(hours);await page.locator(a.submit).click();assert.equal(await count(),3);assert.ok((await page.locator(a[error]).innerText()).trim().length>0,'field error must have text');assert.ok(await page.locator(a[error]).isVisible());assert.equal(await page.locator(a.title).inputValue(),title);assert.equal(await page.locator(a.hours).inputValue(),hours);await expectMetrics(8,2,25);}
    return '7 invalid input cases rejected, visible field errors, both inputs preserved';
  });
  await check('T4-boundaries',async()=>{for(const hours of ['0.5','24']){await reset();await page.locator(a.title).fill('  Граница  ');await page.locator(a.hours).fill(hours);await page.locator(a.submit).click();assert.equal(await count(),4);const row=page.locator(a.rows).filter({hasText:'Граница'});assert.equal(await row.getByRole('checkbox').isChecked(),false);await expectMetrics(8+Number(hours),2,Math.round(200/(8+Number(hours))));}return '0.5 and 24 accepted as active tasks';});
  await check('T5',async()=>{await reset();while(await count()) await page.locator(a.rows).first().getByRole('button',{name:/Удалить/}).click();await expectMetrics(0,0,0);assert.ok(await page.locator(a.empty).isVisible());assert.doesNotMatch(await page.locator('body').innerText(),/NaN|Infinity/);await page.locator(a.title).fill('После удаления');await page.locator(a.hours).fill('2');await page.locator(a.submit).click();assert.equal(await count(),1);await expectMetrics(2,0,0);return 'All deleted: 0 h / 0%; adding afterwards works';});
  await check('safe-title',async()=>{await reset();await page.locator(a.title).fill('<img src=x onerror=alert(1)>');await page.locator(a.hours).fill('1');await page.locator(a.submit).click();assert.equal(await count(),4);assert.equal(await page.locator(a.rows+' img').count(),0);assert.match(await page.locator(a.rows).allTextContents().then(x=>x.join(' ')),/<img src=x onerror=alert\(1\)>/);assert.equal(dialogs,0);return 'Title rendered as plain text; no image or alert';});
  await check('UI-390',async()=>{await page.setViewportSize({width:390,height:844});await reset();const dims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(dims.document<=dims.viewport,'document horizontal overflow: '+JSON.stringify(dims));assert.ok(dims.body<=dims.viewport,'body horizontal overflow: '+JSON.stringify(dims));for(const selector of [a.title,a.hours,a.submit,a.filterAll,a.filterActive,a.filterDone]){const box=await page.locator(selector).boundingBox();assert.ok(box && box.x>=0 && box.x+box.width<=390.5,selector+' fits viewport');} await page.locator(a.title).fill('Задача на телефоне');await page.locator(a.hours).fill('1');await page.locator(a.submit).click();assert.equal(await count(),4);await reset();return JSON.stringify(dims)+'; controls fit and adding works';});
  const output=path.join(root,'evidence',arm);fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'mobile-390.png'),fullPage:true});
  await page.setViewportSize({width:1280,height:900});await reset();
  await page.screenshot({path:path.join(output,'desktop-1280.png'),fullPage:true});
  await check('runtime',async()=>{assert.deepEqual(pageErrors,[]);assert.deepEqual(externalRequests,[]);return 'No page errors or external requests';});
  const report={arm,url,date:new Date().toISOString(),browser:await browser.version(),method:'Automated browser interaction via Playwright (not manual inspection)',results,pageErrors,externalRequests};
  fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
  if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
