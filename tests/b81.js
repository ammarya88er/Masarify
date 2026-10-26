// الدفعة ٤ (٢): تصنيف بند المكتب من آخر مرة، حسابات العهدة، أسئلة أيوه/لأ فاضية، السجل على أجزاء، إلغاء التعديل
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,26,9);
const oe=(id,item,ocat,note,o)=>Object.assign({id,book:'office',kind:'expense',amount:100,account:'ocash',date:'2026-10-20',item,ocat,note:note||item},o||{});

{ // ٤ تصنيف البند في دفتر المكتب من آخر مرة
  const S=seed({txns:[oe('a','بن','c2'),oe('b','فاتورة','c2','شركة أ'),oe('c','فاتورة','c1','شركة ب'),oe('d','فاتورة','c1','شركة ب',{date:'2026-10-21'})]});
  const {run,V}=boot(S,NOW);
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oSet('item','بن');");
  t('بند اتسجل بتصنيف واحد: بيتختار لوحده', run("draftO.ocat")==='c2'&&run("draftO.ocatAuto")===true);
  run("render();");t('ومكتوب إنه اتختار من آخر مرة', V().indexOf('اتختار من آخر مرة سجلت البند ده')>-1);
  run("app.oSet('item','فاتورة');");
  t('بند بأكتر من تصنيف ومن غير ملاحظة: مايختارش', run("draftO.ocat")==='');
  run("app.oSet('onote','شركة ب');");
  t('بالملاحظة (اسم الشركة): ياخد تصنيفها', run("draftO.ocat")==='c1');
  run("app.oSet('onote','شركة جديدة');");
  t('ملاحظة جديدة: مايختارش', run("draftO.ocat")==='');
  run("app.oCat('c2');app.oSet('item','بن');app.oSet('onote','شركة ب');");
  t('اخترت بنفسك: مايتغيرش', run("draftO.ocat")==='c2');
  // التعديل من غير تغيير مايغيرش التصنيف
  const r=boot(S,NOW);
  r.run("app.setBook('office');app.go('add');app.oKind('expense');app.oSet('item','بن');app.oSet('amount','50');app.oAccount('ocash');app.oSave();");
  const op=r.run("D.txns.find(x=>x.amount===50).op");
  t('اتحفظ بالتصنيف', r.run("D.txns.find(x=>x.amount===50).ocat")==='c2'&&r.run("D.ops['"+op+"'].d.ocatAuto")===undefined&&r.run("D.ops['"+op+"'].d.ocatPicked")===undefined);
  // فاتورة في دفتر المكتب
  const f=boot(S,NOW);
  f.run("app.setBook('office');app.manualBill();app.scanItem('فاتورة');app.scanMerchant('شركة أ');");
  t('فاتورة المكتب: التصنيف من اسم المحل', f.run("scan.ocat")==='c2');
}
{ // ٥ استلام عهدة: حسابات المكتب بس
  const {run,V}=boot(seed(),NOW);
  run("app.setBook('office');app.go('add');app.oKind('float');");
  const v=V();
  t('استلام عهدة: كاش المكتب ونصيبه في CIB', v.indexOf('كاش العهدة')>-1&&v.indexOf('نصيب المكتب في حساب CIB')>-1);
  t('ومن غير الكاش بتاعي', !/app\.oAccount\('cash'\)/.test(v));
  run("app.oKind('xfer');app.oSwap(false);");
  t('التحويل: من غير حساباتي الشخصية', !/app\.oAccount\('cash'\)/.test(V())&&!/app\.oTo\('cash'\)/.test(V()));
  run("app.go('scan');app.manualBill();");
  t('فاتورة المكتب: حسابات المكتب مش حساباتي', /app\.scanAccount\('ocash'\)/.test(V())&&!/app\.scanAccount\('cash'\)/.test(V()));
}
{ // ٩ أسئلة أيوه/لأ بتبدأ فاضية في الكارت والشهادة
  const {run,V}=boot(seed(),NOW);
  t('الكارت الجديد: الضمان والتأمين والدمغة فاضيين', run("accDraft.sec===undefined&&accDraft.insure===undefined&&accDraft.stamp===undefined"));
  t('الشهادة: «اتخصم من الحساب؟» فاضي', run("certDraft.ded")===undefined&&run("certOk()")===false);
  run("certDraft={amount:'5000',monthly:'80',day:'',start:'2026-08-01',end:'',account:'cib',bank:'cib',fee:'',type:'cert'};app.addCert();");
  t('مايتحفظش قبل ما تجاوب', run("(D.certs||[]).length")===0);
  run("app.certDed(true);app.addCert();");
  t('بعد ما جاوبت اتحفظ', run("D.certs.length")===1);
}
{ // ٩ السجل على أجزاء
  const tx=[];for(let i=0;i<200;i++)tx.push({id:'x'+i,book:'me',kind:'expense',amount:10,cat:'eatout',account:'cash',date:'2026-'+(i<100?'10':'09')+'-'+String(1+i%28).padStart(2,'0')});
  const {run,V}=boot(seed({txns:tx}),NOW);
  run("sortTxns();app.go('log');");
  const rows=()=>(V().match(/id="tx-/g)||[]).length;
  t('أول مرة: جزء بس', rows()<200&&rows()>=80, rows());
  t('والمجموع للكل', V().indexOf('200 حركة')>-1);
  t('فيه «ورّي أقدم»', V().indexOf('ورّي أقدم')>-1);
  run("app.logMore();");t('ورّي أقدم: زاد', rows()>=160);
  run("app.logMore();app.logMore();");t('لحد ما خلص: الزرار راح', rows()===200&&V().indexOf('ورّي أقدم')<0);
  run("app.setF('month','');");t('تغيير الفلتر يرجّعه لأول جزء', rows()<200);
  run("openTxn='x199';render();");t('الحركة المفتوحة بتفضل مرسومة', V().indexOf('id="tx-x199"')>-1);
}
{ // ٩ الفاتورة: × بيتراجع
  const {run,V}=boot(seed(),NOW);
  run("app.go('scan');app.manualBill();scan.items=[{name:'أ',amount:5,cat:'eatout'},{name:'ب',amount:6,cat:'eatout'}];app.delItem(0);");
  t('اتشال وفيه «رجّعه»', run("scan.items.length")===1&&V().indexOf('رجّعه')>-1);
  run("app.undoDelItem();");t('رجع مكانه', run("scan.items.map(i=>i.name).join()")==='أ,ب');
  run("app.delItem(1);app.cancelScan();app.manualBill();");t('فاتورة جديدة: مفيش «رجّعه» قديم', V().indexOf('رجّعه')<0);
}
{ // ٩ إلغاء التعديل بيرجع لنفس المكان
  const S=seed({txns:[{id:'a',book:'me',kind:'expense',amount:10,cat:'eatout',account:'cash',date:'2026-10-20',op:'o1'}],
    ops:{o1:{f:'entry',b:'me',v:2,d:{amount:'10',cat:'eatout',account:'cash',date:'2026-10-20',owed:false,hasFee:false,hasDisc:false}}}});
  const {run}=boot(S,NOW);
  run("var __y=0;window.scrollTo=(x,y)=>{__y=y;};window.scrollY=0;Object.defineProperty(window,'scrollY',{get(){return __y;},configurable:true});");
  run("app.go('log');__y=900;openOp('o1');");
  t('فتح التعديل', run("tab")==='add');
  run("app.cancelEditOp();");
  t('الإلغاء رجعني للسجل في نفس المكان', run("tab")==='log'&&run("__y")===900, run("__y"));
  run("__y=700;openOp('o1');__yn();app.saveEntry();");
  t('الحفظ من غير تغيير كمان', run("tab")==='log'&&run("__y")===700, run("__y"));
}
done();
