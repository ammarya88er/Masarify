const {boot,seed,t,done}=require('./harness');
const fx=o=>seed(Object.assign({fx:{on:true,curs:['USD','EUR'],rates:{USD:50},at:'',manual:{}}},o||{}));
const addUsd=s=>{s.accounts.push({id:'usd',name:'دولار',opening:0,scope:'me',atype:'cash',cur:'USD',openRate:50});s.accounts.push({id:'eur',name:'يورو',opening:0,scope:'me',atype:'cash',cur:'EUR'});return s;};
{ const {run,V}=boot(addUsd(fx()));
  run("app.go('add');draft.kind='income';render();app.shutRow('acct');app.setAccount('eur');app.dset('amount','100');");
  t('٢ من غير سعر: الحفظ مقفول ورسالة', run('entryOk()')===false&&V().indexOf('لسه ماجاش')>-1);
  run("app.setAccount('usd');app.dset('amount','100');");t('بسعر: الحفظ مفتوح', run('__yn(),entryOk()')===true);
  run("app.saveEntry();");
  // ٣ سداد الكارت من دولار
  run("D.accounts.find(a=>a.id==='card').opening=30000;");
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('card');app.dset('amount','40');app.dset('toAmt','2000');app.setFxOf('income');app.saveEntry();");
  t('٣ الكارت بيقرا اللي وصل', run("cardOwedAt(D.accounts.find(a=>a.id==='card'),dayShift(today(),1))")===run("Math.round((42000-balances('me').card)*100)/100"));
  // ٤ تعديل تحويل العملة
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('cash');app.dset('amount','10');app.dset('toAmt','520');app.setFxOf('bought');app.saveEntry();");
  const id=run("D.txns.find(x=>x.to==='cash'&&x.toAmt).id");
  t('فرق قبل التعديل 20', run("D.txns.find(x=>x.id==='"+id+"').fxGain")===20);
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('٤ التعديل بيفتح نفس الشاشة باللي وصل', run("editOp?draft.toAmt:''")==='520');
  run("app.dset('toAmt','530');app.saveEntry();");
  t('٤ الفرق اتحسب تاني', run("D.txns.find(x=>x.id==='"+id+"').fxGain")===30&&run("D.txns.find(x=>x.id==='"+id+"').toAmt")===530);
  // ٨ الرسايل
  t('٨ حسابات العملة مش في الرسايل', typeof run("readSms.toString()")==='string'&&run("readSms.toString()").indexOf('!isFxAcc(a.id)')>-1);
  // ١٠
  run("app.go('wallet');app.editAccount('usd');document.getElementById('balin').value='500';app.setBalance('usd',balances('me').usd);");
  t('١٠ ظبط الرصيد مش بيغير سعر الفتح', run("D.accounts.find(a=>a.id==='usd').openRate")===50);
  // ١٣ نوع حساب العملة
  run("app.go('settings');app.toggleSet('accs');app.openAccCfg('usd');");
  t('١٣ حساب العملة مينفعش يبقى كارت ائتماني', V().indexOf("app.accCfgType('usd',v))('credit')")<0&&V().indexOf("cfgtypeusd')")>-1);
  // ١٣ السجل بالدولار
  run("app.go('log');app.setF('acct','usd');");
  t('١٣ إجمالي اليوم بالدولار', /دخل <span class="n">100<\/span>/.test(V()));
}
{ // ٥ المكتب: أقل من المبلغ من غير كارت
  const {run,V}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('cib');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','1000');app.oSet('paid','800');render();");
  t('٥ الفرق بيطلع من حساب بنك بس (واحد بس فاتختار لوحده)', V().indexOf('الفرق هيطلع من')>-1&&run('draftO.mineFrom')==='cib');
  const c0=run("balances('me').cib");run("app.oSave();");
  t('٥ الفرق اتخصم من نصيبك في البنك', run("balances('me').cib")===c0-200&&run('loanBalance()')===-200);
}
{ // ٧ تعديل قسط جمعية
  const {run,V}=boot(seed({gams:[{id:'g',name:'ج',role:'member',amount:500,months:4,start:'2026-09',turn:2,payMode:'day',day:1,col:{}}]}));
  run("app.gamStart('g','pay');gamAct.account='cash';app.gamDo();");const id=run("D.txns.find(x=>x.gam).id");
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('٧ تعديل القسط مفيهوش الكارت', V().indexOf("app.eTxnAcct('card')")<0);
}
{ // ١٢ ونوع الدخل
  const {run}=boot(seed({icats:[{id:'salary',label:'مرتب'},{id:'other_in',label:'دخل تاني'},{id:'tip',label:'تيب'}],txns:[{id:'x',book:'me',kind:'transfer',amount:1,account:'cash',to:'cib',date:'2026-09-20',fxGain:5,fxOf:'income',fxIcat:'tip'}]}));
  run("app.icatDel('tip')");t('١٢ مسح النوع بيرجع الفرق دخل تاني', run("D.txns[0].fxIcat")==='other_in');
}
{ // ١١ العدد في أصناف المكتب
  const {run}=boot(seed());
  run("app.go('scan');scan={stage:'review',items:[{name:'ورق A4',amount:100,cat:'other',qty:2,off:true},{name:'x',amount:10,cat:'other'}],merchant:'م',date:today(),account:'cash',oitem:'ورق',ocat:D.ocats[0].id};app.saveReceipt();");
  t('١١ العدد محفوظ في أصناف المكتب', run("JSON.stringify(D.txns.filter(x=>x.items).map(x=>x.items.map(i=>i.qty||1)))").indexOf('2')>-1);
}
{ // أسامي فيها '
  const {run,V}=boot(seed({gams:[{id:'g',name:'ج',role:'org',amount:500,months:4,start:'2026-09',turn:1,payMode:'day',day:1,members:[{name:"O'Neil",turn:2}],col:{}}]}));
  run("app.go('wallet');app.setWtab('gam');");const m=V().match(/app\.gamCol\('g','2026-09',(\d+)\)/);
  run("app.gamCol('g','2026-09',"+m[1]+")");t("١٣ اسم فيه ' في الجمعية", run("D.gams[0].col['2026-09'][0]")==="O'Neil");
}
{ // ١ الفرق لحساب موجود
  const {run,V}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('cib');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','500');app.oSet('paid','520');render();");
  t('١ الحفظ مقفول لحد ما تختار الحساب', run('oOk()')===false);
  run("app.oDiffTo('cash');");t('١ بعد الاختيار مفتوح', run('__yn(),oOk()')===true);
}
{ // ٤ جنيه لدولار من غير سعر
  const s=seed({fx:{on:true,curs:['USD'],rates:{},at:'',manual:{}}});s.accounts.push({id:'usd',name:'د',opening:0,scope:'me',atype:'cash',cur:'USD'});
  const {run,V}=boot(s);
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cash');app.setTo('usd');app.dset('amount','5000');app.dset('toAmt','100');");
  t('٤ جنيه لدولار شغال من غير سعر', run('__yn(),entryOk()')===true);
  run("app.saveEntry();app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('cash');app.dset('amount','10');app.dset('toAmt','520');app.setFxOf('bought');");
  t('٤ بعد الشرا التكلفة معروفة فالتحويل العكسي شغال', run('__yn(),entryOk()')===true);
  run("app.saveEntry();");t('٤ الفرق 20', run("D.txns.find(x=>x.fxOf==='bought').fxGain")===20);
}
{ // ٢ مسح حساب الجمعية
  const {run}=boot(seed({gams:[{id:'g',name:'ج',role:'member',amount:500,months:4,start:'2026-09',turn:2,payMode:'day',day:1,account:'cash',col:{}}]}));
  run("app.delAccount('cash')");t('٢ مينفعش تمسح حساب الجمعية', run("D.accounts.some(a=>a.id==='cash')")===true);
}
{ // المراجعة الأخيرة: تعديل الحركات المربوطة
  const {run,V}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('card');app.oSet('item','نت');app.oCat(D.ocats[0].id);app.oSet('amount','1000');app.oCardFrom('cib');app.oSet('paid','800');app.oSave();");
  const b0=run("JSON.stringify([balances('me'),balances('office'),loanBalance()])");
  const id=run("D.txns.find(x=>x.book==='office'&&x.kind==='expense').id");
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('التعديل بيفتح شاشة المكتب بنفس الخانات', run("editOp?draftO.paid+'|'+draftO.amount:''")==='800|1000');
  run("app.oSet('date','2026-09-24');app.oSave();");
  t('تعديل التاريخ مابوظش الأرصدة', run("JSON.stringify([balances('me'),balances('office'),loanBalance()])")===b0&&run("D.txns.filter(x=>x.link).every(x=>x.date==='2026-09-24')"));
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');app.oSet('amount','1200');app.oSave();");
  t('تعديل المبلغ بيتعمل في كل الحركات والعهدة', run("D.txns.find(x=>x.book==='office'&&x.kind==='expense').amount")===1200&&run('loanBalance()')!==JSON.parse(b0)[2]);
}
{ const {run}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('cib');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','500');app.oToMe(true);app.oTo('cash');app.oSave();");
  const id=run("D.txns.find(x=>x.book==='office'&&x.kind==='expense').id");
  run("app.setBook('office');app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');app.oSet('amount','600');app.oSave();");
  t('حركات مربوطة بنفس المبلغ بتتعدل مع بعض', run("D.txns.filter(x=>x.link).every(x=>x.amount===600)"));
}
{ const {run}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('cib');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','500');app.oSet('paid','520');app.oSave();");
  const c1=run("balances('me').cib");const id=run("D.txns.find(x=>x.book==='office'&&x.kind==='expense').id");
  run("app.delTxn({stopPropagation(){}},'"+id+"');");
  t('باقي التقريب دخل البنك واتمسح مع المصروف', run("balances('me').cib")===c1-20);
  t('«للمكتب» مش «لـالمكتب»', run("toBook()")==='للمكتب');
}
done();
