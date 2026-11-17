// الدفعة: الهيدر، تقليب الدفترين، «إلغاء» في «إضافة»، سؤالين الفاتورة، «فلوس عليك» بالأسامي، «عدّل» البيعة، التصنيفات بترتيب الاستخدام
const {boot,seed,t,done}=require('./harness');
const fs=require('fs');
const NOW=Date.UTC(2026,10,17,9);
const html=fs.readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
t('الهيدر الصغير بيبدأ من نفس مكان الرئيسية', html.indexOf('body.mini header{padding-top:calc(36px + env(safe-area-inset-top));align-items:flex-start;}')>-1);
{ // تقليب الدفترين
  const {run}=boot(seed(),NOW);
  run("app.go('log');app.setBook('office');");t('السجل: بيفضل في السجل', run("tab")==='log'&&run("book")==='office');
  run("app.go('add');app.setBook('me');");t('إضافة: بتفضل في إضافة', run("tab")==='add');
  run("app.go('wallet');app.setWtab('subs');app.setBook('office');");t('تبويب مش موجود في المكتب: «الحسابات»', run("tab")==='wallet'&&run("wtab")==='accounts');
  run("app.setWtab('close');app.setBook('me');");t('«التقفيل» مش في فلوسي: «الحسابات»', run("wtab")==='accounts');
  run("app.setWtab('ins');app.setBook('me');");t('نفس الدفتر: التبويب زي ما هو', run("wtab")==='ins');
  run("app.go('settings');app.setBook('office');");t('الإعدادات زي ما هي', run("tab")==='settings');
}
{ // «إلغاء» في «إضافة»
  const {run,V}=boot(seed(),NOW);
  run("app.go('add');app.setKind('income');app.dset('amount','500');app.dset('note','x');render();");
  t('فيه «إلغاء» تحت «احفظ»', V().indexOf("app.clearEntry()")>V().indexOf('id="entrysave"'));
  run("app.clearEntry();");t('بيمسح ويسيبك في «إضافة» بنفس النوع', run("tab")==='add'&&run("draft.amount")===''&&run("draft.note")===''&&run("draft.kind")==='income');
  run("app.setBook('office');app.go('add');draftO.amount='70';render();");
  t('المكتب كمان', V().indexOf("app.clearEntry()")>-1);
  run("app.clearEntry();");t('بيمسح فورم المكتب', run("draftO.amount")==='');
}
{ // الفاتورة: جزء من العهدة والرسوم
  const S=seed({txns:[{id:'f0',book:'office',kind:'float',amount:1000,account:'ocash',date:'2026-11-01'}]});
  const {run,V,B}=boot(S,NOW);
  const rec=(acc)=>run("app.go('scan');scan={stage:'review',items:[{name:'زيت',amount:300,cat:'grocery'}],merchant:'محل',date:today(),account:'"+acc+"',err:'',voucherId:'',voucherAmt:'',oitem:'',ocat:'',disc:'',split:false,people:[{name:'',amount:''}]};render();");
  rec('cash');
  t('السؤالين ظاهرين ولازم يتجاوبوا', V().indexOf('فيه جزء من كاش العهدة؟')>-1&&V().indexOf('فيها عمولات ورسوم؟')>-1&&run("scanSaveOk()")===false);
  run("app.scanSplit(false);app.scanYn('fromFloat',true);app.scanVal('floatAmt','100');app.scanYn('hasFee',true);");
  t('الرسوم من غير رقم: الحفظ مقفول', run("scanSaveOk()")===false);
  run("app.scanVal('feeAmt','5');");t('بعد الرقم: مفتوح', run("scanSaveOk()")===true);
  const c0=B('me','cash');run("app['saveReceipt']();");
  const m=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.items&&x.book==='me'))"));
  t('العهدة: اتسجل عليك 100 والباقي من حسابك', run("D.floatLoans.some(l=>l.srcTxn==='"+m.id+"'&&l.amount===100)")&&B('me','cash')===c0-300+100-5);
  t('الرسوم: مصروف «عمولات ورسوم»', run("D.txns.some(x=>x.cat==='fees'&&x.amount===5&&x.account==='cash')"));
  // تعديل من غير تغيير
  const pre=run("JSON.stringify(dCmp(JSON.stringify(D)))");
  run("app.go('log');app.toggleTxn('"+m.id+"');app.startTxnEdit({stopPropagation(){}},'"+m.id+"');app['saveReceipt']();");
  t('تعديل الفاتورة من غير تغيير: الأرقام زي ما هي', B('me','cash')===c0-300+100-5&&run("D.floatLoans.length")===1);
  // فاتورة قديمة من غير السؤالين: «لأ» لوحدها
  const O=boot(seed({txns:[{id:'r',book:'me',kind:'expense',amount:90,cat:'grocery',account:'cash',date:'2026-11-10',merchant:'م',note:'م',items:[{name:'أ',amount:90,cat:'grocery'}]}]}),NOW);
  O.run("app.go('log');app.toggleTxn('r');app.startTxnEdit({stopPropagation(){}},'r');");
  t('فاتورة قديمة: السؤالين متجاوبين «لأ»', O.run("tab")!=='scan'||(O.run("scan.hasFee")===false&&O.run("scan.fromFloat")===false));
  // فاتورة المكتب: الرسوم عليك وتتحسب في رسوم المكتب
  const {run:r2}=boot(seed(),NOW);
  r2("app.setBook('office');app.go('scan');scan={stage:'review',items:[{name:'ورق',amount:50,cat:'other'}],merchant:'مكتبة',date:today(),account:'ocash',err:'',voucherId:'',voucherAmt:'',item:'ورق',ocat:'c1',disc:'',split:false,people:[{name:'',amount:''}]};render();");
  r2("app.scanYn('hasFee',true);app.scanVal('feeAmt','3');app['saveReceipt']();");
  t('فاتورة المكتب: الرسوم في «رسوم المكتب»', r2("D.ofees.some(f=>f.amount===3)")&&r2("D.txns.some(x=>x.cat==='fees'&&x.amount===3&&x.book==='me')"));
}
{ // «فلوس عليك» بالأسامي
  const S=seed({txns:[{id:'d1',book:'me',kind:'settle',dir:'in',amount:200,account:'cash',date:'2026-11-01',debt:true,from:'علي'},
    {id:'d2',book:'me',kind:'settle',dir:'in',amount:70,account:'cash',date:'2026-11-02',debt:true,from:'منى'}]});
  const {run,V}=boot(S,NOW);run("app.go('home');app.spendToggle();");
  t('كل واحد باسمه', V().indexOf('فلوس عليك لعلي')>-1&&V().indexOf('فلوس عليك لمنى')>-1&&V().indexOf('فلوس عليك لناس')<0);
}
{ // «عدّل» البيعة
  const {run,V}=boot(seed(),NOW);
  run("D.sales=[{id:'s1',what:'لابتوب',who:'كريم',amount:15000,date:'2026-11-01'}];app.go('home');");
  t('«عدّل» جنب البيعة', V().indexOf("app.saleEditGo('s1')")>-1);
  run("app.startOwedGet('g_كريم');app.setOwedAcct('cash');app.setOwedGot('5000',0);app.confirmOwedGet('g_كريم');");
  run("app.saleEditGo('s1');app.saleEdSet('amount','4000');");t('مايقلّش عن اللي استلمته', run("saleEdOk()")===false);
  const pre=run("JSON.stringify(dKey(JSON.stringify(D)))");
  run("app.saleEdSet('amount','15000');app.saleEdSave();");t('حفظ من غير تغيير: ولا حاجة', run("JSON.stringify(dKey(JSON.stringify(D)))")===pre);
  run("app.saleEditGo('s1');app.saleEdSet('what','لابتوب ديل');app.saleEdSet('who','كريم سعيد');app.saleEdSet('amount','16000');app.saleEdSave();");
  t('اتعدلت والدفعة مشيت معاها', run("JSON.stringify(D.sales[0])").indexOf('"amount":16000')>-1&&run("saleLeft(D.sales[0])")===11000
    &&run("D.txns.find(x=>x.saleOf==='s1').from")==='كريم سعيد'&&run("D.txns.find(x=>x.saleOf==='s1').note")==='بيع — لابتوب ديل');
}
{ // التصنيفات بترتيب الاستخدام في الأقساط والتعديل
  const tx=[];for(let i=0;i<4;i++)tx.push({id:'a'+i,book:'me',kind:'expense',amount:10,cat:'eatout',account:'cash',date:'2026-11-01'});
  ['fuel','grocery'].forEach((c,i)=>tx.push({id:'c'+i,book:'me',kind:'expense',amount:10,cat:c,account:'cash',date:'2026-11-02'}));
  const {run,V}=boot(seed({txns:tx}),NOW);
  run("app.go('wallet');wtab='ins';showIns=true;render();app.insSrc('card');");
  t('«ضيف قسط»: الأكتر استخدامًا و«كل التصنيفات»', V().indexOf("app.insCat")>-1&&V().indexOf('كل التصنيفات')>-1&&V().indexOf("('bills')")<0);
  run("app.catAllOpen('inscat');");t('«كل التصنيفات» بتفتح الباقي', V().indexOf("('bills')")>-1);
  run("app.go('log');app.toggleTxn('a0');app.startTxnEdit({stopPropagation(){}},'a0');");
  t('تعديل حركة في السجل كمان', V().indexOf('كل التصنيفات')>-1);
}
done();
