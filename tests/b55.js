// تأمين الكارت: الرصيد اللي الكارت بدأ بيه داخل في الحسبة، وتصليح الشهر اللي اتعلّم غلط
// وترتيب الفاوتشرات بتاريخ الانتهاء، وقسم الفاوتشرات جنب الحسابات
const {boot,seed,t,done}=require('./harness');
const SEP=Date.UTC(2026,8,25,12,0,0);
const ins=run=>JSON.parse(run("JSON.stringify(D.txns.filter(t=>t.insFee).map(t=>({a:t.amount,d:t.date,p:!!t.pending})))"));
const cardWith=(o)=>{const s=seed();const c=s.accounts.find(a=>a.id==='card');Object.assign(c,o);return s;};
{ // كارت بادئ وعليه ٢٠٠٠ (متاح ٤٠٬٠٠٠ من ٤٢٬٠٠٠) — كشف ٢٠ أغسطس
  const {run}=boot(Object.assign(cardWith({opening:40000,insLast:'2026-08'}),{_insFix1:1}),SEP);run('render();');
  const f=ins(run);
  t('الرصيد اللي الكارت بدأ بيه داخل: ٠٫٩٪ من ٢٠٠٠ = ١٨', f.length===1&&f[0].a===18&&f[0].d==='2026-09-01'&&f[0].p, JSON.stringify(f));
  t('بيظهر في التنبيهات كتقديري', (run("app.go('home');alertsOpen=true;render();document.getElementById('view').innerHTML")).indexOf('تأمين متوقع')>-1);
}
{ // الحركات قبل الكشف بتتحسب، وبعده لأ، والمحجوز لأ، والسداد بيقلل
  const s=cardWith({opening:40000,insLast:'2026-08'});s._insFix1=1;
  s.txns=[{id:'e1',book:'me',kind:'expense',amount:1000,cat:'other',account:'card',date:'2026-08-10'},
    {id:'e2',book:'me',kind:'expense',amount:500,cat:'other',account:'card',date:'2026-08-22'},
    {id:'e3',book:'me',kind:'expense',amount:300,cat:'other',account:'card',date:'2026-08-12',pending:true},
    {id:'p1',book:'me',kind:'transfer',amount:700,account:'cib',to:'card',date:'2026-08-15'}];
  const {run}=boot(s,SEP);run('render();');
  t('٢٠٠٠ + ١٠٠٠ − ٧٠٠ = ٢٣٠٠ → ٢٠٫٧', ins(run)[0].a===20.7, JSON.stringify(ins(run)));
}
{ // كارت مسدد بالكامل: مفيش تأمين
  const {run}=boot(Object.assign(cardWith({opening:42000,insLast:'2026-08'}),{_insFix1:1}),SEP);run('render();');
  t('مفيش عليك حاجة: مفيش تأمين', ins(run).length===0);
}
{ // تصليح الشهر اللي اتعلّم غلط
  const {run}=boot(cardWith({opening:40000,insLast:'2026-09'}),SEP);run('render();render();');
  t('الشهر متعلّم ومفيهوش تأمين: بيتحسب مرة واحدة', ins(run).length===1&&ins(run)[0].a===18&&run('D._insFix1')===1);
  const s=cardWith({opening:40000,insLast:'2026-09'});
  s.txns=[{id:'m1',book:'me',kind:'expense',amount:16.43,cat:'fees',account:'card',date:'2026-09-01',note:'مصاريف تأمين'}];
  const x=boot(s,SEP);x.run('render();');
  t('لو سجلته بإيدك: مش بيتسجل تاني', ins(x.run).length===0);
  const y=boot(Object.assign(cardWith({opening:40000,insLast:'2026-09'}),{_insFix1:1}),SEP);y.run('render();');
  t('التصليح مش بيتكرر بعد أول مرة', ins(y.run).length===0);
}
{ // الفاوتشرات: جوه كل مجموعة اللي ينتهي بعدين فوق — زي بياناتك
  const v=(id,code,expiry,o)=>Object.assign({id,code,amount:1000,expiry,card:'1',used:false,usedOn:''},o||{});
  const L=[v('a','90000000000001','2026-12-01',{used:true,usedOn:'2026-09-03'}),v('b','9000000000002','2026-12-07',{used:true,usedBy:'سامي',usedOn:'2026-09-09'}),
    v('c','9000000000003','2026-12-09',{used:true,usedOn:'2026-09-11'}),v('d','9000000000004','2026-12-28',{used:true,usedBy:'سامي',usedOn:'2026-09-25',added:'2026-09-25'}),
    v('e','111','2026-11-01',{added:'2026-09-20'}),v('f','222','2026-12-15',{added:'2026-09-01'})];
  const {run,V}=boot(seed({vouchers:L}));run('app.goVouchers();');const h=V(),p=c=>h.indexOf('>'+c+'<');
  t('الشغال: اللي ينتهي بعدين فوق', p('222')<p('111'));
  t('المستخدم: ٢٨ ← ٩ ← ٧ ← ١ ديسمبر', p('111')<p('9000000000004')&&p('9000000000004')<p('9000000000003')&&p('9000000000003')<p('9000000000002')&&p('9000000000002')<p('90000000000001'));
}
{ // قسم الفاوتشرات في نفس كارت الحسابات
  const {run,V}=boot(seed());run("app.go('settings');");const h=V();
  const i=h.indexOf('>الحسابات<'), j=h.indexOf('>الفاوتشرات<'), k=h.indexOf('دفتر ');
  t('الفاوتشرات تحت الحسابات على طول', i>-1&&j>i&&j<k&&h.slice(i,j).indexOf('setcard')<0&&(h.slice(i,j).match(/class="srow"/g)||[]).length<=1, [i,j,k].join());
}
const src=require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
t('الحسبة القديمة اتشالت', src.indexOf('cardDebtAt')<0);
done();
