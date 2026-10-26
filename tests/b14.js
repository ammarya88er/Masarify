const {boot,seed,t,done,r2}=require('./harness');

/* ===== ٤٩ — مشتريات الكارت: التقدير ما بيتخصمش ===== */
{
  const {run,V,B,doc}=boot(seed());
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.shutRow('cat');app.setCat('grocery');app.dset('amount','1000');draft.note='شنطة';app.setArr(true);");
  t('٤٩ التلميح بيقول مش هتتخصم دلوقتي', V().indexOf('مش هتتخصم دلوقتي')>0);
  run("app.saveEntry();");
  t('٤٩ الكارت اتخصم منه الأساسي بس', B('me','card')===41000, B('me','card'));
  t('٤٩ مفيش حركة رسوم', run("D.txns.filter(x=>x.cat==='fees').length")===0);
  const e=JSON.parse(run("JSON.stringify(D.arrPend)"));
  t('٤٩ التقدير اتسجل ٣٠ مستني تأكيد', e.length===1&&e[0].amount===30, JSON.stringify(e));
  run("app.go('home');alertsOpen=true;render();");
  t('٤٩ ظاهر في التنبيهات باسم المصروف', V().indexOf('>شنطة</span>')>0 && V().indexOf('مصاريف تدبير متوقعة')>0);
  run("app.startFeeFix('arr|"+e[0].id+"');");
  t('٤٩ التأكيد فيه تاريخ', V().indexOf('اتخصم إمتى؟')>0);
  t('٤٩ التأكيد فيه «مفيش تدبير»', V().indexOf(">مفيش تدبير</button>")>0);
  run("app.setFeeDate('2026-09-27');");
  doc.getElementById('feein').value='29.99';
  run("app.confirmArr('"+e[0].id+"');");
  const f=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.cat==='fees'))"));
  t('٤٩ بعد التأكيد اتخصم الرقم الحقيقي', f.amount===29.99 && B('me','card')===r2(41000-29.99), f.amount+' / '+B('me','card'));
  t('٤٩ بالتاريخ اللي اخترته', f.date==='2026-09-27');
  t('٤٩ التنبيه اختفى', run("D.arrPend.length")===0);
  // مفيش تدبير
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCat('grocery');app.dset('amount','500');app.setArr(true);app.saveEntry();");
  const id2=run("D.arrPend[0].id");
  run("app.noArr('"+id2+"');");
  t('٤٩ «مفيش تدبير» بيشيله من غير خصم', run("D.arrPend.length")===0 && run("D.txns.filter(x=>x.cat==='fees').length")===1);
  // مسح المصروف بيمسح تقديره
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCat('grocery');app.dset('amount','200');app.setArr(true);app.saveEntry();");
  const src=run("D.arrPend[0].src");
  run("app.delTxn({stopPropagation(){}},'"+src+"');");
  t('٤٩ مسح المصروف بيمسح تقديره', run("D.arrPend.length")===0);
}
/* ترحيل التقديرات اللي كانت اتخصمت */
{
  const {run,B}=boot(seed({txns:[
    {id:'p',book:'me',kind:'expense',amount:1000,cat:'grocery',account:'card',date:'2026-09-20',note:'شنطة'},
    {id:'f',book:'me',kind:'expense',amount:30,cat:'fees',account:'card',date:'2026-09-20',arrFee:true,pending:true,note:'مصاريف تدبير — شنطة'}]}));
  t('٤٩ ترحيل: التقدير رجع للرصيد', B('me','card')===41000, B('me','card'));
  t('٤٩ ترحيل: مستني تأكيد', run("D.arrPend.length")===1 && run("D.arrPend[0].amount")===30 && run("D.arrPend[0].note")==='شنطة');
}
/* الاشتراكات: على الكارت بس + نفس شاشة التأكيد + التاريخ */
{
  const S=seed({subs:[
    {id:'sc',name:'سبوتيفاي',amount:139,cur:'EGP',next:'2026-09-25',account:'card',cycle:'monthly',payments:[],dues:[]},
    {id:'sk',name:'نت البيت',amount:300,cur:'EGP',next:'2026-09-25',account:'cash',cycle:'monthly',payments:[],dues:[]}]});
  const {run,V,doc}=boot(S);
  run("paySubDate='2026-09-25';app.confirmPaySub('sc');app.confirmPaySub('sk');");
  const pc=JSON.parse(run("JSON.stringify(D.subs[0].payments[0])")), pk=JSON.parse(run("JSON.stringify(D.subs[1].payments[0])"));
  t('٤٩ اشتراك على الكارت: تقدير ٤٫١٧', pc.fee===4.17&&pc.feePending===true, JSON.stringify(pc));
  t('٤٩ اشتراك كاش: مفيش تدبير', !pk.fee&&!pk.feePending, JSON.stringify(pk));
  run("app.go('home');alertsOpen=true;render();");
  t('٤٩ تنبيه الاشتراك بنفس الشكل', V().indexOf('>سبوتيفاي</span>')>0 && (V().match(/مصاريف تدبير متوقعة/g)||[]).length===1);
  run("app.startFeeFix('sc|"+pc.t+"');");
  t('٤٩ تأكيد الاشتراك فيه تاريخ و«مفيش تدبير»', V().indexOf('اتخصم إمتى؟')>0 && V().indexOf('>مفيش تدبير</button>')>0 && V().indexOf('مفيش تدبير خالص')<0);
  run("app.setFeeDate('2026-09-27');");doc.getElementById('feein').value='4.17';run("app.confirmFee('sc|"+pc.t+"');");
  const f=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.cat==='fees'))"));
  t('٤٩ رسوم الاشتراك بالتاريخ اللي اخترته', f.date==='2026-09-27'&&f.amount===4.17, JSON.stringify(f));
  t('٤٩ النسبة في مكان واحد', require('fs').readFileSync(__dirname+'/s0.js','utf8').indexOf('0.03')<0);
}

