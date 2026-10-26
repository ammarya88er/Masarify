const {boot,seed,t,done}=require('./harness');
const snap=(run,B)=>({cash:B('me','cash'),cib:B('me','cib'),card:B('me','card'),ocib:B('office','cib'),ocash:B('office','ocash'),loan:run('loanBalance()'),
  spent:run("Math.round(D.txns.filter(x=>(x.book||'me')==='me'&&x.kind==='expense').reduce((a,x)=>a+x.amount,0)*100)/100")});
function oexp(run,acc,extra){run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('"+acc+"');app.oSet('item','ورق طباعة');app.oCat(D.ocats[0].id);app.oSet('amount','500');"+(extra||'')+"render();");}
{ // ١. من نصيب المكتب في CIB
  const {run,B,V}=boot(seed());const a=snap(run,B);
  oexp(run,'card');let v=V();
  t('بالكارت: سؤال خدت الفلوس من فين ظاهر', v.indexOf('خدت الفلوس من فين')>-1 && v.indexOf('نصيب المكتب في حساب CIB')>-1 && v.indexOf('لسه، هاخدها بعدين')>-1);
  t('بالكارت: الحاجات اللي مالهاش معنى مستخبية', v.indexOf('المبلغ ده جالي أنا')<0 && v.indexOf('فيه جزء من فلوسك')<0);
  t('الحفظ مقفول لحد ما تختار', /id="osave" disabled/.test(v));
  run("app.oCardFrom('cib');app.oSave();");const b=snap(run,B);
  t('CIB: الكارت عليه 500', b.card===a.card-500);
  t('CIB: نصيبك زاد 500 ونصيب المكتب قل 500', b.cib===a.cib+500 && b.ocib===a.ocib-500);
  t('CIB: مش محسوب مصروف عليك', b.spent===a.spent);
  t('CIB: المصروف في دفتر المكتب', run("D.txns.some(x=>x.book==='office'&&x.kind==='expense'&&x.item==='ورق طباعة'&&x.account==='cib')"));
  t('CIB: البنك في الحقيقة ماتغيرش (مجموع النصيبين)', b.cib+b.ocib===a.cib+a.ocib);
  const id=run("D.txns.find(x=>x.book==='office'&&x.item==='ورق طباعة').id");run("app.delTxn({stopPropagation(){}},'"+id+"');");
  const c=snap(run,B);t('المسح بيشيل كل الحركات المربوطة', JSON.stringify(c)===JSON.stringify(a));
}
{ // ٢. من كاش العهدة
  const {run,B}=boot(seed());const a=snap(run,B);
  oexp(run,'card',"app.oCardFrom('ocash');app.oCardTo('cash');");run("app.oSave();");const b=snap(run,B);
  t('كاش العهدة: الكارت +500، كاشك +500، كاش العهدة −500', b.card===a.card-500&&b.cash===a.cash+500&&b.ocash===a.ocash-500&&b.spent===a.spent);
}
{ // ٣. لسه هاخدها بعدين، وبعدين سوّها
  const {run,B,doc}=boot(seed());const a=snap(run,B);
  oexp(run,'card',"app.oCardFrom('later');");run("app.oSave();");const b=snap(run,B);
  t('بعدين: الكارت +500 والعهدة عليها ليك 500', b.card===a.card-500&&b.loan===-500&&b.cash===a.cash&&b.spent===a.spent&&b.ocash===a.ocash);
  run("app.setBook('me');app.go('home');alertsOpen=true;app.goLoans();app.flPaySet_bfrom('ocash');app.flPaySet_bto('cash');");
  doc.getElementById('loanin').value='500';run("app.settleLoan();");const c=snap(run,B);
  t('سوّها: كاش العهدة −500 وكاشك +500 والدين خلص', c.ocash===a.ocash-500&&c.cash===a.cash+500&&c.loan===0);
}
{ // ٤. باقي تقريب بالكارت
  const {run,B}=boot(seed());const a=snap(run,B);
  oexp(run,'card',"app.oCardFrom('cib');app.oSet('paid','510');");run("app.oSave();");const b=snap(run,B);
  t('تقريب: الكارت 500، المكتب مسجل 510، و10 دخل ليك', b.card===a.card-500&&b.ocib===a.ocib-510&&b.cib===a.cib+510&&run("D.txns.some(x=>x.kind==='income'&&x.amount===10)"));
}
{ // ٥. فيه جزء من فلوسك
  const {run,B,V}=boot(seed());const a=snap(run,B);
  oexp(run,'ocash',"app.oMine(true);app.oSet('mineAmt','200');");
  t('جزء من فلوسك: الحفظ مقفول لحد ما تختار الحساب', /id="osave" disabled/.test(V()));
  run("app.oMineFrom('cash');app.oSave();");const b=snap(run,B);
  t('جزء من فلوسك: كاشك −200، والعهدة عليها ليك 200، وكاش العهدة −300', b.cash===a.cash-200&&b.loan===-200&&b.ocash===a.ocash-300&&b.spent===a.spent);
}
{ // التقفيل بيحسب اللي رجعلك
  const {run,B,doc,V}=boot(seed());
  const r0=run("JSON.stringify(officeReport(periodFrom(),today()))");
  oexp(run,'card',"app.oCardFrom('later');");run("app.oSave();");
  run("app.setBook('me');app.go('home');alertsOpen=true;app.goLoans();app.flPaySet_bfrom('ocash');app.flPaySet_bto('cash');");
  doc.getElementById('loanin').value='500';run("app.settleLoan();");
  const r=JSON.parse(run("JSON.stringify(officeReport(periodFrom(),today()))")),o=JSON.parse(r0);
  t('التقفيل: الباقي معاك بيقل بس بالمصروف (500)', Math.round((o.result-r.result)*100)/100===500, o.result+' → '+r.result);
  t('التقفيل: رصيد العهدة زي كاش العهدة الحقيقي', r.result===B('office','ocash')+B('office','cib'));
  run("app.setBook('office');app.go('wallet');app.setWtab('close');");t('شاشة التقفيل فيها «رجعلك من فلوسك»', V().indexOf('رجعلك من فلوسك')>-1);
}
done();
