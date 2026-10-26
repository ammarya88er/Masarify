const {boot,seed,t,done,r2}=require('./harness');

/* ===== ٤٦ + ٥٢ — شاشة الإضافة ===== */
{
  const {run,V,B,doc,els}=boot(seed());
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCat('subs');app.setCur('USD');");
  const h=V();
  const iB=h.indexOf('رصيد الكارت بعد السحب'), iM=h.indexOf('class="money"');
  t('٥٢ خانة الرصيد قبل المبلغ على طول', iB>0 && iM>iB && h.slice(iB,iM).indexOf('<label class="f">')<0, iB+' '+iM);
  t('٤٦ الخانة القديمة اتشالت', h.indexOf('المبلغ المحجوز بالمصري')<0);
  t('٤٦ التلميح قبل الكتابة', h.indexOf('اكتب الرصيد المتاح')>0);
  doc.getElementById('balafter').value='41484';
  run("app.dset('balAfter',app.holdLive('balafter','card',0));");
  t('٤٦ التلميح بيحسب المحجوز ٥١٦', String(els['balafterh'].innerHTML).indexOf('>516</span>')>0, els['balafterh'].innerHTML);
  run("app.dset('amount','10');");
  t('٤٦ تلميح الدولار بيقول المحجوز', String(els['usdhint'].innerHTML).indexOf('المبلغ المحجوز')>=0 && String(els['usdhint'].innerHTML).indexOf('>516</span>')>0, els['usdhint'].innerHTML);
  run("app.saveEntry();");
  const x=JSON.parse(run("JSON.stringify(D.txns[0])"));
  t('٤٦ اتسجل بالمحجوز ٥١٦ والدولار ١٠', x.amount===516&&x.usd===10&&x.hold===true&&x.pending===true, JSON.stringify(x));
  t('٤٦ رصيد الكارت في البرنامج = اللي كتبته', B('me','card')===41484, B('me','card'));
  // رقم أكبر من الرصيد
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCat('subs');app.setCur('USD');");
  doc.getElementById('balafter').value='50000';run("app.dset('balAfter',app.holdLive('balafter','card',0));");
  t('٤٦ رقم أكبر من الرصيد: بيقولك راجعه', String(els['balafterh'].innerHTML).indexOf('راجعه')>0);
  run("app.dset('amount','10');app.saveEntry();");
  t('٤٦ ووقتها بيرجع للتقدير بسعر الصرف', run("D.txns[0].amount")===500 && !run("D.txns[0].hold"));
  // الجنيه: الخانة مش ظاهرة
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCur('EGP');");
  t('٤٦ بالجنيه: مفيش خانة رصيد', V().indexOf('رصيد الكارت بعد السحب')<0);
}
/* ظبّط: سجّل المحجوز لحركة اتسجلت بالتقدير */
{
  const {run,V,B,doc}=boot(seed({txns:[{id:'u',book:'me',kind:'expense',amount:500,cat:'subs',account:'card',date:'2026-09-24',usd:10,rate:50,pending:true,note:'Claude'}]}));
  run("app.go('home');alertsOpen=true;app.startFix('u','hold');");
  t('٤٦ زرار محجوز بيفتح خانة الرصيد', V().indexOf('id="fixbal"')>0 && V().indexOf('سجّل المحجوز')>0);
  doc.getElementById('fixbal').value='41480';
  run("app.fixHold('u');");
  const u=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.id==='u'))"));
  t('٤٦ المحجوز = ٤٢٠٠٠ − ٤١٤٨٠ = ٥٢٠', u.amount===520&&u.hold===true&&u.pending===true, JSON.stringify(u));
  t('٤٦ سعر الدولار في الإعدادات ما اتغيرش', run("D.rate")===50);
  run("render();");
  t('٤٦ التنبيه بقى بيقول محجوز ومفيهوش خانة الرصيد تاني', V().indexOf('محجوز')>0);
  t('٤٦ بعد ما بقى محجوز زرار محجوز اختفى', V().indexOf("app.startFix('u','hold')")<0);
}

