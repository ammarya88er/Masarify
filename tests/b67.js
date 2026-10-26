// دفعة الشكل والوضوح: زرار التراجع، الأرقام، العدد، الكارت، الشهادات، التصنيفات، الاشتراكات
const {boot,seed,t,done}=require('./harness');
{ // زرار التراجع العايم
  const {run,els}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','75');app.dset('note','غدا');app.saveEntry();");
  const h=()=>els['undopill'].innerHTML;
  t('ظهر تحت باسم العملية', h().indexOf('سجّلت غدا')>-1&&h().indexOf('تراجع</button>')>-1&&h().indexOf('✕')>-1);
  run("app.go('log');");
  t('ظاهر في السجل كمان، ومفيش شريط فوق السجل', h().indexOf('سجّلت غدا')>-1&&run("document.getElementById('view').innerHTML").indexOf('آخر عملية')<0);
  run("app.undoAskOn();");
  t('الدوسة بتسأل الأول', h().indexOf('ترجّع «سجّلت غدا»؟')>-1&&run("D.txns.length")===1);
  run("app.undoNo();");
  t('«لأ» مابترجعش حاجة', run("D.txns.length")===1&&h().indexOf('تراجع</button>')>-1);
  run("app.undoHide();");
  t('✕ بيقفله والحركة زي ما هي', h()===''&&run("D.txns.length")===1&&run("lastUndo?1:0")===1);
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.setCat('other');app.dset('amount','10');app.dset('note','شاي');app.saveEntry();");
  t('عملية جديدة: يرجع يظهر باسمها', h().indexOf('سجّلت شاي')>-1);
  run("app.undoAskOn();app.undoLast();");
  t('«أيوه» رجّعت واختفى', run("D.txns.length")===1&&h()==='');
}
{ // الأرقام والعدد
  const {run}=boot(seed());
  t('الكسر برقمين', run("fmt(162.5)")==='162.50'&&run("fmt(1430.57)")==='1,430.57'&&run("fmt(42000)")==='42,000'&&run("fmt(0.1+0.2)")==='0.30');
  t('العدد صح', run("nItems(1)")==='صنف واحد'&&run("nItems(2)")==='صنفين'&&run("nItems(3)")==='3 أصناف'&&run("nItems(11)")==='11 صنف');
}
{ // «وصلك كام» لازم يتكتب فيها رقم
  const {run}=boot(seed({owed:[{id:'o1',amount:50,who:'علي',date:'2026-09-21',note:'شاي',got:false}]}));
  t('فاضية أو صفر: لأ، رقم: آه، صفر مع خصم: آه', !run("owedGotOk('',false)")&&!run("owedGotOk('0',false)")&&run("owedGotOk('50',false)")&&run("owedGotOk('0',true)"));
}
{ // الكارت: الرقم الكبير اللي عليك
  const {run,V}=boot(seed({txns:[{id:'e',book:'me',kind:'expense',amount:1000,cat:'other',account:'card',date:'2026-09-20'}]}));
  run("app.go('wallet');app.setWtab('accounts');");
  const v=V();
  t('«عليك 1,000» كبير و«متاح 41,000 من 42,000» صغير', /عليك <\/span>1,000<\/span>/.test(v)&&v.indexOf('متاح <span class="n">41,000</span> من <span class="n">42,000</span>')>-1);
  t('نصيب المكتب الصفر مش ظاهر', v.indexOf('عهدة')<0||v.indexOf('عهدة المكتب <span class="n">0</span>')<0);
  t('«ضيف حساب» زرار مقفول', v.indexOf("app.toggleAddAcc()")>-1&&v.indexOf('id="newacc"')<0);
  run("app.toggleAddAcc();");
  t('بيفتح الفورم', V().indexOf('id="newacc"')>-1);
  t('تبويبات المحفظة على سطرين و«الشهادات»', V().indexOf('class="mpills wrap"')>-1&&V().indexOf('>الشهادات<')>-1);
}
{ // الشهادات: العائد الجاي في سطر لوحده، والتعديل بنفس ترتيب الإضافة
  const c={id:'c1',name:'شهادة 1',amount:10000,monthly:162.5,start:'2026-08-10',account:'cib',bank:'cib',end:'2029-08-12',covered:'2026-09',payments:[]};
  const {run,V}=boot(seed({certs:[c]}));
  run("app.go('wallet');app.setWtab('certs');");
  t('«العائد الجاي» سطر لوحده', V().indexOf('<span style="display:block">العائد الجاي 10 أكتوبر 2026</span>')>-1, (V().match(/.{80}العائد الجاي.{40}/)||[''])[0]);
  t('العائد بالكسرين', V().indexOf('162.50')>-1);
  run("app.startCertEdit('c1');");const v=V();
  t('التعديل: الحساب ← المبلغ ← العائد', v.indexOf('تابعة لأنهي حساب؟')<v.indexOf('id="camt"')&&v.indexOf('id="camt"')<v.indexOf('id="cmo"'));
}
{ // التصنيفات: المسح جوه «عدّل» بس
  const {run,V}=boot(seed());
  run("app.go('settings');setsOpen={cats:1};setSub='mine';render();");
  t('مفيش × جنب التصنيفات', V().indexOf("app.askDel('cat")<0);
  const id=run("D.cats.find(c=>LOCKED.indexOf(c.id)<0).id");
  run("app.catEditOpen('me','"+id+"');");
  t('في التعديل: «امسح التصنيف»', V().indexOf('امسح التصنيف')>-1);
  run("app.askDel('cat"+id+"');app.delCat('"+id+"');");
  t('اتمسح', !run("D.cats.some(c=>c.id==='"+id+"')"));
}
{ // الاشتراك: «سجّل الدفع» والباقي ورا ⋯
  const sub={id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-01',account:'cib',cat:'subs',payments:[],dues:[]};
  const {run,V}=boot(seed({subs:[sub]}));
  run("app.go('wallet');app.setWtab('subs');");
  t('ظاهر «سجّل الدفع» و⋯ بس', V().indexOf('سجّل الدفع')>-1&&V().indexOf('أجّل دورة')<0&&V().indexOf("app.askDel('subs1')")<0);
  run("app.toggleSubMore('s1');");
  t('⋯ بيفتح الباقي', V().indexOf('أجّل دورة')>-1&&V().indexOf("app.askDel('subs1')")>-1);
}
{ // «فلوس ليك» لشخص واحد: سطر واحد
  const {run,V}=boot(seed({owed:[{id:'o1',amount:100,who:'مازن',date:'2026-09-20',note:'سلفة',got:false,lent:true,cat:'lentcat'},{id:'o2',amount:50,who:'مازن',date:'2026-09-21',note:'غدا',got:false,lent:true,cat:'lentcat'}]}));
  run("app.go('home');alertsOpen=true;render();");
  const v=V();
  t('سطر واحد «مازن عليه» من غير سطر إجمالي', v.indexOf('<bdi>مازن</bdi> عليه')>-1&&v.indexOf('فلوس ليك <span')<0);
}
done();
