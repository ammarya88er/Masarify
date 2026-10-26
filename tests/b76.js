// فلوس جاتلك من المكتب: نوعها في دخلك يتختار ويتغيّر
const {boot,seed,t,done}=require('./harness');
const S=()=>seed({icats:[{id:'salary',label:'مرتب'},{id:'other_in',label:'دخل تاني'},{id:'inv',label:'فواتير للمكتب'},{id:'tr',label:'بدل مواصلات'}],
  txns:[{id:'old',book:'me',kind:'income',amount:500,account:'cash',date:'2026-09-01',note:'فاتورة',fromOffice:true,icat:'inv'}]});
{ const {run,V}=boot(S());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('ocash');app.oSet('item','مواصلات');app.oCat('c1');app.oSet('amount','90');app.oMine(false);app.oHasFee(false);app.oToMe(true);app.oTo('cash');");
  t('فيه «نوعه في دخلك؟»', V().indexOf('نوعه في دخلك؟')>-1);
  run("app.oToMeIcat('tr');app['oSave']();");
  const inc=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.fromOffice&&x.note==='مواصلات'))"));
  t('اتسجل بالنوع اللي اخترته', inc.icat==='tr');
  run("app.setBook('me');app.go('log');app.toggleTxn('"+inc.id+"');");
  t('في السجل: تقدر تغيّر النوع من غير ما تفتح المكتب', V().indexOf('نوعه في دخلك:')>-1);
  run("app.setTxnIcat('"+inc.id+"','inv');");
  t('اتغيّر، والعملية فاكراه', run("D.txns.find(x=>x.id==='"+inc.id+"').icat")==='inv'&&run("D.ops[D.txns.find(x=>x.id==='"+inc.id+"').op].d.toMeIcat")==='inv');
  run("app.startTxnEdit({stopPropagation(){}},'"+inc.id+"');app.oSet('amount','95');app['oSave']();");
  t('تعديل العملية بعدها: النوع زي ما هو', run("D.txns.find(x=>x.fromOffice&&x.note==='مواصلات').icat")==='inv'&&run("D.txns.find(x=>x.fromOffice&&x.note==='مواصلات').amount")===95);
}
{ // مراجعة: مفيش «مرتب» في الاختيارات، و«دخل تاني» بيتحفظ فاضي، والاقتراح من فلوس المكتب بس
  const s=S();s.txns.push({id:'g',book:'me',kind:'income',amount:50,account:'cash',date:'2026-09-05',note:'مواصلات',icat:'tr'});
  const {run,V}=boot(s);
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('ocash');app.oSet('item','مواصلات');app.oCat('c1');app.oSet('amount','90');app.oMine(false);app.oHasFee(false);app.oToMe(true);app.oTo('cash');");
  t('مفيش «مرتب»', V().indexOf("app.oToMeIcat('salary')")<0);
  t('الاقتراح من فلوس المكتب (فواتير) مش من دخل تاني بنفس الاسم', run("oToMeIcat()")==='inv');
  run("app.oToMeIcat('other_in');app['oSave']();");
  t('«دخل تاني» اتحفظ فاضي', run("D.txns.find(x=>x.fromOffice&&x.note==='مواصلات').icat")===undefined);
}
done();