/* ===== ٤٦ + ٤٤ — دفعة الاشتراك بالدولار ===== */
{
  const S=seed({subs:[{id:'c',name:'Claude',amount:20,cur:'USD',next:'2026-09-25',account:'card',cycle:'monthly',payments:[],dues:[]}]});
  const {run,V,B,doc}=boot(S);
  run("app.paySub('c');");
  const h=V();
  t('٤٦ خانة الرصيد في دفعة الاشتراك قبل الزرار', h.indexOf('id="psbal"')>0 && h.indexOf('id="psbal"')<h.indexOf("app.confirmPaySub('c')"));
  doc.getElementById('psbal').value='40940';run("app.setPaySubBal(app.holdLive('psbal','card',0));app.confirmPaySub('c');");
  const x=JSON.parse(run("JSON.stringify(D.txns[0])"));
  t('٤٦ الاشتراك اتسجل بالمحجوز ١٠٦٠', x.amount===1060&&x.hold===true&&x.usd===20, JSON.stringify(x));
  // سحب متكرر
  run("app.startRepeat('c');");
  t('٤٦ السحب المتكرر: الرصيد قبل المبلغ', V().indexOf('id="repbal"')>0 && V().indexOf('id="repbal"')<V().indexOf('id="repamt"'));
  doc.getElementById('repbal').value='39880';run("app.setRepBal(app.holdLive('repbal','card',0));");
  doc.getElementById('repamt').value='20';run("app.addRepeat('c');");
  t('٤٦ السحب المتكرر بالمحجوز ١٠٦٠', run("D.txns[0].amount")===1060 && run("D.txns[0].hold")===true);
  // ترقية
  run("app.startUpgrade('c');");
  t('٤٦ الترقية: الرصيد قبل المبلغ الجديد', V().indexOf('id="upbal"')>0 && V().indexOf('id="upbal"')<V().indexOf('المبلغ الجديد'));
}

/* ===== ٤٤ — السعر المخفض ===== */
{
  const {run,V}=boot(seed());
  run("app.go('wallet');wtab='subs';render();app.toggleSub();app.subSet('name','يوتيوب');app.subPick('cur','EGP');app.subSet('amount','110');");
  t('٤٤ سؤال السعر المخفض موجود', V().indexOf('فيه سعر مخفض لفترة؟')>0);
  run("app.subPick_on(true);app.subSet('promoAmt','52.99');app.subPick('promoN','3');app.subPick('next','2026-09-25');");
  t('٤٤ بيوري السعر العادي هيبدأ إمتى', V().indexOf('السعر العادي هيبدأ من دفعة 25 ديسمبر 2026')>0, (V().match(/السعر العادي هيبدأ[^<]*/)||[''])[0]);
  run("app.subPick('owner','me');app.subPick('split',false);app.addSub();");
  const s=JSON.parse(run("JSON.stringify(D.subs[0])"));
  t('٤٤ اتحفظ', s.amount===110 && s.promo && s.promo.amount===52.99 && s.promo.left===3, JSON.stringify(s));
  run("render();");
  t('٤٤ كارت الاشتراك بيوري المخفض', V().indexOf('>52.99<')>0 && V().indexOf('سعر مخفض — العادي')>0);
  // ٣ دفعات مخفضة وبعدين العادي
  const pay=()=>{run("paySubDate=D.subs[0].next;app.confirmPaySub(D.subs[0].id);");return run("(function(){const s=D.subs[0];const p=s.payments[s.payments.length-1];return D.txns.find(x=>x.id===p.t).amount;})()");};
  const a=[pay(),pay(),pay()];
  t('٤٤ أول ٣ دفعات بالمخفض', JSON.stringify(a)==='[52.99,52.99,52.99]', JSON.stringify(a));
  run("app.go('home');alertsOpen=true;render();");
  run("D.subs[0].next='2026-09-27';render();");
  t('٤٤ التنبيه قبل الدفعة العادية بيقول كده', V().indexOf('الدفعة دي بالسعر العادي')>0 && V().indexOf('>110<')>0);
  t('٤٤ الدفعة الرابعة بالعادي', pay()===110);
  run("render();");
  t('٤٤ الملاحظة اختفت بعدها', V().indexOf('الدفعة دي بالسعر العادي')<0);
  // التراجع بيرجّع العداد
  run("app.undoSubPay(D.subs[0].id);app.undoSubPay(D.subs[0].id);");
  t('٤٤ التراجع بيرجّع دفعة مخفضة', run("D.subs[0].promo.left")===1 && run("D.subs[0].promo.done")===false);
  // التعديل
  run("app.go('wallet');wtab='subs';app.startSubEdit(D.subs[0].id);");
  t('٤٤ التعديل فيه السعر المخفض', V().indexOf('فيه سعر مخفض لفترة؟')>0 && V().indexOf('value="52.99"')>0);
  run("app.sdPick_on(false);app.saveSubEdit(D.subs[0].id);");
  t('٤٤ شيل المخفض من التعديل', !run("D.subs[0].promo"));
}

