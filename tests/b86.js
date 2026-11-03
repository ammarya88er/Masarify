// باقات بالرصيد: الإضافة، الشحن، التجديد، ظبط الرصيد، التنبيهات، «تقدر تصرف»
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,3,9); // 3 نوفمبر
const sal={id:'s',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-10-25',salary:true};
const mk=()=>{const {run,V,B}=boot(seed({txns:[sal]}),NOW);
  run("app.go('wallet');wtab='subs';render();app.toggleSub();app.subSet('name','النت');app.subPick('cycle','line');");
  return {run,V,B};};

{ // الإضافة
  const {run,V}=mk();
  t('النوع «باقة برصيد» وخاناته', V().indexOf('باقة برصيد')>-1&&V().indexOf('سعر الباقة بالرصيد')>-1&&V().indexOf('الاشتراك ده بتاع مين؟')<0);
  t('مايتحفظش ناقص', run("lineAddOk()")===false);
  run("app.subSet('lprice','520');app.subSet('lperiod','30');app.subSet('lbal','19.15');app.subPick('lnext','2026-11-13');app.lineAdd();");
  t('اتحفظ خط', run("D.lines.length")===1&&run("lineBal(D.lines[0])")===19.15&&run("D.subs.length")===0);
  t('الكارت: الرصيد ومحتاج تشحن متقرّب لأقرب 10', V().indexOf('باقات بالرصيد')>-1&&V().indexOf('محتاج تشحن تقريبًا <span class="n">720</span>')>-1);
}
{ // الشحن
  const {run,V,B}=mk();
  run("app.subSet('lprice','520');app.subSet('lperiod','30');app.subSet('lbal','19.15');app.subPick('lnext','2026-11-13');app.lineAdd();");
  const id=run("D.lines[0].id"), c0=B('me','cash');
  run("app.lineOpen('"+id+"','charge');app.lineSet('paid','720');");
  t('مايتحفظش من غير حساب', run("lineOk()")===false);
  run("app.lineAcct('cash');app.lineCharge('"+id+"');");
  t('اتسجل مصروف فواتير من الحساب', B('me','cash')===c0-720&&run("D.txns.some(x=>x.line==='"+id+"'&&x.cat==='bills'&&x.amount===720)"));
  t('الرصيد بالتقدير لو سيبتها فاضية', Math.abs(run("lineBal(D.lines[0])")-(19.15+720/1.43))<0.01);
  run("app.lineOpen('"+id+"','charge');app.lineSet('paid','50');app.lineAcct('cib');app.lineSet('bal','560');app.lineCharge('"+id+"');");
  t('كتبت رصيدك بقى كام: بياخده هو', run("lineBal(D.lines[0])")===560);
  t('الكارت: الرصيد مكفّي', (run("render()"),V().indexOf('الرصيد مكفّي التجديد')>-1));
  const tx=run("D.txns.find(x=>x.amount===50).id");run("app.delTxn({stopPropagation(){}},'"+tx+"');");
  t('مسح الشحنة: الرصيد يرجع للي قبلها', Math.abs(run("lineBal(D.lines[0])")-(19.15+720/1.43))<0.01);
  run("app.undoLast();");t('والتراجع بيرجّعها', run("lineBal(D.lines[0])")===560);
}
{ // التجديد وظبط الرصيد
  const {run,V}=mk();
  run("app.subSet('lprice','520');app.subSet('lperiod','30');app.subSet('lbal','600');app.subPick('lnext','2026-11-13');app.lineAdd();");
  const id=run("D.lines[0].id"), n0=run("D.txns.length");
  run("app.lineOpen('"+id+"','renew');");
  t('جددت بدري: الميعاد الجاي محسوب من النهارده + المدة', run("lineDraft.next")==='2026-12-03');
  run("app.lineSet('bal','75.5');app.lineRenew('"+id+"');");
  t('اتجددت: مفيش مصروف، والرصيد اللي كتبته، والميعاد اتنقل', run("D.txns.length")===n0&&run("lineBal(D.lines[0])")===75.5&&run("D.lines[0].next")==='2026-12-03');
  run("app.lineOpen('"+id+"','set');app.lineSet('bal','70');app.lineSetBal('"+id+"');");
  t('ظبّط الرصيد', run("lineBal(D.lines[0])")===70);
  run("app.lineOpen('"+id+"','edit');app.lineSet('period','29');app.lineEdit('"+id+"');");
  t('عدّل المدة', run("D.lines[0].period")===29);
}
{ // التنبيهات و«تقدر تصرف»
  const S=seed({txns:[sal],lines:[{id:'n',name:'النت',price:520,period:30,next:'2026-11-13',since:'2026-10-01',log:[{t:'set',bal:19.15,d:'2026-10-27'}]},
    {id:'p',name:'التليفون',price:115,period:30,next:'2026-11-20',since:'2026-10-01',log:[{t:'set',bal:13.04,d:'2026-10-27'}]}]});
  const {run,V}=boot(S,NOW);run("app.go('home');alertsOpen=true;render();");
  t('بعد المرتب: تنبيه واحد للخطين', (V().match(/>اشحن رصيد</g)||[]).length===1&&V().indexOf('النت تقريبًا <span class="n">720</span>')>-1&&V().indexOf('التليفون تقريبًا <span class="n">150</span>')>-1);
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('«تقدر تصرف»: الاتنين في الرقم الأولاني', c.X.some(i=>/النت/.test(i.label)&&i.amt===720)&&c.X.some(i=>/التليفون/.test(i.label)&&i.amt===150));
  run("app.lineSnooze('n,p');render();");t('«فكّرني قبلها»: راح', V().indexOf('>اشحن رصيد<')<0);
  const r=boot(S,Date.UTC(2026,10,11,9));r.run("app.lineSnooze('n,p');app.go('home');alertsOpen=true;render();");
  t('قبل الميعاد بـ3 أيام: بيرجع لوحده', r.V().indexOf('النت بيتجدد')>-1&&r.V().indexOf('خلصت بدري')>-1);
  const d=boot(S,Date.UTC(2026,10,13,9));d.run("app.go('home');alertsOpen=true;render();");
  t('يوم الميعاد: «اتجددت؟»', d.V().indexOf('باقة النت اتجددت؟')>-1);
  d.run("app.lineWait('n');render();");t('«لسه»: يستنى لبكرة', d.V().indexOf('باقة النت اتجددت؟')<0);
  const e=boot(S,Date.UTC(2026,10,13,9));e.run("app.lineGo('n','renew');app.lineRenew('n');app.go('home');alertsOpen=true;render();");
  t('سجلت التجديد: مفيش «اتجددت؟»', e.V().indexOf('اتجددت؟')<0&&e.run("D.lines[0].next")==='2026-12-13');
  // رصيد مكفّي: مفيش تنبيه شحن ولا خصم
  const f=boot(seed({txns:[sal],lines:[{id:'n',name:'النت',price:520,period:30,next:'2026-11-13',log:[{t:'set',bal:600,d:'2026-10-27'}]}]}),NOW);
  f.run("app.go('home');alertsOpen=true;render();");
  t('الرصيد مكفّي: مفيش تنبيه ولا خصم', f.V().indexOf('اشحن رصيد')<0&&!JSON.parse(f.run("JSON.stringify(spendCalc())")).X.some(i=>/رصيد/.test(i.label)));
  // الإعدادات
  run("app.lineCfg('lineStep','50');");t('التقريب من الإعدادات', run("lineNextPay(D.lines[0])")===750);
}
{ // نسخة قديمة من غير خطوط
  const {run,V}=boot(seed({txns:[sal]}),NOW);run("app.go('wallet');wtab='subs';render();app.go('home');alertsOpen=true;render();");
  t('من غير خطوط: مفيش حاجة بتظهر', V().indexOf('اشحن رصيد')<0&&JSON.parse(run("JSON.stringify(spendCalc())")).X.length===0);
}
done();
