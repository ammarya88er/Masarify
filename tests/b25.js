const {boot,seed,t,done}=require('./harness');
{ const {run,V}=boot(seed());
  run("app.go('settings');setsOpen.accs=true;render();");let v='';
  const cnt=id=>{run("app.openAccCfg('"+id+"');");return (V().match(/مصاريف الحساب/g)||[]).length;};
  t('مصاريف الحساب في البنك والكارت بس', cnt('cib')===1&&cnt('card')===1&&cnt('cash')===0&&cnt('ocash')===0);
  run("app.feeEdOpen('cib','');app.feeEdSet('name','رسوم الحساب');app.feeEdSet('amount','25');app.feeEdPick('next','2026-10-26');app.feeEdSave();");
  run("app.feeEdOpen('cib','');app.feeEdSet('name','رسايل');app.feeEdSet('amount','10');app.feeEdPick('cycle','q');app.feeEdPick('next','2026-10-26');app.feeEdSave();");
  run("app.feeEdOpen('card','');app.feeEdSet('name','مصاريف سنوية');app.feeEdPick('cycle','y');app.feeEdPick('next','2026-11-01');app.feeEdSave();");
  t('اتضافوا', run("D.accounts.find(a=>a.id==='cib').fees.length")===2 && run("D.accounts.find(a=>a.id==='card').fees[0].amount")===0);
  run("app.openAccCfg('cib');");v=V();t('ظاهرين في الإعدادات', v.indexOf('رسوم الحساب')>-1 && v.indexOf('كل 3 شهور')>-1 && (run("app.openAccCfg('card')"),V().indexOf('مش معروف')>-1));
  const S=JSON.parse(run("JSON.stringify(D)"));
  // يوم ٢٦ أكتوبر
  const b=boot(S,Date.UTC(2026,9,26,9));b.run("app.go('home');alertsOpen=true;render();");v=b.V();
  t('اتسجلوا لوحدهم', b.run("D.txns.filter(x=>x.accFee).map(x=>x.amount).sort().join()")==='10,25');
  t('الميعاد اتحرك', b.run("D.accounts.find(a=>a.id==='cib').fees.map(f=>f.next).join()")==='2026-11-26,2027-01-26');
  t('كل سطر في الإشعار ليه تمام وتراجع', (v.match(/app\.dropNote\(/g)||[]).length===2 && (v.match(/app\.undoAuto\(/g)||[]).length===2 && v.indexOf('clearAutoNote')<0);
  const nid=b.run("D.autoNote.find(n=>n.text.indexOf('رسايل')>-1).id");
  b.run("app.undoAuto('"+nid+"');");
  t('تراجع شال الخصم ومارجعش يتسجل', b.run("D.txns.filter(x=>x.accFee).length")===1 && (b.run("runAuto(),D.txns.filter(x=>x.accFee).length"))===1);
  const n2=b.run("D.autoNote[0].id");b.run("app.dropNote('"+n2+"');");
  t('تمام بتشيل السطر بتاعها بس', b.run("D.autoNote.length")===0||b.run("D.autoNote.length")===1);
  // الكارت: مبلغ مش معروف
  const S2=JSON.parse(b.run("JSON.stringify(D)"));
  const c=boot(S2,Date.UTC(2026,10,2,9));c.run("app.go('home');alertsOpen=true;render();");v=c.V();
  t('المبلغ المش معروف بيسأل في التنبيهات', v.indexOf('مصاريف سنوية — كارت المشتريات')>-1);
  const fid=c.run("D.accounts.find(a=>a.id==='card').fees[0].id");
  c.run("app.feeAskOpen('card|"+fid+"');");c.doc.getElementById('feeaskin').value='350';c.run("app.feeAskSave('card','"+fid+"');");
  t('اتسجل واتحفظ للمرة الجاية', c.run("D.txns.some(x=>x.accFee===\'"+fid+"\'&&x.amount===350&&x.date==='2026-11-01')") && c.run("D.accounts.find(a=>a.id==='card').fees[0].amount")===350 && c.run("D.accounts.find(a=>a.id==='card').fees[0].next")==='2027-11-01');
  t('التنبيه راح', c.V().indexOf('مصاريف سنوية — كارت المشتريات')<0);
}
{ // مايسجلش حاجات قبل ما يتضاف
  const S=seed();S.accounts[1].fees=[{id:'f',name:'رسوم',amount:20,cycle:'m',next:'2026-08-26',day:26,since:'2026-09-25'}];
  const {run}=boot(S);
  t('مابيرجعش لمواعيد فاتت', run("D.txns.filter(x=>x.accFee).length")===0);
}
done();
