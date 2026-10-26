// ضريبة الدمغة: كل ٣ شهور على أعلى مبلغ كان عليك للكارت خلال الربع
const {boot,seed,t,done}=require('./harness');
const OCT6=Date.UTC(2026,9,6,9,0,0);
const card=(o,extra)=>{const s=seed(extra);Object.assign(s.accounts.find(a=>a.id==='card'),o);return s;};
const st=run=>JSON.parse(run("JSON.stringify(D.txns.filter(t=>t.stampFee).map(t=>({a:t.amount,d:t.date,p:!!t.pending,n:t.note})))"));
const ex=(id,date,amount)=>({id,book:'me',kind:'expense',amount,cat:'other',account:'card',date});
{ // أعلى رصيد في الربع، مش آخره
  const s=card({opening:40000,stampLast:'2026-07'},{txns:[ex('e1','2026-08-10',3000),
    {id:'p1',book:'me',kind:'transfer',amount:4000,account:'cib',to:'card',date:'2026-08-20'},ex('e2','2026-09-05',500),ex('e3','2026-10-03',9000)]});
  const {run,V}=boot(s,OCT6);run('render();render();');
  const f=st(run);
  t('أعلى رصيد ٥٠٠٠ × ٠٫٠٥٪ = ٢٫٥', f.length===1&&f[0].a===2.5&&f[0].d==='2026-10-01'&&f[0].p, JSON.stringify(f));
  t('اسمها فيه الربع', f[0].n==='ضريبة دمغة — كارت المشتريات — يوليو لسبتمبر 2026');
  t('مرة واحدة بس', run("D.accounts.find(a=>a.id==='card').stampLast")==='2026-10');
  run("app.go('home');alertsOpen=true;render();");
  t('بتظهر في محتاج تأكيد', /data-g="2"[^>]*><\/span>\s*<span class="g"><span class="t">ضريبة دمغة/.test(V())&&V().indexOf('ضريبة دمغة متوقعة')>-1);
  const id=run("D.txns.find(t=>t.stampFee).id");
  run("app.startFix('"+id+"','final');document.getElementById('fixin').value='7.35';app.confirmFix('"+id+"');");
  t('ظبّط: المبلغ الحقيقي', run("D.txns.find(t=>t.stampFee).amount")===7.35&&!run("D.txns.find(t=>t.stampFee).pending"));
}
{ // رقم البنك: ١٤٬٧٠٠ → ٧٫٣٥
  const {run}=boot(card({opening:27300,stampLast:'2026-07'}),OCT6);run('render();');
  t('١٤٬٧٠٠ × ٠٫٠٥٪ = ٧٫٣٥', st(run)[0].a===7.35);
}
{ // لو سجلتها بإيدك
  const s=card({opening:27300,stampLast:'2026-07'},{txns:[Object.assign(ex('m','2026-10-01',7.35),{cat:'fees',note:'ضريبة دمغة'})]});
  const {run}=boot(s,OCT6);run('render();');
  t('متسجلة بإيدك: مش بتتسجل تاني', st(run).length===0&&run("D.accounts.find(a=>a.id==='card').stampLast")==='2026-10');
}
{ // أول مرة: بتبدأ من الربع الجاي
  const {run}=boot(card({opening:27300}),OCT6);run('render();');
  t('أول تشغيل: مفيش دمغة وبتبدأ من الربع الجاي', st(run).length===0&&run("D.accounts.find(a=>a.id==='card').stampLast")==='2026-10'&&run("D.accounts.find(a=>a.id==='card').stampRate")===0.05);
}
{ // مقفولة من الإعدادات
  const {run,V}=boot(card({opening:27300,stampLast:'2026-07'}),Date.UTC(2026,8,25,9,0,0));
  run("app.go('settings');setsOpen={accs:true};app.openAccCfg('card');");
  t('الإعدادات: «فيه ضريبة دمغة؟» ونسبتها', V().indexOf('فيه ضريبة دمغة؟')>-1&&V().indexOf('نسبة الدمغة ٪')>-1&&V().indexOf('فيه رسوم تأمين؟')>-1);
  run("app.setStamp('card',false);");
  t('لأ: النسبة صفر', run("stampRate(D.accounts.find(a=>a.id==='card'))")===0);
}
{ // كارت جديد
  const {run,V}=boot(seed());run("app.goAccounts();showAddAcc=true;accDraft.credit=true;accDraft.atype='credit';render();");
  t('إضافة كارت: السؤال موجود', V().indexOf('فيه ضريبة دمغة؟')>-1);
  const n0=run("D.accounts.length");
  run("accDraft.name='كارت تاني';accDraft.limit='10000';app.addAccount();");
  t('الأسئلة بتبدأ فاضية: مايتحفظش قبل ما تجاوب', run("D.accounts.length")===n0&&V().indexOf('جاوب على كل الأسئلة الأول')>-1);
  run("app.accPickSec(false);app.accPickIns(true);app.accPickStamp(true);app.addAccount();");
  const a=JSON.parse(run("JSON.stringify(D.accounts[D.accounts.length-1])"));
  t('اتحفظ بالنسبة', a.stamp===true&&a.stampRate===0.05);
}
done();
