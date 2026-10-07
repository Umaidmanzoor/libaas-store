import {chromium,webkit} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {startNextServer} from './preview.mjs';
const phase=process.argv[2]==='before'?'before':'after',dir=`screenshots/mobile/${phase}`;await mkdir(dir,{recursive:true});
const preview=await startNextServer();
const matrix=[['iphone-se',webkit,375,667],['iphone-15',webkit,390,844],['iphone-max',webkit,430,932],['pixel-7',chromium,412,915],['android-small',chromium,360,740],['ipad',webkit,768,1024]];
const manifest=JSON.parse(await readFile('.next/prerender-manifest.json','utf8'));
const routes=[...new Set([...Object.keys(manifest.routes).filter(p=>!p.startsWith('/_')&&!p.includes('.')),'/checkout/','/admin/login/'])];
const report=[];
async function device([name,engine,width,height]){
 const browser=await engine.launch();const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});const page=await context.newPage();
 try{for(const route of routes){const row={device:name,route,errors:[],frames:0,overflow:[],smallTargets:[],triggers:0};const error=e=>row.errors.push(e.message??e.text());page.on('pageerror',error);page.on('console',m=>{if(m.type()==='error')error(m)});
 try{await page.goto(preview.origin+route,{waitUntil:'networkidle',timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
 row.triggers=await page.evaluate(()=>window.gsap?.core.globals().ScrollTrigger?.getAll().length??(document.documentElement.dataset.scrollTriggerCount?Number(document.documentElement.dataset.scrollTriggerCount):null));
 row.smallTargets=await page.evaluate(()=>Array.from(document.querySelectorAll('a,button,input:not([type=hidden]),select,summary')).filter(el=>{const target=el.matches('input[type=checkbox],input[type=radio]')?(el.closest('label')||el):el;const r=target.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!el.closest('[inert],[aria-hidden=true]')&&(r.width<43||r.height<43)}).map(el=>({tag:el.tagName,label:(el.getAttribute('aria-label')||el.textContent||el.getAttribute('name')||'').trim().slice(0,60),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})));
 const slug=route.replaceAll('/','-')||'home';await mkdir(`${dir}/${name}/${slug}`,{recursive:true});
 for(let step=0;step<70;step++){const y=step*Math.round(height*.6);await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(220);const dimensions=await page.evaluate(()=>({y:scrollY,h:document.documentElement.scrollHeight,w:innerWidth,sw:document.scrollingElement.scrollWidth}));if(dimensions.sw>dimensions.w+1)row.overflow.push({step,...dimensions});await page.screenshot({path:`${dir}/${name}/${slug}/${String(step).padStart(2,'0')}.png`});row.frames++;if(dimensions.y+height>=dimensions.h-2)break;}
 row.clippedHeadings=await page.evaluate(()=>Array.from(document.querySelectorAll('h1,h2,h3')).filter(el=>{const r=el.getBoundingClientRect();return r.width>10&&getComputedStyle(el).visibility!=='hidden'&&el.scrollWidth>el.clientWidth+2}).map(el=>el.textContent.trim()));
 row.finalCounters=await page.locator('[data-count]').evaluateAll(els=>els.map(el=>({expected:el.getAttribute('data-count'),actual:el.textContent})));
 }catch(e){row.errors.push(e.message.split('\n').slice(0,3).join(' '));}report.push(row);page.removeAllListeners('pageerror');page.removeAllListeners('console');console.log(`${phase} ${name} ${route}: ${row.frames} frames, ${row.overflow.length} overflow, ${row.triggers} triggers, ${row.errors.length} errors`);await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));}
 }finally{await browser.close()}
}
try{for(let i=0;i<matrix.length;i+=2){const settled=await Promise.allSettled(matrix.slice(i,i+2).map(device));for(const s of settled)if(s.status==='rejected')throw s.reason;}
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});for(const route of ['/','/shop/','/product/gulnaar-shawl/']){await page.goto(preview.origin+route,{waitUntil:'networkidle'});await page.screenshot({path:`${dir}/desktop-${route.replaceAll('/','-')||'home'}.png`,fullPage:true});}await browser.close();
}finally{preview.server.close();await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));}
