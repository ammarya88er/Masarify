// البحث بالصنف، الصنف متعلّم في الفاتورة، وصيانة المركبة
const {boot,seed,t,done}=require('./harness');
const rc=(id,date,items,o)=>Object.assign({id:id,book:'me',kind:'expense',amount:items.reduce((a,i)=>a+i.amount,0),cat:items[0].cat,account:'cash',date:date,merchant:'كارفور',note:'كارفور',items:items},o||{});
{ const {run,V}=boot(seed({txns:[rc('a','2026-09-01',[{name:'برجر بقري',amount:130,cat:'meat'},{name:'عيش',amount:20,cat:'grocery'}]),
    rc('b','2026-09-05',[{name:'برجر بقري',amount:140,cat:'meat'},{name:'جبنة',amount:60,cat:'dairy'}])]}));
  run("app.go('log');q='برجر';render();");
  const v=V();
  t('البحث عن صنف: كل مرة سطر بسعره', (v.match(/app.toggleItem\(/g)||[]).length===2&&v.indexOf('سطرين · مصروف <span class="n">270</span>')>-1);
  run("app.toggleItem('b',0);");
  t('الفاتورة بتفتح والصنف متعلّم', /class="d hl" data-ik="0"/.test(V())&&V().indexOf('جبنة')>-1);
  run("q='كارفور';openItem=null;render();");
  t('البحث باسم المحل: الفاتورة كلها', (V().match(/app.toggleItem\(/g)||[]).length===0&&(V().match(/app.toggleTxn\('/g)||[]).length===2);
  run("q='';fCat='meat';render();app.toggleItem('a',0);");
  t('التصنيف كمان: الصنف متعلّم', /class="d hl" data-ik="0"/.test(V()));
}
const veh={id:'v1',name:'سكوتر',kind:'سكوتر'};
const fuel=(id,date,odo)=>({id:id,book:'me',kind:'expense',amount:100,cat:'fuel',account:'cash',date:date,veh:'v1',liters:5,odo:odo});
const rep=(id,date,note,o)=>Object.assign({id:id,book:'me',kind:'expense',amount:200,cat:'repair',account:'cash',date:date,veh:'v1',note:note},o||{});
{ const {run,V}=boot(seed({vehicles:[veh],txns:[fuel('f1','2026-09-01',5900),rep('r1','2026-09-02','غيار زيت وزيت فتيس وفلتر هوا',{odo:6230}),fuel('f2','2026-09-20',6950)]}));
  const M=JSON.parse(run("JSON.stringify(vehMaint('v1'))"));
  const r=p=>M.rows.find(x=>x.part===p);
  t('ملاحظة فيها التلاتة: كلهم عند 6,230', r('oil').last.odo===6230&&r('gear').last.odo===6230&&r('filter').last.odo===6230&&r('filter').last.act==='change');
  t('الزيت الجاي 7,000 (6,200 + 800)، والفتيس 9,200', r('oil').next===7000&&r('gear').next===9200);
  t('الفلتر الجاي تنضيف مع الزيت', r('filter').act==='clean'&&r('filter').next===7000);
  t('العداد 6,950 قبل الزيت بأقل من 100: تنبيه', r('oil').due===true&&r('gear').due===false);
  run("app.go('home');alertsOpen=true;render();");
  t('في «محتاج انتباهك»: الزيت وتنضيف الفلتر قرّب', V().indexOf('زيت الموتور وتنضيف الفلتر قرّب')>-1&&V().indexOf('الغيار عند <span class="n">7,000</span>')>-1);
  run("app.go('wallet');app.setWtab('veh');");
  t('المحفظة: الجاي عند 7,000', V().indexOf('الجاي عند <span class="n">7,000</span>')>-1);
  run("app.mLogOpen('v1','gear');app.mLogSet('odo','5000');app.mLogDate('2026-08-01');app.mLogSave();");
  t('سجّل آخر مرة بتاريخ أقدم: آخر مرة لسه من المصروف', JSON.parse(run("JSON.stringify(vehMaint('v1').rows[1].last.odo)"))===6230);
  run("app.mCfgSet('v1','oil','1000');");
  t('غيّرت كل كام كيلو: الجاي اتغيّر', run("vehMaint('v1').rows[0].next")===7200);
}
{ // من غير عداد في المصروف: تقدير من البنزين، و«تنضيف فلتر»
  const {run}=boot(seed({vehicles:[veh],txns:[fuel('f1','2026-09-01',6000),rep('r1','2026-09-11','زيت وتنضيف فلتر'),fuel('f2','2026-09-21',6200)]}));
  const M=JSON.parse(run("JSON.stringify(vehMaint('v1'))"));
  t('العداد اتقدّر 6,100 تقريبًا', M.rows[0].last.odo===6100&&M.rows[0].last.est===true);
  t('تنضيف الفلتر: الجاي تغيير', M.rows[2].last.act==='clean'&&M.rows[2].act==='change');
}
{ // حركة صيانة من غير مركبة وعندك مركبة واحدة بس: بتتحسب لها
  const {run}=boot(seed({vehicles:[veh],txns:[rep('r1','2026-09-11','غيار زيت',{veh:undefined,odo:5000})]}));
  t('اتحسبت للسكوتر', run("vehMaint('v1').rows[0].last.odo")===5000);
}
{ // مراجعة: قراءة الملاحظة
  const {run}=boot(seed());
  const P=x=>JSON.parse(run('JSON.stringify(maintParts('+JSON.stringify(x)+').map(p=>p.part+(p.act?":"+p.act:"")).sort())')).join(',');
  t('«زيت وفتيس» = الاتنين', P('زيت وفتيس')==='gear,oil');
  t('«زيت الفتيس» = الفتيس بس', P('غيار زيت الفتيس')==='gear');
  t('«زيت فرامل» و«فلتر زيت» مش منهم', P('زيت فرامل')===''&&P('فلتر زيت')==='');
  t('«غسيل فلتر الهوا» تنضيف', P('غسيل فلتر الهوا')==='filter:clean');
}
{ // مراجعة: تصنيف + بحث باسم التصنيف
  const {run,V}=boot(seed({txns:[rc('a','2026-09-01',[{name:'برجر',amount:130,cat:'meat'},{name:'عيش',amount:20,cat:'grocery'}])]}));
  run("app.go('log');fCat='meat';q=catOf('meat').label.split(' ')[0];render();");
  t('بيلاقي الصنف', V().indexOf('مفيش نتايج')<0&&V().indexOf('برجر')>-1);
}
{ // مراجعة: «سجّل آخر مرة» بيتمسح
  const {run}=boot(seed({vehicles:[veh],txns:[]}));
  run("app.mLogOpen('v1','oil');app.mLogSet('odo','60000');app.mLogSave();");
  const id=run("D.vehicles[0].maintLog[0].id");
  run("app.mLogDel('v1','"+id+"');");
  t('اتمسح', run("D.vehicles[0].maintLog.length")===0&&run("vehOdo('v1')")===0);
}
done();
