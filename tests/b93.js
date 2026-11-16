// الأقساط: مصروف قسط الكارت والقسط حاجة واحدة، «عدّل» بالخانات اللي ليها معنى، المكان، «قسّطها»
const {boot,seed,t,done,r2}=require('./harness');
const E='{stopPropagation(){}}';
const NOW=Date.UTC(2026,10,16,9);
const add=(run,o)=>{run("app.go('wallet');wtab='ins';showIns=true;insDraft={name:'',total:'',monthly:'',months:'',paid:'0',day:'1',account:'',src:''};render();");
  run("app.insSrc('card');app.insBuyDate('"+o.d+"');app.insSet('name','"+o.nm+"');app.insCat('electronics');app.insSet('place','"+(o.pl||'')+"');app.insSet('total','"+o.P+"');app.insSet('months','"+o.n+"');app.insSet('monthly','"+o.m+"');app.addIns();");
  return run("D.installments[D.installments.length-1].id");};
const ins=(run,id)=>JSON.parse(run("JSON.stringify(D.installments.find(x=>x.id==='"+id+"'))"));
const buy=(run,id)=>JSON.parse(run("JSON.stringify(D.txns.find(x=>x.insBuy==='"+id+"'))"));
{ // المكان في «ضيف قسط»
  const {run,V}=boot(seed(),NOW);
  run("app.go('wallet');wtab='ins';showIns=true;render();app.insSrc('card');");
  t('خانة المكان موجودة لقسط الكارت', V().indexOf("app.insSet('place'")>-1);
  const id=add(run,{d:'2026-11-10',nm:'موبايل',pl:'بي تك',P:12000,n:12,m:1100});
  t('المكان اتسجل على المصروف', buy(run,id).place==='بي تك');
}
{ // «عدّل» لقسط الكارت
  const {run,V,B}=boot(seed(),NOW);
  const id=add(run,{d:'2026-11-10',nm:'موبايل',P:12000,n:12,m:1100});
  run("app.startInsEdit('"+id+"');");const v=V();
  t('الخانات اللي ليها معنى بس', v.indexOf("iDraftSet('place'")>-1&&v.indexOf("app.iDraftDate")>-1&&v.indexOf("iDraftSet('total'")>-1&&v.indexOf("iDraftSet('months'")<0&&v.indexOf("iDraftSet('day'")<0&&v.indexOf("iDraftSet('monthly'")<0);
  run("app.iDraftSet('name','موبايل سامسونج');app.iDraftSet('place','راية');app.iDraftSet('total','6000');app.iDraftDate('2026-11-12');app.saveInsEdit('"+id+"');");
  const i=ins(run,id),b=buy(run,id);
  t('الاسم والمكان اتغيروا في المصروف', b.note==='موبايل سامسونج'&&i.name==='موبايل سامسونج'&&b.place==='راية');
  t('المبلغ والتاريخ اتغيروا في الاتنين', b.amount===6000&&i.principal===6000&&b.date==='2026-11-12'&&i.buyDate==='2026-11-12');
  t('القسط الشهري بنفس النسبة', i.monthly===550, i.monthly);
  t('الرصيد اتحسب بالمبلغ الجديد', B('me','card')===42000-6000);
  // من السجل
  const bid=b.id;
  run("app.go('log');app.toggleTxn('"+bid+"');app.startTxnEdit("+E+",'"+bid+"');");
  t('السجل: مفيش اختيار حساب، وفيه تنبيه إنه قسط', V().indexOf('app.eTxnAcct')<0&&V().indexOf('ده مصروف قسط')>-1);
  run("app.eTxnSet('note','تابلت');app.eTxnSet('amount','9000');app.eTxnDate('2026-11-05');app.saveTxnEdit('"+bid+"');");
  const i2=ins(run,id);
  t('تعديل السجل بيمشي في القسط', i2.name==='تابلت'&&i2.principal===9000&&i2.buyDate==='2026-11-05'&&i2.monthly===825, JSON.stringify([i2.name,i2.principal,i2.buyDate,i2.monthly]));
  // تعديل من غير تغيير
  const pre=run("JSON.stringify(dKey(JSON.stringify(D)))");
  run("app.startInsEdit('"+id+"');app.saveInsEdit('"+id+"');");
  t('حفظ من غير تغيير: ولا حاجة اتغيرت', run("JSON.stringify(dKey(JSON.stringify(D)))")===pre);
}
{ // فايدة اتأكدت: المبلغ والتاريخ مقفولين
  const {run,V}=boot(seed(),NOW);
  const id=add(run,{d:'2026-07-01',nm:'تلاجة',P:20000,n:10,m:2200});
  run("cardInsAll();");
  const ii=run("D.txns.filter(x=>x.insInt&&x.insId==='"+id+"').length");
  t('الفايدة اتسجلت للشهور اللي فاتت', ii>0);
  run("const x=D.txns.find(x=>x.insInt&&x.insId==='"+id+"');delete x.pending;save();");
  run("app.startInsEdit('"+id+"');");t('شاشة عدّل: المبلغ والتاريخ مقفولين', V().indexOf("iDraftSet('total'")<0&&V().indexOf('مش بيتغيروا')>-1);
  const bid=buy(run,id).id, P0=buy(run,id).amount;
  run("app.go('log');app.toggleTxn('"+bid+"');app.startTxnEdit("+E+",'"+bid+"');app.eTxnSet('amount','100');app.saveTxnEdit('"+bid+"');");
  t('السجل: تغيير المبلغ اترفض', buy(run,id).amount===P0&&ins(run,id).principal===20000);
}
{ // «قسّطها»
  const tx=[{id:'b1',book:'me',kind:'expense',amount:3000,cat:'grocery',account:'card',date:'2026-11-03',merchant:'كارفور',
      items:[{name:'زيت',amount:1000,cat:'grocery'},{name:'مكنسة',amount:2000,cat:'home'}]},
    {id:'c1',book:'me',kind:'expense',amount:50,cat:'eatout',account:'cash',date:'2026-11-03'}];
  const {run,V,B}=boot(seed({txns:tx}),NOW);
  const b0=B('me','card');
  run("app.go('log');app.toggleTxn('c1');");t('مصروف كاش: مفيش «قسّطها»', V().indexOf("app.qOpen")<0);
  run("app.toggleTxn('b1');");t('فاتورة على الكارت: فيه «قسّطها»', V().indexOf("app.qOpen(event,'b1')")>-1);
  run("app.qOpen("+E+",'b1');");t('بيسأل الشهور والقسط والنسبة بس', V().indexOf("app.qSet('months'")>-1&&V().indexOf("app.qSet('monthly'")>-1&&V().indexOf("app.qSet('rate'")>-1&&V().indexOf('qsave" disabled')>-1);
  run("app.qSet('months','6');app.qSet('rate','0');");
  t('النسبة صفر: القسط بيتحسب', run("qDraft.monthly")==='500');
  run("app.qSave('b1');");
  const i=JSON.parse(run("JSON.stringify(D.installments[0])"));
  t('اتعمل قسط من الفاتورة', i&&i.principal===3000&&i.months===6&&i.monthly===500&&i.buyDate==='2026-11-03'&&i.name==='كارفور'&&i.src==='card');
  t('الفاتورة فاضلة بأصنافها ومربوطة', run("D.txns.find(x=>x.id==='b1').items.length")===2&&run("D.txns.find(x=>x.id==='b1').insBuy")===i.id);
  t('رصيد الكارت ماتغيرش', B('me','card')===b0);
  run("app.toggleTxn('b1');app.toggleTxn('b1');");t('مابيتقسطش مرتين', V().indexOf("app.qOpen(event,'b1')")<0);
  run("app.startInsEdit('"+i.id+"');");t('عدّل: المبلغ جاي من الأصناف', run("insBankEditForm(D.installments[0])").indexOf("iDraftSet('total'")<0);
  // مسح القسط: الفاتورة بتفضل مصروف عادي
  run("app.delIns('"+i.id+"');");
  t('مسح القسط: الفاتورة فاضلة ومش مربوطة', run("D.txns.find(x=>x.id==='b1').insBuy")===undefined&&B('me','card')===b0);
  run("app.undoLast();");t('التراجع بيرجّع القسط', run("D.installments.length")===1&&run("D.txns.find(x=>x.id==='b1').insBuy")===i.id);
}
done();
