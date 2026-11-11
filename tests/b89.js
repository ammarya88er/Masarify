// الدفعة التانية من المراجعة: ترتيب التصنيفات، الهيدر الصغير، ملخص الشهر بيختفي، «سدد» من الرئيسية
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,11,9);
const ex=(id,cat,d)=>({id,book:'me',kind:'expense',amount:10,cat,account:'cash',date:d||'2026-11-01'});
{ // التصنيفات بترتيب الاستخدام
  const tx=[];for(let i=0;i<5;i++)tx.push(ex('a'+i,'eatout'));for(let i=0;i<3;i++)tx.push(ex('b'+i,'fuel'));tx.push(ex('c','grocery'));tx.push(ex('old','bills','2026-01-01'));
  const {run,V}=boot(seed({txns:tx}),NOW);run("app.go('add');app.setKind('expense');");
  const v=V(), p=l=>v.indexOf("app.setCat('"+l+"')");
  t('الأكتر استخدامًا فوق بالترتيب', p('eatout')>-1&&p('eatout')<p('fuel')&&p('fuel')<p('grocery'));
  t('اللي مااستخدمش قريب تحت «كل التصنيفات»', p('bills')<0&&v.indexOf('كل التصنيفات')>-1);
  run("app.setCat('__all__');");
  t('«كل التصنيفات» بتفتح الباقي', V().indexOf("app.setCat('bills')")>-1&&run("draft.cat")==='');
  run("app.setCat('bills');app.go('home');draft=newDraft();app.go('add');app.setKind('expense');");
  t('وبترجع مقفولة في التسجيل الجاي', V().indexOf("app.setCat('bills')")<0);
  const n=boot(seed(),NOW);n.run("app.go('add');app.setKind('expense');");
  t('من غير استخدام: كل التصنيفات ظاهرة', n.V().indexOf('كل التصنيفات')<0&&n.V().indexOf("app.setCat('bills')")>-1);
}
{ // «سدد» من الرئيسية
  const {run,V}=boot(seed({txns:[ex('c','eatout'),{id:'k',book:'me',kind:'expense',amount:200,cat:'eatout',account:'card',date:'2026-11-05'}]}),NOW);
  run("app.go('home');");t('زرار «سدد» جنب الكارت', V().indexOf("app.payCardGo('card')")>-1);
  run("app.payCardGo('card');");t('بيفتح خانة السداد', run("tab")==='wallet'&&run("payCard.id")==='card'&&V().indexOf('id="payc-card"')>-1);
  const z=boot(seed(),NOW);z.run("app.go('home');");t('مفيش عليك حاجة: مفيش زرار', z.V().indexOf('app.payCardGo')<0);
}
{ // ملخص الشهر اللي فات بيختفي بعد أسبوع
  const sal=d=>({id:'s'+d,book:'me',kind:'income',amount:1000,account:'cib',date:d,salary:true});
  const S=()=>seed({monthMode:'',txns:[sal('2026-09-25'),sal('2026-10-25'),ex('c','eatout','2026-10-01')]});
  const a=boot(S(),Date.UTC(2026,9,28,9));a.run("app.go('home');");t('أول أسبوع: ظاهر', a.V().indexOf('ملخص الشهر اللي فات جاهز')>-1);
  const b=boot(S(),NOW);b.run("app.go('home');");t('بعد أسبوع: اختفى، وزرار «ملخص الشهر» موجود', b.V().indexOf('ملخص الشهر اللي فات جاهز')<0&&b.V().indexOf('ملخص الشهر')>-1);
}
{ // الهيدر الصغير
  const fs=require('fs');const h=fs.readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
  t('قاعدة الهيدر الصغير موجودة', h.indexOf('body.mini header{')>-1&&h.indexOf("classList.toggle('mini',tab!=='home'&&tab!=='settings'")>-1);
}
done();
