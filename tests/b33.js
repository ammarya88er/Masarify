const {boot,seed,t,done}=require('./harness');
{ // ٨٤
  const {run,V}=boot(seed());
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('card');app.oSet('item','نت');app.oCat(D.ocats[0].id);app.oSet('amount','525');app.oCardFrom('cib');app.oSave();");
  t('مصروف المكتب بالكارت مش تحويل', run("isXferLike(D.txns.find(x=>x.book==='office'&&x.kind==='expense'))")===false);
  t('حركات دفترك لسه تحويل', run("D.txns.filter(x=>x.book==='me'&&x.ocard).every(isXferLike)")===true);
  run("app.go('log');");let v=V();
  t('أحمر بعلامة خصم في السجل', /−525/.test(v));
  run("app.setF('dir','out');");t('بيظهر في «خارج»', V().indexOf('نت')>-1);
  run("app.setF('dir','tr');");t('مش في «تحويلات»', V().indexOf('>نت<')<0);
  run("app.setF('dir','');");v=V();t('محسوب في «مصروف» في اليوم', /مصروف <span class="n">525<\/span>/.test(v));
}
{ // ٧٩
  const {run,V}=boot(seed({txns:[{id:'f',book:'office',kind:'float',amount:1000,account:'ocash',date:'2026-09-10'},{id:'e',book:'office',kind:'expense',amount:200,account:'ocash',date:'2026-09-11',item:'ورق',ocat:'c1'}],
    closings:[{id:'c',from:'2026-08-01',to:'2026-08-31',opening:0,floats:0,spent:0,result:0,settled:false,closedAt:'2026-09-01'}],lastClose:'2026-08-31'}));
  run("app.setBook('office');app.goClose();");const v=V();
  t('٧٩ زرار «ابعت التقرير كصورة» قبل الطباعة', v.indexOf('>ابعت كصورة<')>-1&&v.indexOf('>ابعت كصورة<')<v.indexOf('طبع أو احفظ PDF'));
  run("app.viewClose('c');");
  t('التقفيلات القديمة فيها «صورة» جنب «طبع»', V().indexOf("app.shareReport('2026-08-01','2026-08-31')")>-1&&V().indexOf("app.printOld('2026-08-01','2026-08-31')")>-1);
  run("app.shareReport()");t('من غير متصفح مش بيوقع', true);
}
{ // ٨٠
  const {run,V}=boot(seed({owed:[{id:'o1',amount:300,who:'أحمد',date:'2026-09-20',note:'أكل',got:false},{id:'o2',amount:100,who:'أحمد',date:'2026-09-21',note:'بنزين',got:false},{id:'o3',amount:50,who:'',date:'2026-09-21',note:'شاي',got:false}]}));
  let url='';run("window.open=(u)=>{globalThis._u=u;};");
  run("app.go('home');alertsOpen=true;owedOpen=true;render();");const v=V();
  t('زرار «فكّره» بعد «استلمت»', v.indexOf('فكّره')>v.indexOf('استلمت'));
  run("app.remindOwed('g_أحمد')");url=decodeURIComponent(run("_u").split('text=')[1]);
  t('الرسالة فيها الاسم والإجمالي والتفاصيل', url.indexOf('\u200Fأحمد، عليك 400 جنيه:')===0&&url.indexOf('— من برنامج مصاريفي')>-1&&url.indexOf('• أكل · 20 سبتمبر · 300')>-1&&url.indexOf('• بنزين · 21 سبتمبر · 100')>-1, url);
  run("app.remindOwed('g___none__')");url=decodeURIComponent(run("_u").split('text=')[1]);
  t('من غير اسم: «عليك» وحاجة واحدة', url.indexOf('\u200Fعليك 50 جنيه (شاي · 21 سبتمبر).')===0&&url.indexOf('— من برنامج مصاريفي')>-1, url);
}
{ // التقرير
  const {run,V}=boot(seed({txns:[{id:'f',book:'office',kind:'float',amount:500,account:'ocash',date:'2026-09-05'},{id:'e',book:'office',kind:'expense',amount:500,account:'ocash',date:'2026-09-06',item:'ورق',ocat:'c1'}]}));
  run("D.accounts.forEach(a=>a.openingOffice=0);app.setBook('office');app.goClose();");let v=V();
  t('أول الفترة = أول حركة في الدفتر', v.indexOf('5 سبتمبر 2026 ←')>-1&&v.indexOf('من البداية')<0);
  t('الصفر: «العهدة خلصت بالظبط» من غير رقم', v.indexOf('العهدة خلصت بالظبط')>-1&&v.indexOf('باقي معاك')<0);
  const ph=run("printHTML(officeReport(periodFrom(),today()))");
  t('الطباعة: نفس التاريخ وحالة الصفر', ph.indexOf('5 سبتمبر 2026 ←')>-1&&ph.indexOf('العهدة خلصت بالظبط')>-1);
  run("app.setBook('office');app.go('home');");t('الرئيسية في المكتب: «من 5 سبتمبر»', V().indexOf('من 5 سبتمبر 2026')>-1);
}
{ const {run,V}=boot(seed({txns:[{id:'f',book:'office',kind:'float',amount:500,account:'ocash',date:'2026-09-05'},{id:'e',book:'office',kind:'expense',amount:200,account:'ocash',date:'2026-09-06',item:'ورق',ocat:'c1'}]}));
  run("D.accounts.forEach(a=>a.openingOffice=0);app.setBook('office');app.goClose();");const v=V();
  t('النتيجة: الرقم قبل الكلام زي باقي التقرير', /<span class="n pos">300<\/span><span>باقي معاك<\/span>/.test(v)&&/kpi res"><span>باقي معاك<\/span><b class="n pos">300/.test(v));
}
{ const {run}=boot(seed({phone:'01099998888'}));const ph=run("printHTML(officeReport(periodFrom(),today()))");
  t('رقم التليفون اتشال من الطباعة', ph.indexOf(run('D.phone'))<0&&ph.indexOf('kpi bal')>-1&&ph.indexOf('h2 class="out"')>-1);}
done();