/* ===== ٥٠ ===== */
{
  const S=seed({subs:[{id:'su',name:'Claude',amount:20,cur:'USD',next:'2026-10-01',account:'card',cycle:'monthly',dues:[],
     payments:[{d:'2026-09-20',t:'u1',paid:1000,dup:true}]}],
   txns:[{id:'u1',book:'me',kind:'expense',amount:1000,cat:'subs',account:'card',date:'2026-09-20',usd:20,rate:50,pending:true,note:'Claude'}]});
  const {run,V,doc}=boot(S);
  run("app.go('home');alertsOpen=true;render();");
  t('٥٠ السحب المتكرر بالدولار مابيطلعش في تنبيهين وفيه رجعت', V().indexOf("app.undoDup('su','u1')")>0 && (V().match(/app\.startFix\('u1'/g)||[]).length===0 && V().indexOf("app.startFeeFix('su|u1','final')")>0 && V().indexOf("app.startFeeFix('su|u1','hold')\">محجوز")>0);
  run("app.startFeeFix('su|u1');");doc.getElementById('feein').value='1060';run("app.confirmFee('su|u1');");
  t('٥٠ تظبيط الاشتراك بالدولار حدّث السعر', run("D.rate")===53, run("D.rate"));
}

/* ===== ٤٨ ===== */
{
  const {run,B,doc}=boot(seed({txns:[{id:'r',book:'me',kind:'expense',amount:1000,cat:'subs',account:'card',date:'2026-09-10',usd:20,refundSince:'2026-09-12',note:'مكرر',place:'Framer'}]}));
  run("app.go('home');alertsOpen=true;app.startRefundBack('r');");
  run("app.confirmRefundBack('r');");
  const back=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.refundOf==='r'))"));
  t('٤٨ المرتجع مصروف بالسالب', back.kind==='expense'&&back.amount===-1000, JSON.stringify(back));
  t('٤٨ المرتجع محجوز ومش في الرصيد لسه', back.refWait===true&&B('me','card')===41000);
  run("app.startRefArr('"+back.id+"');");doc.getElementById('rain').value='1012';run("app.refArrived('"+back.id+"');");
  t('٤٨ في نفس التصنيف', back.cat==='subs');
  const fx=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.fxDiff))"));
  t('٤٨ فرق الصرف مصروف بالسالب', fx.kind==='expense'&&fx.amount===-12, JSON.stringify(fx));
  t('٤٨ الرصيد صح (+١٢)', B('me','card')===42012, B('me','card'));
  t('٤٨ مش في «داخل»', run("txnIn(D.txns.find(x=>x.refundOf==='r'))")===false);
  run("app.go('log');app.setF('dir','in');");
  t('٤٨ فلتر داخل فاضي', run("logList()").indexOf('مفيش نتايج')>0);
}
{
  const {run,B}=boot(seed({txns:[
    {id:'o',book:'me',kind:'expense',amount:500,cat:'eatout',account:'cash',date:'2026-09-10',refundDone:true},
    {id:'b',book:'me',kind:'income',amount:500,account:'cash',date:'2026-09-12',refundOf:'o',note:'مرتجع'},
    {id:'x',book:'me',kind:'income',amount:5,cat:'fees',account:'cash',date:'2026-09-12',fxDiff:true}]}));
  t('٤٨ ترحيل: المرتجع القديم بقى مصروف سالب', run("JSON.stringify([D.txns.find(x=>x.id==='b').kind,D.txns.find(x=>x.id==='b').amount,D.txns.find(x=>x.id==='b').cat])")==='["expense",-500,"eatout"]');
  t('٤٨ ترحيل: فرق الصرف', run("D.txns.find(x=>x.id==='x').amount")===-5);
  t('٤٨ ترحيل: الرصيد ما اتغيرش', B('me','cash')===5005, B('me','cash'));
}

