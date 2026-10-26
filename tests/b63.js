// مراجعة الدفعة ٢: حالات التعديل والتراجع الصعبة
const {boot,seed,t,done}=require('./harness');
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date:'2026-09-20'},o||{});
const edit=(run,id,js)=>run(`app.startTxnEdit({stopPropagation(){}},'${id}');${js}`);
{ // تراجع عن تعديل وبعدين حفظ: مايتكررش
  const {run}=boot(seed({txns:[ex('e1',300)]}));
  edit(run,'e1',"app.dset('amount','350');app.saveEntry();");
  run("app.undoLast();");
  t('التراجع رجّعني للتعديل', run("editOp?1:0")===1&&run("draft.amount")==='350');
  run("app.saveEntry();");
  t('الحفظ تاني عدّل نفس الحركة', run("D.txns.length")===1&&run("D.txns[0].id")==='e1'&&run("D.txns[0].amount")===350);
}
{ // حاجات اتأكدت بعد التسجيل مابترجعش
  const {run}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('card');app.setCat('subs');app.setCur('USD');app.dset('amount','10');app.dset('note','x');app.saveEntry();");
  const id=run("D.txns[0].id");
  run("fixFor='"+id+"';document.getElementById('fixin').value='530';app.confirmFix('"+id+"');");
  edit(run,id,"app.dset('note','اشتراك');app.saveEntry();");
  const x=JSON.parse(run("JSON.stringify(D.txns.find(t=>t.id==='"+id+"'))"));
  t('المبلغ المتأكد بالجنيه فضل', x.amount===530&&!x.pending&&x.note==='اشتراك', JSON.stringify(x));
  run("app.go('add');app.setKind('expense');app.setAccount('card');app.setCat('other');app.dset('amount','200');app.setArr(true);app.dset('note','y');app.saveEntry();");
  const id2=run("D.txns.find(t=>t.note==='y').id");
  run("D.arrPend=[];save();");                               // اتأكدت أو اتلغت
  edit(run,id2,"app.dset('note','y2');app.saveEntry();");
  t('مصاريف التدبير مارجعتش', run("(D.arrPend||[]).length")===0);
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','300');app.setOwed(true);draft.owedPeople=[{name:'علي',amount:'100'},{name:'منى',amount:'50'}];app.dset('note','z');app.saveEntry();");
  const id3=run("D.txns.find(t=>t.note==='z').id");
  run("app.removeOwed(D.owed.find(o=>o.who==='منى').id);");
  edit(run,id3,"app.dset('note','z2');app.saveEntry();");
  t('الشخص اللي اتشال مارجعش', run("D.owed.map(o=>o.who).join()")==='علي');
}
{ // تصنيف «عمولات ورسوم» من وإلى: نفس الرقم والمرتجع لسه مربوط
  const {run}=boot(seed({txns:[ex('f1',5,{cat:'fees',refundDone:true}),ex('r1',-5,{cat:'fees',refundOf:'f1'})]}));
  edit(run,'f1',"app.setCat('other');app.saveEntry();");
  t('نفس الرقم وحالة المرتجع', run("D.txns.find(t=>t.id==='f1')&&D.txns.find(t=>t.id==='f1').refundDone")===true&&run("D.txns.find(t=>t.id==='f1').cat")==='other');
}
{ // تعديل مرفوض مايتحفظش ومايفضّيش الخانات
  const {run}=boot(seed({txns:[ex('e1',300)]}));
  edit(run,'e1',"app.setOwed(true);draft.owedPeople=[{name:'هاجر',amount:'100'}];app.saveEntry();");
  run("collectOwed([{src:'owed',ref:D.owed[0]}],40,'cash','هاجر');save();");
  edit(run,'e1',"draft.owedPeople=[{name:'هاجر',amount:'30'}];app.saveEntry();");
  const saved=JSON.parse(run("localStorage.getItem('masareef:v3')"));
  t('المحفوظ مااتغيرش', saved.owed[0].gotAmount===40&&saved.txns.some(x=>x.id==='e1'));
  t('الخانات فضلت زي ما كتبتها', run("draft.owedPeople[0].amount")==='30'&&run("editOp?1:0")===1);
  // تغيير اسمها بس مسموح
  run("draft.owedPeople=[{name:'هاجر أحمد',amount:'100'}];app.saveEntry();");
  t('تغيير الاسم بعد ما دفعت مسموح', run("D.owed[0].who")==='هاجر أحمد'&&run("D.owed[0].gotAmount")===40);
  // مسح العملية بيسيب نصيبها اللي اتدفع منه
  run("app.delTxn({stopPropagation(){}},'e1')");
  t('المسح ساب النصيب اللي اتدفع منه', run("D.owed.length")===1&&run("D.owed[0].gotAmount")===40);
}
{ // needsTxn قديم مايبوظش تعديل فاتورة تانية
  const {run}=boot(seed({txns:[ex('sms',100,{needs:true,fromSms:true,account:'cib'})]}));
  run("app.go('scan');app.manualBill();scan.items=[{name:'عصير',amount:50,cat:'drinks'}];app.scanAccount('cash');app.saveReceipt();");
  const rid=run("D.txns.find(t=>t.items).id");
  run("needsTxn='sms';app.go('log');");
  edit(run,rid,"app.saveReceipt();");
  t('الفاتورة فضلت والخصم مااتلمسش', run("!!D.txns.find(t=>t.id==='"+rid+"')")&&run("!D.txns.find(t=>t.id==='sms').items"));
}
done();
