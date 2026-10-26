// التسجيل والتعديل: أسئلة «أيوه ولا لأ» من غير اختيار، نوع الدخل، التصنيف من آخر مرة، الفواتير القديمة
const {boot,seed,t,done}=require('./harness');
const ex=(id,date,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date},o||{});
{ // الأسئلة لازم تتجاوب
  const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','50');");
  t('مفيش «لأ» متختارة لوحدها', run("draft.hasFee===undefined&&draft.hasDisc===undefined&&draft.owed===undefined"));
  t('الحفظ مقفول ومكتوب «جاوب على كل الأسئلة»', run("entryOk()")===false&&V().indexOf('جاوب على كل الأسئلة الأول')>-1&&/id="entrysave" disabled/.test(V()));
  run("app['saveEntry']();");
  t('مااتحفظش', run("D.txns.length")===0);
  run("app.setHasDisc(false);app.setHasFee(false);app.setOwedPick('no');app.setFromFloat(false);");
  t('بعد ما جاوبت: الحفظ اتفتح', run("entryOk()")===true&&!/id="entrysave" disabled/.test(V()));
  run("app['saveEntry']();");
  t('اتحفظ، والشاشة رجعت من غير إجابات', run("D.txns.length")===1&&run("draft.hasFee===undefined"));
}
{ // نوع الدخل من غير اختيار جاهز
  const {run}=boot(seed());
  run("app.go('add');app.setKind('income');app.setAccount('cib');app.dset('amount','5000');");
  t('مفيش نوع متختار', run("draftIcat()")===''&&run("entryOk()")===false);
  run("app.setIcat('salary');");
  t('اختار «مرتب»: الحفظ اتفتح', run("entryOk()")===true);
  run("app['saveEntry']();");
  t('اتسجل مرتب', run("D.txns[0].salary")===true);
}
{ // نوع الدخل اللي اتعرف لوحده بيتحسب اختيار
  const {run}=boot(seed({txns:[{id:'i1',book:'me',kind:'income',amount:300,account:'cash',date:'2026-09-01',note:'شحن',icat:'charge'}],icats:[{id:'salary',label:'مرتب'},{id:'other_in',label:'أخرى'},{id:'charge',label:'بدل شحن'},{id:'diff',label:'فرق فلوس'},{id:'certint',label:'عائد'}]}));
  run("app.go('add');app.setKind('income');app.setAccount('cash');app.dset('note','شحن');app.dset('amount','300');");
  t('اتعرف لوحده', run("draftIcat()")==='charge'&&run("entryOk()")===true);
  run("app['saveEntry']();");
  t('اتسجل بيه', run("D.txns.find(x=>x.id!=='i1').icat")==='charge');
}
{ // التصنيف من آخر مرة
  const {run,V}=boot(seed({txns:[ex('a','2026-09-10',30,{note:'شاي',cat:'drinks'}),ex('b','2026-09-12',80,{place:'كارفور',cat:'grocery'})]}));
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.dset('note','شاي');");
  t('نفس الملاحظة: نفس التصنيف ومكتوب إنه من آخر مرة', run("draft.cat")==='drinks'&&run("catRowHtml()").indexOf('اتختار من آخر مرة')>-1);
  run("app.dset('note','حاجة جديدة');");
  t('ملاحظة جديدة: اتشال', run("draft.cat")==='');
  run("app.dset('place','كارفور');");
  t('نفس المكان', run("draft.cat")==='grocery');
  run("app.setCat('other');app.dset('note','شاي');");
  t('لو اخترت بنفسك مابيتغيرش', run("draft.cat")==='other');
}
{ // صنف الفاتورة من آخر مرة
  const {run}=boot(seed({txns:[ex('r','2026-09-10',20,{items:[{name:'شيبسي',amount:20,cat:'snacks'}]})]}));
  run("app.go('scan');app.manualBill();app.iset(0,'name','شيبسى');app.itemNameDone(0);");
  t('شيبسى خد «snacks»', run("scan.items[0].cat")==='snacks');
}
{ // فاتورة قديمة بتتفتح في شاشة الفاتورة وتصنيفها يتغير
  const s=seed({txns:[ex('r','2026-09-10',90,{cat:'drinks',merchant:'محل',note:'محل',items:[{name:'شاي',amount:40,cat:'drinks'},{name:'كوكا',amount:30,cat:'drinks',who:'هاجر'},{name:'رز',amount:30,cat:'food'}],discount:10})],
    owed:[{id:'o1',amount:27,who:'هاجر',date:'2026-09-10',note:'محل',cat:'lentcat',srcTxn:'r',got:false,lent:true}]});
  const {run}=boot(s);
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'r');");
  t('اتفتحت بخانات الفاتورة جوه السجل بأصنافها والخصم', run("tab")==='log'&&run("editInline")==='r'&&run("scan.items.length")===3&&run("scan.disc")==='10'&&run("scan.items[1].who")==='هاجر');
  run("app.setItemCat(2,'other');app['saveReceipt']();");
  const r=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.id==='r'))"));
  t('نفس الحركة بنفس المبلغ والتصنيف اتغير', r&&r.amount===90&&r.items[2].cat==='other', JSON.stringify(r));
  t('اللي على هاجر زي ما هو', run("D.owed.length")===1&&run("D.owed[0].amount")===27&&run("D.owed[0].who")==='هاجر');
}
{ // فاتورة مش متطابقة: «عدّل» الصغير فيه تصنيف كل صنف
  const {run}=boot(seed({txns:[ex('r','2026-09-10',95,{items:[{name:'شاي',amount:40,cat:'drinks'},{name:'رز',amount:60,cat:'food'}]})]}));
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'r');");
  t('بتتفتح في التعديل الصغير', run("eTxn&&eTxn.id")==='r');
  run("app.eItemCat(1,'other');app.saveTxnEdit('r');");
  t('تصنيف الصنف اتغير والمبلغ زي ما هو', run("D.txns[0].items[1].cat")==='other'&&run("D.txns[0].amount")===95);
}
{ // عملية جديدة بتتفتح بإجاباتها، والسؤال اللي ماتسألش يفضل من غير إجابة
  const {run}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','40');app.setHasDisc(false);app.setHasFee(false);app.setOwedPick('no');app.setFromFloat(false);app['saveEntry']();");
  const id=run("D.txns[0].id");
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('الإجابات رجعت زي ما هي', run("draft.hasFee")===false&&run("draft.hasDisc")===false&&run("entryOk()")===true);
  const before=run("JSON.stringify(D.txns)");run("app['saveEntry']();");
  t('حفظ من غير تغيير مايغيّرش', run("JSON.stringify(D.txns)")===before);
  run("app.startTxnEdit({stopPropagation(){}},'"+id+"');app.setKind('income');app.dset('amount','5000');");
  t('غيّرتها دخل: النوع لازم يتختار', run("draftIcat()")===''&&run("entryOk()")===false);
}
done();