/* ===== ٤٥ — بمثالك: ٥٠٠ سلفة + ٣٠ اشتراك + ٤٧٠ سلفة، وبعت ٣٠٠ ===== */
{
  const S=seed({
    owed:[{id:'o1',amount:500,who:'علي',date:'2026-09-01',note:'سلفة',cat:'lentcat',got:false,lent:true},
          {id:'o2',amount:470,who:'علي',date:'2026-09-15',note:'سلفة تانية',cat:'lentcat',got:false,lent:true}],
    subs:[{id:'s',name:'نتفليكس',amount:90,cur:'EGP',next:'2026-10-05',account:'card',cycle:'monthly',payments:[],
      dues:[{id:'d',who:'علي',amount:30,date:'2026-09-05',got:false}]}]});
  const {run,V,B}=boot(S);
  run("app.go('home');alertsOpen=true;owedOpen=true;owedFor='g_علي';owedAcct='cash';owedGot='300';app.confirmOwedGet('g_علي');");
  t('٤٥ الـ٣٠٠ دخلت الكاش', B('me','cash')===5300);
  t('٤٥ الأقدم (٥٠٠) فاضل منه ٢٠٠ ومفتوح', run("JSON.stringify([D.owed[0].got,D.owed[0].amount,D.owed[0].orig])")==='[false,200,500]', run("JSON.stringify(D.owed[0])"));
  t('٤٥ الاشتراك (٣٠) لسه مفتوح زي ما هو', run("D.subs[0].dues[0].got")===false && run("D.subs[0].dues[0].amount")===30);
  t('٤٥ التانية (٤٧٠) زي ما هي', run("D.owed[1].amount")===470);
  run("owedOpen=true;render();");
  t('٤٥ الإجمالي ٧٠٠', V().indexOf('700')>0);
  t('٤٥ بيوري فاضل من ٥٠٠', V().indexOf('فاضل من <span class="n">500</span>')>0);
  run("owedFor='g_علي';owedAcct='cash';owedGot='250';app.confirmOwedGet('g_علي');");
  t('٤٥ الدفعة التانية قفلت ٢٠٠ و٣٠ وخدت ٢٠ من الـ٤٧٠', run("JSON.stringify([D.owed[0].got,D.subs[0].dues[0].got,D.owed[1].amount])")==='[true,true,450]', run("JSON.stringify([D.owed,D.subs[0].dues])"));
  run("owedFor='g_علي';owedAcct='cash';owedGot='450';app.confirmOwedGet('g_علي');");
  t('٤٥ الباقي كله اتقفل', run("D.owed.every(o=>o.got)")===true);
  t('٤٥ الكاش استلم ١٠٠٠ بالظبط', B('me','cash')===6000, B('me','cash'));
}
done();
