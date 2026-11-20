// الدفعة ١: قسط الكارت يوم الكشف، تقسيم «اتغطى بفاوتشرات»، كارت أرقام الاشتراكات فوق مع الباقات
const {boot,seed,t,done}=require('./harness');
const day=(m,d)=>Date.UTC(2026,m-1,d,9);
// كارت كشفه يوم 20: شراء بالتقسيط يوم 13 نوفمبر → أول قسط في كشف 20 نوفمبر
const insS=(o)=>seed({monthMode:'',txns:[{id:'b',book:'me',kind:'expense',amount:1200,cat:'devices',account:'card',date:'2026-11-13',note:'ماوس',insBuy:'q'}],
  installments:[Object.assign({id:'q',name:'ماوس',mode:'bank',src:'card',account:'card',principal:1200,rate:0,monthly:200,months:6,paid:0,intPosted:0,
    buyDate:'2026-11-13',firstKey:'2026-11',firstMonth:'2026-11',day:20,total:0,tail:0,payments:[]},o||{})]});
{ // قبل الكشف بيوم: لسه مانزلش
  const {run,V}=boot(insS(),day(11,19));run("render();");
  t('قبل يوم الكشف: القسط لسه مانزلش', run("D.installments[0].paid")===0);
}
{ // يوم الكشف نفسه
  const {run,V}=boot(insS(),day(11,20));run("render();");
  t('يوم الكشف: نزل القسط الأول', run("D.installments[0].paid")===1);
  t('جدول القسط بتاريخ يوم الكشف', run("insSchedule(D.installments[0])[0].date")==='2026-11-20');
  t('القسط داخل في كشف نوفمبر (200 من الـ1200)', run("cardStmtFull(D.accounts.find(a=>a.id==='card'),'2026-11')")===200, run("cardStmtFull(D.accounts.find(a=>a.id==='card'),'2026-11')"));
  run("app.setWtab('ins');app.go('wallet');");
  t('«نزل في الكشف 1 من 6» في قسط الكارت', V().indexOf('نزل في الكشف <span class="n">1</span> من <span class="n">6</span>')>-1);
}
{ // نسخة قديمة كانت نزلته قبل الكشف بيوم: بيرجع لحد ما الكشف ينزل
  const {run}=boot(insS({paid:1,intPosted:1}),day(11,19));run("render();");
  t('القسط اللي اتحسب بدري رجع', run("D.installments[0].paid")===0&&run("D.installments[0].intPosted")===0);
}
{ // قسط بفايدة: الفايدة بتنزل يوم الكشف وبتتحسب فيه بعد ما تتأكد
  const {run}=boot(insS({rate:0.02,monthly:214.23}),day(11,20));run("render();");
  const it=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.insInt))"));
  t('الفايدة بتاريخ يوم الكشف', it&&it.date==='2026-11-20'&&it.pending===true);
  const f0=run("cardStmtFull(D.accounts.find(a=>a.id==='card'),'2026-11')");
  run("D.txns.find(x=>x.insInt).pending=false;");
  const f1=run("cardStmtFull(D.accounts.find(a=>a.id==='card'),'2026-11')");
  t('الفايدة المتأكدة داخلة في نفس الكشف', Math.abs(f1-f0-it.amount)<0.005, f0+' '+f1+' '+it.amount);
}
{ // السلفة لسه «دفعت»
  const {run,V}=boot(seed({txns:[{id:'s',book:'me',kind:'income',amount:5000,account:'cib',date:'2026-11-01',salary:true}],
    installments:[{id:'i',name:'موبايل',monthly:1000,months:10,paid:3,total:10000,day:1,account:'cib',src:'office',covered:'2026-10',firstMonth:'2026-08',payments:[]}]}),day(11,20));
  run("app.setWtab('ins');app.go('wallet');");
  t('قسط السلفة بيقول «دفعت»', V().indexOf('دفعت <span class="n">3</span> من')>-1&&V().indexOf('نزل في الكشف')<0);
}

