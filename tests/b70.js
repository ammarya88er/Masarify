// دفعة المكتب: ملاحظات التقرير، رصيد مرحّل، سداد التقفيل، حسابات مصروف المكتب، التقفيلات القديمة، شريط التعديل
const {boot,seed,t,done,r2}=require('./harness');
const ex=(id,amt,date,item,note,o)=>Object.assign({id:id,book:'office',kind:'expense',amount:amt,account:'ocash',date:date,item:item,note:note||item,ocat:'c1'},o||{});
{ // ملاحظات تحت كل بند
  const {run,V,els}=boot(seed({txns:[ex('a',65,'2026-09-04','فطار'),ex('b',50,'2026-09-13','فطار'),ex('c',500,'2026-09-10','فاتورة','أجريماز'),
    ex('d',20,'2026-09-11','منظفات','مناديل'),ex('e',30,'2026-09-12','منظفات','ليفة'),ex('f',850,'2026-09-02','ورق')]}));
  run("app.setBook('office');app.goClose();");
  const v=V();
  t('بند مكرر من غير ملاحظات: تاريخ كل مرة ومبلغها', v.indexOf('4 سبتمبر 65 · 13 سبتمبر 50')>-1);
  t('بند واحد بملاحظة: الملاحظة تحته', v.indexOf('أجريماز</small>')>-1);
  t('بند مكرر بملاحظات: الملاحظة والمبلغ', v.indexOf('مناديل 20 · ليفة 30')>-1);
  t('بند من غير ملاحظة ومرة واحدة: مفيش سطر تحته', !/ورق<small/.test(v));
  run("app.printReport();");
  t('في الطباعة كمان', els['printarea'].innerHTML.indexOf('مناديل 20 · ليفة 30')>-1&&els['printarea'].innerHTML.indexOf('أجريماز')>-1);
  t('«رصيد مرحّل» بدل رصيد البداية', v.indexOf('رصيد مرحّل')>-1&&v.indexOf('رصيد البداية')<0&&v.indexOf('افتتاحي')<0);
}
{ // سدّدت الباقي: من CIB، والكاش يدخل كاشك ويطلع من نصيبك، والعمولة عليك
  const S=seed({txns:[ex('a',200,'2026-09-20','ورق')]});
  const {run,V,B}=boot(S);
  const me0={cash:B('me','cash'),cib:B('me','cib')};
  run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');");
  t('العمولة لسه ماتجاوبتش: الزرار مقفول', /id="closebtn" disabled/.test(V()));
  t('الشرح: نصيب المكتب في CIB هيتحول، والكاش يدخل كاشك', V().indexOf('هيتحول على طول')>-1&&V().indexOf('في كاش العهدة هتدخل كاش')>-1);
  run("app.setCloseFee(true);");
  t('أيوه من غير مبلغ: لسه مقفول', /id="closebtn" disabled/.test(V()));
  run("app.setCloseFeeAmt('5');render();app.closePeriod();");
  t('اتقفل', run("D.closings.length")===1);
  t('شريط التراجع: «قفلت الفترة»', run("lastUndo&&lastUndo.label")==='قفلت الفترة', run("lastUndo&&lastUndo.label"));
  t('أرصدة المكتب كلها صفر', B('office','ocash')===0&&B('office','cib')===0);
  t('كاشك زاد 2,800 (كاش المكتب)', r2(B('me','cash')-me0.cash)===2800);
  t('نصيبك في CIB نقص 2,800 + عمولة 5', r2(B('me','cib')-me0.cib)===-2805);
  const fee=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.cat==='fees'))"));
  t('العمولة مصروف في «عمولات ورسوم»', fee&&fee.amount===5&&fee.account==='cib'&&fee.kind==='expense');
  const c=JSON.parse(run("JSON.stringify(D.closings[0])"));
  t('التقفيل متسجل باللي اتحوّل', c.out===22800&&c.shared==='cib'&&c.fee===5);
  const moved=JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.closeSet&&x.kind==='settle'&&x.book==='me'))"));
  t('حركات فلوسك تحويل مش دخل', moved.length===2&&run("D.txns.filter(x=>x.closeSet&&x.kind==='settle'&&x.book==='me').every(isXferLike)"));
  run("app.delTxn({stopPropagation(){}},'"+moved[0].id+"')");
  t('حركة التقفيل ماتتمسحش لوحدها', run("D.txns.filter(x=>x.closeSet).length")===c.settleIds.length);
  run("app.undoClose();");
  t('التراجع بيرجّع كل حاجة', run("D.txns.length")===1&&B('me','cash')===me0.cash&&B('me','cib')===me0.cib&&B('office','ocash')===2800);
}
{ // استلمت الفرق: الفلوس بتدخل CIB
  const S=seed({txns:[ex('a',25000,'2026-09-20','ورق')]});
  const {run,V,B}=boot(S);
  const me0={cash:B('me','cash'),cib:B('me','cib')};
  run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');");
  t('مفيش سؤال عمولة في الاستلام', V().indexOf('فيه عمولة؟')<0&&V().indexOf('استلمت الفرق')>-1);
  run("app.closePeriod();");
  t('أرصدة المكتب صفر', B('office','ocash')===0&&B('office','cib')===0);
  t('فلوسك كلها زي ما هي (الفرق ليك اتسدد)', r2(B('me','cash')+B('me','cib')-me0.cash-me0.cib)===0);
  t('CIB الحقيقي (فلوسك + نصيب المكتب) زاد بالفرق 2,000', r2(B('me','cib')+B('office','cib')-me0.cib-20000)===2000, r2(B('me','cib')+B('office','cib')-me0.cib-20000));
  t('التقفيل: وصلك 2,000', run("D.closings[0].out")===-2000);
}
{ // التقفيلات القديمة بتتفتح على الشاشة
  const S=seed({txns:[ex('a',100,'2026-08-20','ورق','ورق A4')],lastClose:'2026-08-31',
    closings:[{id:'k1',from:'2000-01-01',to:'2026-08-31',opening:23000,floats:0,spent:100,result:22900,settled:false,closedAt:'2026-09-01',settleIds:[]}]});
  const {run,V}=boot(S);
  run("app.setBook('office');app.goClose();");
  t('مقفول في الأول', V().indexOf('ورق A4')<0);
  run("app.viewClose('k1');");
  t('بالدوسة تقريره بيظهر بملاحظاته', V().indexOf('ورق A4')>-1&&V().indexOf('إجمالي المنصرف')>-1);
  run("app.viewClose('k1');");
  t('دوسة تانية بتقفله', V().indexOf('ورق A4')<0);
}
{ // مصروف المكتب: حسابات المكتب والكارت بس، و«كلها» من فلوسك
  const {run,V,B}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');");
  const v=V();
  t('مفيش كاشك الشخصي في «اتدفعت من إيه؟»', v.indexOf("app.oAccount('cash')")<0);
  t('فيه كاش العهدة ونصيب المكتب في CIB والكارت', v.indexOf("app.oAccount('ocash')")>-1&&v.indexOf("app.oAccount('cib')")>-1&&v.indexOf("app.oAccount('card')")>-1&&v.indexOf('نصيب المكتب في حساب CIB')>-1);
  run("app.oMine(true);");
  t('«فيه جزء من فلوسك؟» فيها «كلها» و«جزء منها»', V().indexOf('>كلها<')>-1&&V().indexOf('>جزء منها<')>-1);
  run("app.oMineAll('all');app.oMineFrom('cash');app.oSet('item','ورق');app.oCat('c1');app.oSet('amount','300');app.oHasFee(false);app.oToMe(false);");
  t('من غير ما تختار حساب مكتب: الحفظ متاح', run("oOk()")===true);
  const c0=B('me','cash'),o0=B('office','ocash');
  run("app['oSave']();");
  t('المصروف اتسجل بـ300', run("D.txns.filter(x=>x.book==='office'&&x.kind==='expense').length")===1);
  t('اتخصم من كاشك 300، وكاش المكتب زي ما هو', r2(B('me','cash')-c0)===-300&&B('office','ocash')===o0);
  t('والمكتب عليه 300 ليك', run("D.floatLoans.length")===1&&run("D.floatLoans[0].amount")===300&&run("D.floatLoans[0].dir")==='back');
  run("app.go('add');app.oKind('expense');app.oMine(true);app.oMineAll('part');");
  t('«جزء منها» بيطلب المبلغ', V().indexOf('كام منها من فلوسك؟')>-1);
}
{ // شريط التعديل: «الدفترين» بس لو العملية فيها المكتب
  const {run,V}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','40');app.dset('note','شاي');app.saveEntry();");
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},D.txns[0].id);");
  t('مصروف ليك بس: «بتعدّل الحركة» من غير المكتب', V().indexOf('بتعدّل الحركة<')>-1&&V().indexOf('الدفترين')<0);
  run("app.cancelEditOp();");
  run("app.go('scan');app.manualBill();scan.items=[{name:'شاي',amount:20,cat:'other'},{name:'ورق',amount:100,cat:'other',off:true}];Object.assign(scan,{account:'cash',merchant:'محل',date:'2026-09-25',ocat:'c1',oitem:'ورق'});app.saveReceipt();");
  const id=run("D.txns.find(x=>x.book==='me'&&x.items).id");
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('فاتورة فيها المكتب: بتقول إن التعديل هيتطبق على جزء المكتب', V().indexOf('بتعدّل الفاتورة، والتعديل هيتطبق على جزء المكتب كمان')>-1);
}
{ // التعديل بعد كام يوم من غير تغيير: التاريخ مايتغيرش
  const r=boot(seed(),Date.UTC(2026,8,25,12));
  r.run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','40');app.dset('note','شاي');app.saveEntry();");
  const s=JSON.parse(r.run("localStorage.getItem('masareef:v3')"));
  const {run}=boot(s,Date.UTC(2026,8,28,12));
  run("app.startTxnEdit({stopPropagation(){}},D.txns[0].id);app.saveEntry();");
  t('لسه بتاريخ يومه', run("D.txns[0].date")==='2026-09-25');
  delete s.ops[Object.keys(s.ops)[0]].d.date;   /* عملية قديمة ماكانش التاريخ متحفظ فيها */
  const b=boot(s,Date.UTC(2026,8,28,12));
  b.run("app.startTxnEdit({stopPropagation(){}},D.txns[0].id);");
  t('العملية القديمة: التاريخ بييجي من الحركة', b.run("draft.date")==='2026-09-25');
}
{ // مراجعة: مسح دفتر المكتب بعد السداد مايمسحش فلوسك اللي اتحركت
  const {run,B}=boot(seed({txns:[ex('a',200,'2026-09-20','ورق')]}));
  run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');app.setCloseFee(true);app.setCloseFeeAmt('5');app.closePeriod();");
  const cash=B('me','cash'),cib=B('me','cib');
  run("app.wipeOffice();");
  t('اتمسح الدفتر وفلوسك زي ما هي', run("D.txns.filter(x=>x.book==='office').length")===0&&B('me','cash')===cash&&B('me','cib')===cib);
  t('وحركاتك مابقتش مقفولة', run("D.txns.some(x=>x.closeSet)")===false);
}
{ // مراجعة: مالكش حساب كاش: حساب تاني ليك، ولو مفيش خالص تحذير
  const S=seed({txns:[ex('a',200,'2026-09-20','ورق')]});S.accounts=S.accounts.filter(a=>a.id!=='cash');
  S.accounts.push({id:'w',name:'محفظة',opening:0,scope:'me',atype:'wallet'});
  S._vcash1=1;
  const {run,B}=boot(S);
  run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');app.setCloseFee(false);app.closePeriod();");
  t('كاش المكتب دخل المحفظة', run("D.closings.length")===1&&B('me','w')===2800);
  const S2=seed({txns:[ex('a',200,'2026-09-20','ورق')]});S2.accounts=S2.accounts.filter(a=>a.id!=='cash');S2._vcash1=1;
  const r=boot(S2);r.run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');");
  t('مفيش حساب ليك خالص: تحذير', r.V().indexOf('ضيف حساب كاش ليك الأول')>-1);
}
{ // مراجعة: الباقي صفر: مفيش سؤال عمولة؛ والرجوع لـ«الباقي ينتقل» بيصفّر الإجابة
  const S=seed({txns:[ex('a',23000,'2026-09-20','ورق',null,{account:'ocash'})]});
  S.accounts.find(a=>a.id==='ocash').openingOffice=3000;
  const {run,V}=boot(S);
  run("app.setBook('office');app.goClose();closeTo='2026-09-21';app.setCloseMode('settle');");
  t('مفيش «فيه عمولة؟» لما مفيش حاجة تتحول', V().indexOf('فيه عمولة؟')<0||run("officeReport(periodFrom(),closeTo).result")!==0);
  const r=boot(seed({txns:[ex('a',200,'2026-09-20','ورق')]}));
  r.run("app.setBook('office');app.goClose();app.setCloseMode('settle');app.setCloseFee(true);app.setCloseMode('carry');app.setCloseMode('settle');");
  t('السؤال رجع من غير اختيار', r.run("closeFee===undefined"));
}
{ // مراجعة: «كلها» + رسوم: الرسوم من حسابك
  const {run}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oMine(true);app.oMineAll('all');app.oMineFrom('cash');app.oSet('item','ورق');app.oCat('c1');app.oSet('amount','300');app.oHasFee(true);app.oSet('feeAmt','10');app.oToMe(false);app['oSave']();");
  t('الرسوم اتخصمت من كاشك مش من كاش المكتب', run("D.txns.find(x=>x.cat==='fees').account")==='cash');
}
done();
