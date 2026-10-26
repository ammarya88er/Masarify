const {boot,seed,t,done,r2}=require('./harness');
const msgOf=run=>decodeURIComponent(run("_u").split('text=')[1]);
{ // ١ السلفة من شاشة الدخل
  const {run,V,B}=boot(seed({}));
  run("app.go('add');");t('الزرار «دخل / سلفة»', V().indexOf('دخل / سلفة')>-1&&V().indexOf('دخل / مرتب')<0);
  run("app.setKind('income');render();");let v=V();
  t('اختيار دخل/سلفة قبل نوع الدخل', v.indexOf('ده إيه؟')>-1&&v.indexOf('ده إيه؟')<v.indexOf('نوع الدخل'));
  run("app.setLoan('loan');");v=V();
  t('السلفة: نوع الدخل بيختفي والاسم إجباري', v.indexOf('نوع الدخل')<0&&/مين؟ <b>\*<\/b>/.test(v));
  const c0=B('me','cash');
  run("app.shutRow('acct');app.setAccount('cash');app.dset('amount','500');");
  t('من غير اسم الحفظ مقفول', run('entryOk()')===false);
  run("app.dset('from','سامح');");t('بالاسم الحفظ مفتوح', run('entryOk()')===true);
  run("app.saveEntry();");
  t('الفلوس دخلت الكاش', B('me','cash')===r2(c0+500));
  const tx=JSON.parse(run("JSON.stringify(D.txns[0])"));
  t('اتسجلت سلفة مش دخل', tx.kind==='settle'&&tx.dir==='in'&&tx.debt&&tx.from==='سامح'&&tx.note==='سلفة'&&!tx.salary, JSON.stringify(tx));
  run("app.go('home');");t('مش محسوبة دخل في الشهر', run("monthStats().earned")===0);
  run("alertsOpen=true;debtOpen=true;render();");v=V();
  t('تنبيه «فلوس عليك» بالاسم والمبلغ', v.indexOf('فلوس عليك <bdi>لسامح</bdi>')>-1&&v.indexOf('سددت')>-1);
  // السداد جزء
  run("app.startDebtPay('d_سامح');");v=V();
  t('السداد: الكارت مش ظاهر', v.indexOf("app.setDebtAcct('card')")<0&&v.indexOf("app.setDebtAcct('cash')")>-1);
  run("app.setDebtAcct('cash');app.setDebtAmt('d_سامح','600');");t('أكتر من اللي عليك مقفول', run("debtOk(peopleLedger().find(g=>g.who==='سامح'))")===false);
  run("app.setDebtAmt('d_سامح','200');app.confirmDebtPay('d_سامح');");
  t('دفع ٢٠٠ والباقي ٣٠٠', run("peopleLedger().find(g=>g.who==='سامح').net")===-300&&B('me','cash')===r2(c0+300));
  t('السداد مش مصروف', run("monthStats().spent")===0);
  run("render();");v=V();t('فاضل من ٥٠٠', v.indexOf('فاضل من <span class="n">500</span>')>-1);
  run("app.startDebtPay('d_سامح');app.setDebtAcct('cash');app.confirmDebtPay('d_سامح');");
  t('السداد الكامل بيقفلها', !run("peopleLedger().some(g=>g.who==='سامح')")&&B('me','cash')===c0);
  // مسح السداد بيرجّعها
  run("const p=D.txns.find(t=>t.debtPay);app.delTxn({stopPropagation(){}},p.id);");
  t('مسح آخر سداد (٣٠٠) بيرجّعه عليك', run("peopleLedger().find(g=>g.who==='سامح').net")===-300);
}
{ // ٢ «حد دفعهالي»
  const {run,V,B}=boot(seed({}));
  const c0=B('me','cash');
  run("app.go('add');render();");let v=V();
  t('«حد دفعهالي» في آخر صف الحساب', v.indexOf("app.setAccount('__other__')")>v.indexOf("app.setAccount('cash')"));
  run("app.shutRow('acct');app.setAccount('__other__');");v=V();
  t('خانة «مين دفع؟» ومفيش «دي ليك عند حد؟» ولا العهدة', v.indexOf('مين دفع؟')>-1&&v.indexOf('دي ليك عند حد؟')<0&&v.indexOf('كاش العهدة')<0&&v.indexOf('فيها عمولات ورسوم؟')<0);
  run("app.setCat('food');app.dset('amount','120');app.dset('note','غدا');");
  t('من غير اسم مقفول', run('entryOk()')===false);
  run("app.dset('from','كريم');app.saveEntry();");
  t('رصيدك ماتغيرش', B('me','cash')===c0);
  t('اتحسبت في مصاريفك', run("monthStats().spent")===120);
  const L=run("peopleLedger().find(g=>g.who==='كريم')");
  t('عليك ١٢٠ لكريم', L&&L.net===-120, JSON.stringify(L));
  run("app.go('log');");v=V();t('السجل: «دفعها كريم» و«عليك لكريم»', v.indexOf('دفعها <bdi>كريم</bdi>')>-1&&v.indexOf('عليك <bdi>لكريم</bdi>')>-1);
  // تعديل الاسم
  const sid=run("D.txns.find(t=>t.debt).id");
  run("app.toggleTxn('"+sid+"');app.startTxnEdit({stopPropagation(){}},'"+sid+"');");
  t('التعديل بيفتح نفس الشاشة: حد دفعهالي', run("editOp?draft.account:''")==='__other__');
  run("app.dset('from','كريم علي');app.saveEntry();");
  t('الاسم اتغير في الحركتين', run("D.txns.filter(t=>t.paidBy==='كريم علي').length")===2&&run("!!peopleLedger().find(g=>g.who==='كريم علي')"));
  // مسح المصروف بيمسح الاتنين
  const eid=run("D.txns.find(t=>t.kind==='expense'&&t.paidBy).id");
  run("app.delTxn({stopPropagation(){}},'"+eid+"');");
  t('المسح شال الحركتين', run("D.txns.filter(t=>t.paidBy).length")===0&&run("peopleLedger().length")===0);
  run("app.go('add');app.shutRow('acct');app.setAccount('__other__');app.setKind('income');");
  t('التحويل لدخل بيشيل «حد دفعهالي»', run('draft.account')==='');
}
{ // ٣ الطرح
  const {run,V,B}=boot(seed({owed:[{id:'o1',amount:400,who:'أحمد',date:'2026-09-20',note:'أكل',got:false,cat:'food'}],
    txns:[{id:'l1',book:'me',kind:'settle',dir:'in',debt:true,from:'أحمد',amount:100,account:'cash',date:'2026-09-22',note:'سلفة'}]}));
  run("window.open=(u)=>{globalThis._u=u;};app.go('home');alertsOpen=true;owedOpen=true;debtOpen=true;render();");let v=V();
  t('سطر واحد بالصافي ٣٠٠ تحت «فلوس ليك»', v.indexOf('<bdi>أحمد</bdi> عليه')>-1&&v.indexOf('فلوس عليك')<0&&v.indexOf('<span class="n">300</span> جنيه')>-1);
  t('التفاصيل: ٤٠٠ و−١٠٠', v.indexOf('<bdi>أكل · 20 سبتمبر</bdi> · <span class="n">400')>-1&&v.indexOf('<bdi>سلفة · 22 سبتمبر</bdi> · <span class="n">−100')>-1);
  run("app.remindOwed('g_أحمد');");const m=msgOf(run);
  t('الرسالة بالصافي والسطرين', m.indexOf('أحمد، عليك 300 جنيه:')>-1&&m.indexOf('• أكل · 20 سبتمبر · 400')>-1&&m.indexOf('• سلفة · 22 سبتمبر · −100')>-1, m);
  const c0=B('me','cib');
  run("app.startOwedGet('g_أحمد');");t('المبلغ المقترح ٣٠٠', run('owedGot')==='300');
  run("app.setOwedAcct('cib');app.confirmOwedGet('g_أحمد');");
  t('استلم ٣٠٠ والكل اتقفل', B('me','cib')===r2(c0+300)&&run("peopleLedger().length")===0);
  t('الخصم مش من الحساب اللي استلمت عليه', run("D.txns.filter(t=>t.debtPay).every(t=>t.account!=='cib')"));
  t('مصروف الأكل نزل ٤٠٠ كله', run("D.txns.filter(t=>t.kind==='expense'&&t.cat==='food').reduce((a,t)=>a+t.amount,0)")===-400);
}
{ // ٤ الطرح والصافي عليك
  const {run,V,B}=boot(seed({owed:[{id:'o1',amount:100,who:'منى',date:'2026-09-20',note:'تاكسي',got:false,cat:'transport'}],
    txns:[{id:'l1',book:'me',kind:'settle',dir:'in',debt:true,from:'منى',amount:500,account:'cash',date:'2026-09-22',note:'سلفة'}]}));
  run("app.go('home');alertsOpen=true;owedOpen=true;debtOpen=true;render();");let v=V();
  t('تحت «فلوس عليك» بالصافي ٤٠٠', v.indexOf('فلوس عليك <bdi>لمنى</bdi>')>-1&&v.indexOf('</bdi> عليه')<0&&v.indexOf('<bdi>تاكسي · 20 سبتمبر</bdi> · <span class="n">−100')>-1);
  const c0=B('me','cash');
  run("app.startDebtPay('d_منى');");t('المقترح ٤٠٠', run('debtAmt')==='400');
  run("app.setDebtAcct('cash');app.confirmDebtPay('d_منى');");
  t('دفع ٤٠٠ والكل اتقفل', B('me','cash')===r2(c0-400)&&run("peopleLedger().length")===0);
}
{ // ٥ مفيش سلف: التنبيه زي الأول
  const {run,V}=boot(seed({owed:[{id:'o1',amount:50,who:'',date:'2026-09-21',note:'شاي',got:false}]}));
  run("app.go('home');alertsOpen=true;owedOpen=true;render();");const v=V();
  t('من غير اسم: «فلوس ليك» والسطر', v.indexOf('<bdi>شاي · 21 سبتمبر</bdi> · <span class="n">50')>-1&&v.indexOf('فلوس عليك')<0);
  run("app.startOwedGet('g___none__');app.setOwedAcct('cash');app.setOwedGot('0');app.confirmOwedGet('g___none__');");
  t('صفر = ماوصلكش حاجة: مفيش تحصيل', run("D.owed[0].got")===false&&run("D.txns.length")===0);
  run("app.setOwedGot('');app.confirmOwedGet('g___none__');");
  t('الخانة فاضية: مابيتسجلش', run("D.owed[0].got")===false);
  run("app.setOwedGot('50');app.confirmOwedGet('g___none__');");
  t('اتكتب المبلغ: اتقفلت', run("D.owed[0].got")===true);
}
done();