/* ===== ٦١ — التسجيل التلقائي: في يومه بيستنى «اتخصم»، ولو اليوم عدّى بيتسجل بتاريخ يومه ===== */
{
  const S=seed({_autoSince:'2026-09-01',subs:[
    {id:'a',name:'سبوتيفاي',amount:139,cur:'EGP',next:'2026-09-25',at:'09:00',account:'card',cycle:'monthly',payments:[],dues:[]},
    {id:'b',name:'نت',amount:300,cur:'EGP',next:'2026-09-25',account:'card',cycle:'monthly',payments:[],dues:[]},
    {id:'c',name:'بعد الضهر',amount:50,cur:'EGP',next:'2026-09-25',at:'23:00',account:'card',cycle:'monthly',payments:[],dues:[]},
    {id:'d',name:'قديم',amount:40,cur:'EGP',next:'2026-08-10',at:'09:00',account:'card',cycle:'monthly',payments:[],dues:[]}]});
  const {run,V}=boot(S,Date.UTC(2026,8,25,12,0,0));
  t('٦١ في يومه: مااتسجلش لسه', run("D.txns.length")===0);
  run("app.go('home');alertsOpen=true;render();");
  t('٦١ في التنبيهات «مستني الخصم» و«اتخصم» و«لسه»', V().indexOf('مستني الخصم')>-1&&V().indexOf("app.subCharged('a')")>-1&&V().indexOf("app.subHold('a')")>-1);
  run("app.subCharged('b');");
  t('٦١ «اتخصم» سجّله النهارده', run("D.txns.filter(x=>x.note==='نت').length")===1&&run("D.subs[1].next")==='2026-10-25');
  run("app.subHold('c');");
  const saved=run("JSON.stringify(D)");
  const {run:r2,V:V2}=boot(JSON.parse(saved),Date.UTC(2026,8,26,9,0,0));
  t('٦١ اليوم عدّى: مااتسجلش لوحده', r2("D.txns.filter(x=>x.note==='سبوتيفاي').length")===0);
  t('٦١ اللي قلت عليه «لسه» فضل مستني', r2("D.txns.filter(x=>x.note==='بعد الضهر').length")===0);
  r2("app.go('home');alertsOpen=true;render();");
  t('٦١ لسه «مستني الخصم»', V2().indexOf("app.subCharged('a')")>0);
  r2("app.subCharged('a');");
  t('٦١ «اتخصم» بعد يومه: بتاريخ يومه ومعاه التدبير', r2("D.txns.filter(x=>x.note==='سبوتيفاي').length")===1&&r2("D.txns.find(x=>x.note==='سبوتيفاي').date")==='2026-09-25'&&r2("D.subs[0].payments[0].fee")===4.17);
  r2("app.undoSubPay('a');");
  t('٦١ التراجع لغى الدفعة ورجع مستني', r2("D.txns.filter(x=>x.note==='سبوتيفاي').length")===0 && r2("D.subs[0].next")==='2026-09-25');
}
{ // أول مرة تشتغل: مابترجعش لدفعات فاتت
  const S=seed({subs:[{id:'d',name:'قديم',amount:40,cur:'EGP',next:'2026-08-10',at:'09:00',account:'card',cycle:'monthly',payments:[],dues:[]}]});
  delete S._autoSince;
  const {run,V}=boot(S);
  t('٦١ أول مرة: الدفعة الفايتة ما اتسجلتش', run("D.txns.length")===0);
  t('٦١ أول مرة: بتفضل في التنبيهات', (run("app.go('home');alertsOpen=true;render();"),V().indexOf("app.subCharged('d')")>0));
  run("paySubDate='2026-08-10';app.confirmPaySub('d');");
  t('٦١ الدفعات اللي فاتت قبل ما الميزة تشتغل كلها بإيدك', run("D.subs[0].next")==='2026-09-10' && (run("runAuto();"),run("D.txns.length"))===1);
  run("paySubDate='2026-09-10';app.confirmPaySub('d');");
  const {run:run2}=boot(JSON.parse(run("JSON.stringify(D)")),Date.UTC(2026,9,11,12,0,0));
  t('٦١ الدفعة اللي بعدها برضو مستنية «اتخصم» بعد يومها', run2("D.txns.filter(x=>x.note==='قديم').length")===2);
}
{ // الشهادات: العائد بيستنى «نزل»
  const S=seed({certs:[{id:'c',name:'شهادة 1',amount:50000,monthly:800,start:'2026-07-01',account:'cib',type:'cert',day:1,covered:'2026-08'}]});
  const {run,V,doc}=boot(S);
  run("app.go('home');alertsOpen=true;render();");
  t('٦١ العائد مااتسجلش لوحده وظاهر «مستني العائد»', run("D.txns.length")===0&&V().indexOf('مستني العائد')>-1&&V().indexOf("app.certPayOpen('c',1)")>-1);
  run("app.certPayOpen('c');");doc.getElementById('cerd').value='2026-09-02';doc.getElementById('cera').value='800';
  run("app.confirmCertEarly('c');");
  t('٦١ «نزل» سجّله بتاريخه', run("D.txns.length")===1&&run("D.txns[0].date")==='2026-09-02'&&run("D.certs[0].covered")==='2026-09');
}
done();
