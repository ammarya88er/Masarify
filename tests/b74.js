// التعديل جوه السجل: الفورم تحت الحركة، وبعد الحفظ أو الإلغاء تفضل مكانك والصنف قدامك
const {boot,seed,t,done}=require('./harness');
{ const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','40');app.dset('note','شاي');app.saveEntry();");
  const id=run("D.txns[0].id");
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('فاضل في السجل والفورم تحت الحركة', run("tab")==='log'&&V().indexOf('class="inedit"')>-1&&V().indexOf('id="entrysave"')>-1&&V().indexOf('id="tx-'+id+'"')>-1);
  run("globalThis.__sc=null;inlineScroll=function(i,k){globalThis.__sc=[i,k];};");
  run("app.dset('amount','55');app.saveEntry();");
  t('اتحفظ والسجل زي ما هو', run("tab")==='log'&&run("editOp")===null&&run("D.txns.find(x=>x.op).amount")===55&&V().indexOf('class="inedit"')<0);
  t('الحركة مفتوحة وقدامك', run("openTxn")===run("D.txns.find(x=>x.op).id")&&run("__sc&&__sc[0]")===run("openTxn"));
  run("app.startTxnEdit({stopPropagation(){}},openTxn);app.dset('amount','99');app.cancelEditOp();");
  t('الإلغاء: مفيش تغيير وفاضل في السجل', run("tab")==='log'&&run("D.txns.find(x=>x.op).amount")===55&&run("editOp")===null);
}
{ // فاتورة كبيرة: بعد الحفظ الصنف اللي كنت بتعدله قدامك
  const items=[];for(let i=0;i<20;i++)items.push({name:'صنف '+(i+1),amount:10,cat:'other'});
  const {run,V}=boot(seed());
  run("app.go('scan');app.manualBill();scan.items="+JSON.stringify(items)+";Object.assign(scan,{account:'cash',merchant:'محل',date:'2026-09-25'});app.saveReceipt();");
  const id=run("D.txns[0].id");
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('فورم الفاتورة جوه السجل', run("tab")==='log'&&V().indexOf('id="saveRec"')>-1&&V().indexOf('onfocusin="scanFocusK=17"')>-1);
  run("globalThis.__sc=null;inlineScroll=function(i,k){globalThis.__sc=[i,k];};");
  run("scanFocusK=17;app.setItemCat(17,'snacks');app.saveReceipt();");
  t('اتحفظ التصنيف الجديد', run("D.txns.find(x=>x.items).items[17].cat")==='snacks');
  t('بينزلك على الصنف ١٨ مش أول الفاتورة ولا آخرها', JSON.stringify(run("JSON.stringify(__sc)"))===JSON.stringify(JSON.stringify([run("D.txns.find(x=>x.items).id"),17])), run("JSON.stringify(__sc)"));
  t('«إلغاء» في الفاتورة بيلغي التعديل', (function(){run("app.startTxnEdit({stopPropagation(){}},D.txns.find(x=>x.items).id);");return V().indexOf("app.cancelEditOp()")>-1;})());
  run("app.toggleTxn(openTxn);");
  t('قفل الحركة وانت بتعدل = إلغاء', run("editOp")===null&&run("tab")==='log');
}
{ // عملية من الدفتر التاني: بتفتح الشاشة العادية
  const {run}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('ocash');app.oMine(true);app.oMineAll('all');app.oMineFrom('cash');app.oSet('item','ورق');app.oCat('c1');app.oSet('amount','300');app.oHasFee(false);app.oToMe(false);app['oSave']();");
  run("app.setBook('me');app.go('log');");
  const id=run("D.txns.find(x=>x.book==='me'&&x.op).id");
  run("app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('عملية المكتب من سجلك: بتفتح شاشة المكتب', run("tab")==='add'&&run("book")==='office'&&run("editInline")===null);
}
{ // مراجعة: «محتاج انتباهك» مستخبي في الرئيسية وانت بتعدل، وفتح حركة تانية بيلغي التعديل
  const {run,V}=boot(seed({subs:[{id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-09-25',account:'cib',cat:'subs',payments:[],dues:[]}],_pendSince:'2026-09-01'}));
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','40');app.dset('note','شاي');app.saveEntry();");
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','10');app.dset('note','عيش');app.saveEntry();");
  run("app.go('home');alertsOpen=true;render();");
  t('قبل التعديل التنبيهات ظاهرة', V().indexOf('محتاج انتباهك')>-1);
  const a=run("D.txns.find(x=>x.note==='شاي').id"), b=run("D.txns.find(x=>x.note==='عيش').id");
  run("app.startTxnEdit({stopPropagation(){}},'"+a+"');");
  t('وانت بتعدل في الرئيسية: مستخبية', run("editInline")===a&&V().indexOf('محتاج انتباهك')<0);
  run("app.toggleTxn('"+b+"');");
  t('فتح حركة تانية: التعديل اتلغى والتانية مفتوحة', run("editOp")===null&&run("openTxn")===b);
}
done();