// «اتغطى بفاوتشرات»: ليك كام ولكل واحد كام
const vS=()=>seed({monthMode:'',txns:[{id:'s',book:'me',kind:'income',amount:5000,account:'cib',date:'2026-11-01',salary:true},
  {id:'h',book:'me',kind:'expense',amount:297,account:'card',date:'2026-11-10',merchant:'م',note:'م',cat:'devices',
   vouchers:[{id:'a',amount:10000},{id:'b',amount:4500}],
   items:[{name:'ميكروويف',amount:5799,cat:'devices'},{name:'قلاية',amount:5999,cat:'lentcat',who:'إسماعيل'},{name:'مروحة',amount:2999,cat:'lentcat',who:'إسماعيل'}]},
  {id:'e',book:'me',kind:'expense',amount:60,account:'cash',date:'2026-11-05',cat:'grocery',voucher:{id:'v',amount:40}}]});
{
  const {run,V}=boot(vS(),day(11,20));
  const sp=JSON.parse(run("JSON.stringify(vchSplit(D.txns))"));
  t('الإجمالي 14,540', sp.tot===14540, sp.tot);
  t('ليك 5,839 (الميكروويف كله + 40)', JSON.stringify(sp.rows.find(x=>x.label==='ليك'))==='{"label":"ليك","amt":5839}', JSON.stringify(sp.rows));
  t('إسماعيل 8,701 (الباقي على أصنافه)', JSON.stringify(sp.rows.find(x=>x.label==='إسماعيل'))==='{"label":"إسماعيل","amt":8701}');
  run("app.go('home');sumOpen=true;render();");const v=V();
  t('السطر تحت الكروت متقسم بالأسامي', v.indexOf('واتغطى بفاوتشرات <span class="n">14,540</span>')>-1&&v.indexOf('<bdi>ليك</bdi> <span class="n">5,839</span> · <bdi>إسماعيل</bdi> <span class="n">8,701</span>')>-1);
  t('سطور باهتة في آخر «صرفت على إيه»', v.indexOf('<span>اتغطى بفاوتشرات — <bdi>ليك</bdi></span>')>-1&&v.indexOf('<span>اتغطى بفاوتشرات — <bdi>إسماعيل</bdi></span>')>-1);
}
{ // فاوتشر على حاجتك بس: سطر واحد زي الأول
  const {run,V}=boot(seed({monthMode:'',txns:[{id:'e',book:'me',kind:'expense',amount:60,account:'cash',date:'2026-11-05',cat:'grocery',voucher:{id:'v',amount:40}}]}),day(11,20));
  run("app.go('home');sumOpen=true;render();");const v=V();
  t('من غير ناس: سطر واحد من غير تقسيم', v.indexOf('واتغطى بفاوتشرات <span class="n">40</span> جنيه — مش داخل في المصروف.</div>')>-1&&v.indexOf('<span>اتغطى بفاوتشرات</span>')>-1&&v.indexOf('<bdi>ليك</bdi>')<0);
}

// شاشة الاشتراكات: الكارت فوق خالص والباقات داخلة فيه
{
  const S=seed({lineRate:143,subs:[{id:'n',name:'نتفليكس',amount:100,cur:'EGP',cycle:'monthly',next:'2026-12-01',account:'cib',cat:'subs',payments:[],dues:[],people:[],owner:'me'}],
    lines:[{id:'l1',name:'فليكس',price:100,period:28,next:'2026-12-01',log:[{t:'set',bal:0,d:'2026-11-01'}]},
      {id:'l2',name:'باقة النت',price:500,period:30,next:'2026-12-01',log:[{t:'set',bal:0,d:'2026-11-01'}]}]});
  const {run,V}=boot(S,day(11,20));run("app.setWtab('subs');app.go('wallet');");const v=V();
  const st=v.indexOf('<span>في الشهر</span>'), ln=v.indexOf('باقات بالرصيد'), add=v.indexOf('ضيف اشتراك');
  t('الكارت فوق خالص: قبل الباقات وقبل «ضيف اشتراك»', st>-1&&st<ln&&st<add, [st,ln,add].join());
  const yr=Math.round((1200+100*1.43*365/28+500*1.43*365/30)*100)/100;
  t('في السنة = الاشتراك + الباقات بتمنها التقريبي', v.indexOf('<b>'+run("fmt("+yr+")")+'</b><span>في السنة</span>')>-1, run("fmt("+yr+")"));
  t('في الشهر = السنة ÷ 12 للباقات', v.indexOf('<b>'+run("fmt(Math.round((100+"+(yr-1200)+"/12)*100)/100)")+'</b><span>في الشهر</span>')>-1);
  t('العدد: اشتراك + باقتين = 3', v.indexOf('<b>3</b><span>اشتراك وباقة</span>')>-1);
  t('اسم الباقة: «فليكس» ← «باقة فليكس»، و«باقة النت» زي ما هو', v.indexOf('>باقة فليكس</span>')>-1&&v.indexOf('>باقة النت</span>')>-1&&v.indexOf('باقة باقة')<0);
}
{ // التنبيه بالاسم من غير «باقة باقة»
  const {run,V}=boot(seed({lines:[{id:'l1',name:'باقة فليكس',price:100,period:28,next:'2026-11-20',log:[{t:'set',bal:150,d:'2026-11-01'}]}]}),day(11,20));
  run("app.go('home');");
  t('التنبيه: «باقة فليكس» مش «باقة باقة فليكس»', V().indexOf('باقة باقة')<0&&V().indexOf('باقة فليكس')>-1);
}
done();
