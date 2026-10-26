const {boot,seed,t,done}=require('./harness');
const pos=(v,s)=>v.indexOf(s);
{ // ٥٣ التاريخ قبل المبلغ في الدفترين
  const {run,V}=boot(seed());
  run("app.setBook('me');app.go('add');draft.kind='expense';render();");let v=V();
  t('٥٣ دفتري: التاريخ بعد الملاحظة وقبل المبلغ', pos(v,'ملاحظة (اختياري)')<pos(v,'app.setDate')&&pos(v,'app.setDate')<pos(v,'class="money"'));
  t('٥٣ دفتري: التاريخ بعد التصنيف مش قبله', pos(v,"pickRow")<0 && pos(v,'app.setCat')<pos(v,'app.setDate'));
  run("app.setBook('office');app.go('add');draftO.kind='expense';render();");v=V();
  t('٥٣ الشغل: التاريخ قبل المبلغ', pos(v,'app.oDate')<pos(v,'class="money"') && pos(v,'app.oDate')>pos(v,'فيه جزء من فلوسك'));
}
{ // ٥٤ ترتيب التبديل
  const {run,V}=boot(seed());
  run("app.setBook('me');app.go('add');draft.kind='transfer';app.setPSwap(true);");let v=V();
  t('٥٤ دفتري: العهدة الأول', pos(v,'حساب العهدة')<pos(v,'حسابي <b>'));
  run("app.setBook('office');app.go('add');app.oKind('xfer');app.oSwap(true);");v=V();
  t('٥٤ الشغل: العهدة الأول', pos(v,'حساب العهدة')<pos(v,'حسابي <b>'));
}
{ // ٥٥/٥٦/٥٧/٥٨
  const {run,V,els}=boot(seed());
  const src=require('fs').readFileSync(__dirname+'/s0.js','utf8');
  t('٥٥ مفيش «زوّد» في الواجهة', src.indexOf('زوّد')<0);
  t('٥٦ مفيش «تأكيد» ولا «هو الصح» ولا «الفاتورة صح»', src.indexOf('>تأكيد<')<0&&src.indexOf('هو الصح')<0&&src.indexOf('الفاتورة صح')<0);
  run("app.setBook('office');app.go('wallet');wtab='close';render();");let cv=V();
  t('٥٨ التقفيل فيه النهارده/إمبارح', cv.indexOf("app.setCloseTo('2026-09-24')")>-1);
  run("app.setBook('me');");
  // ٥٨ شهادة
  run("app.go('wallet');wtab='certs';showCert=true;render();");let v=V();
  t('٥٨ بداية الشهادة فيها النهارده/إمبارح', v.indexOf("app.certSet('start','2026-09-24')")>-1);
  run("app.certSet('start','2026-09-24');");t('٥٨ إمبارح اشتغلت', run("certDraft.start")==='2026-09-24');
  // ٥٨ الوعاء
  run("app.go('wallet');wtab='accounts';showAddAcc=true;render();app.accType('save');");v=V();
  t('٥٨ بداية الوعاء فيها أزرار', v.indexOf("app.svSet('new','saveStart','2026-09-24',1)")>-1, v.indexOf('saveStart'));
  run("app.svSet('new','saveStart','2026-09-24',1);");t('٥٨ الوعاء اتسجل', run("accDraft.saveStart")==='2026-09-24');
}
{ // ٥٨ المرتب في شاشة البداية
  const {run,V}=boot(null);
  run("wel.monthMode='sal';render();");const v=V();
  t('٥٨ المرتب فيه أزرار', v.indexOf("app.welSalary('salaryDate','2026-09-24')")>-1);
  run("app.welSalary('salaryDate','2026-09-24');");t('٥٨ المرتب اتسجل', run("wel.salaryDate")==='2026-09-24');
  const i1=v.indexOf('app.welOffice(false)'),i2=v.indexOf('app.welOffice(true)');
  t('٥٧ البداية: لأ الأول', i1>-1&&i1<i2);
}
done();
