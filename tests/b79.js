// دفعة الفحص ٣: الربط وقت التعديل والمسح + المرتجع المحجوز + صيانة من غير تاريخ
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,22,9);
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'eatout',account:'cash',date:'2026-10-10'},o||{});
const E='({stopPropagation(){}})';
const J=(run,x)=>JSON.parse(run("JSON.stringify("+x+")"));

{ // ١ تعديل مبلغ تحصيل
  const {run}=boot(seed({txns:[ex('e',300)],owed:[{id:'o1',who:'علي',amount:100,date:'2026-10-10',srcTxn:'e'}]}),NOW);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],60,'cash','علي');save();");
  const c=run("D.txns.find(x=>/تحصيل/.test(x.note)).id");
  run("app.startTxnEdit("+E+",'"+c+"');eTxn.amount='100';app.saveTxnEdit('"+c+"');");
  t('التحصيل بقى 100: اللي عند علي اتقفل', run("D.owed[0].got")===true&&run("D.owed[0].gotAmount")===100);
  run("app.startTxnEdit("+E+",'"+c+"');eTxn.amount='30';app.saveTxnEdit('"+c+"');");
  t('التحصيل قل لـ30: الباقي 70 رجع عنده', run("D.owed[0].got")===false&&run("D.owed[0].amount")===70);
  run("app.startTxnEdit("+E+",'"+c+"');eTxn.amount='500';app.saveTxnEdit('"+c+"');");
  t('أكتر من اللي عنده: مااتعدلش', run("D.txns.find(x=>x.id==='"+c+"').amount")===-30);
}
{ // ٢ مسح مصروف متقسم بعد ما جزء اتحصّل
  const {run}=boot(seed({txns:[ex('e',300)],owed:[{id:'o1',who:'علي',amount:100,date:'2026-10-10',srcTxn:'e'}]}),NOW);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],60,'cash','علي');save();app.delTxn("+E+",'e');");
  t('اللي اتحصّل فضل والباقي مابقاش عليه', run("D.owed.length")===1&&run("D.owed[0].got")===true&&run("peopleLedger().length")===0);
  run("app.undoLast();");
  t('التراجع رجّع كل حاجة', !run("D.owed[0].got")&&run("D.owed[0].amount")===40&&run("D.txns.some(x=>x.id==='e')"));
}
{ // ٣ مسح سطر من عملية: الزرار والتراجع باسم العملية
  const {run,V}=boot(seed(),NOW);
  run("app.go('add');draft.kind='expense';draft.account='cash';draft.cat='eatout';draft.note='غدا';draft.hasFee=true;draft.feeAmt='5';draft.amount='300';app.saveEntry();");
  const f=run("D.txns.find(x=>x.cat==='fees').id");
  run("app.go('log');openTxn='"+f+"';render();");
  t('زرار المسح بيقول العملية كلها', V().indexOf('امسح العملية كلها')>-1);
  run("app.delTxn("+E+",'"+f+"');");
  t('التراجع باسم العملية', /غدا/.test(run("lastUndo.label")));
}
{ // ٤ سلفة اتسددت واتعدلت لأقل: الزيادة ليك
  const {run}=boot(seed({txns:[{id:'l',book:'me',kind:'settle',dir:'in',amount:500,account:'cash',date:'2026-10-01',debt:true,from:'علي'},
    {id:'p',book:'me',kind:'settle',dir:'out',amount:500,account:'cash',date:'2026-10-05',debtPay:true,from:'علي'}]}),NOW);
  run("D.txns.find(x=>x.id==='l').amount=300;");
  const g=J(run,"peopleLedger()");
  t('الزيادة 200 بقت ليك عند علي', g.length===1&&g[0].net===200);
  run("owedAcct='cash';owedGot='200';app.confirmOwedGet('g_علي');");
  t('رجّعها: الحساب اتقفل والكاش رجع', run("peopleLedger().length")===0&&run("balances('me').cash")===5000+300-500+200);
  const r=boot(seed({txns:[{id:'p',book:'me',kind:'settle',dir:'out',amount:500,account:'cash',date:'2026-10-05',debtPay:true,from:'علي'}]}),NOW);
  r.run("app.dropOwedGroup('g_علي');");
  t('سامحته: اتقفل واتحسب مصروف', r.run("peopleLedger().length")===0&&r.run("monthStats().spent")===500);
}
{ // ٥ مسح شراية بالتقسيط على الكارت
  const {run}=boot(seed(),Date.UTC(2026,9,18,9));
  run("tab='wallet';wtab='ins';render();app.toggleIns();app.insSrc('card');app.insSet('name','لابتوب');app.insSet('total','12000');app.insSet('months','12');app.insSet('monthly','1100');app.insCat('devices');app.addIns();");
  const st=run("JSON.stringify(D)");
  const b=boot(JSON.parse(st),Date.UTC(2026,11,25,9));b.run("render()");
  const id=b.run("D.txns.find(x=>x.insBuy).id");
  b.run("app.delTxn("+E+",'"+id+"')");
  t('القسط وفوايده اتمسحوا مع الشراية', b.run("D.installments.length")===0&&b.run("D.txns.filter(x=>x.insInt).length")===0);
}
{ // ٦ الشهادات
  const s=seed();s.accounts.push({id:'nbe',name:'بنك تاني',opening:50000,scope:'me',atype:'bank'});
  const {run,els}=boot(s,Date.UTC(2026,9,18,9));
  run("app.go('wallet');app.setWtab('certs');app.toggleCert();app.certBank('cib');app.certSet('amount','10000');app.certDed(true);app.certSet('monthly','162.5');app.certSet('start','2026-10-15');app.certSet('end','2029-10-15');app.certAccount('cib');app.addCert();");
  const c=run("D.certs[0].id");
  run("app.certEditBank('"+c+"','nbe');");
  t('تغيير البنك نقل الشراء', run("D.txns.find(x=>x.certBuy).account")==='nbe'&&run("balances('me').cib")===10000);
  run("app.startCertEdit('"+c+"');");els['cpen']={value:'200'};run("app.breakCert('"+c+"');");
  const bid=run("D.txns.find(x=>x.certBack).id");
  run("app.delTxn("+E+",'"+bid+"');");
  t('مسح الصرف: الشهادة رجعت شغالة والغرامة اتمسحت', run("D.certs[0].redeemed")===false&&run("D.txns.filter(x=>x.certFee).length")===0);
  const buy=run("D.txns.find(x=>x.certBuy).id");
  run("app.delTxn("+E+",'"+buy+"');");
  t('مسح الشراء: الشهادة فضلت من غير خصم', run("D.certs.length")===1&&run("D.certs[0].legacy")===true);
}
{ // ٧ الفاتورة: المرتجع والأصناف اللي اتحولت للمكتب
  const rc={id:'r1',book:'me',kind:'expense',amount:150,cat:'dairy',account:'cib',date:'2026-10-20',merchant:'كارفور',fromSms:true,items:[{name:'لبن',amount:100,cat:'dairy'},{name:'ورق',amount:50,cat:'other'}]};
  const {run,B}=boot(seed({txns:[JSON.parse(JSON.stringify(rc))]}),NOW);
  const c0=B('me','cib');
  run("app.eItemOffice('r1',1);app.startReturn('r1',0);app.doReturn('r1',0);");
  const rid=run("D.txns.find(x=>x.retOf==='r1').id");
  t('المرتجع محجوز ومش في الرصيد', run("D.txns.find(x=>x.id==='"+rid+"').refWait")===true&&B('me','cib')===c0+50);
  run("app.delTxn("+E+",'"+rid+"');");
  t('مسح المرتجع رجّع الصنف مش مترجّع', run("D.txns.find(x=>x.id==='r1').items[0].returned")===undefined);
  const oid=run("D.txns.find(x=>x.itemOf==='r1').id");
  run("app.delTxn("+E+",'"+oid+"');");
  t('مسح صنف المكتب لوحده: رجع للفاتورة', run("D.txns.find(x=>x.id==='r1').amount")===150&&run("D.txns.find(x=>x.id==='r1').items.length")===2);
  run("app.eItemOffice('r1',1);app.startReturn('r1',0);app.doReturn('r1',0);app.delTxn("+E+",'r1');");
  t('مسح الفاتورة مسح المرتجع وصنف المكتب', run("D.txns.length")===0);
}
{ // ٨ المرتجع المحجوز: «وصل»
  const {run,V,B}=boot(seed({txns:[ex('o',1000,{account:'card',refundSince:'2026-10-15',cat:'subs'})]}),NOW);
  const c0=B('me','card');
  const k00=run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-10')");
  run("app.confirmRefundBack('o');");
  const rid=run("D.txns.find(x=>x.refundOf==='o').id");
  t('المرتجع اتسجل محجوز', B('me','card')===c0&&run("monthStats().spent")===0);
  run("app.go('home');alertsOpen=true;render();");
  t('في التنبيهات مرتجع محجوز وزرار وصل', V().indexOf('مرتجع محجوز')>-1&&V().indexOf("app.refArrived('"+rid+"')")>-1);
  t('حساب الكشف ماتغيرش لما المرتجع اتسجل محجوز', run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-10')")===k00);
  run("app.refArrived('"+rid+"');");
  t('وصل: دخل الرصيد', B('me','card')===c0+1000);
  // استرداد ترقية
  const r=boot(seed({subs:[{id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-11-01',account:'cash',cat:'subs',payments:[],dues:[]}]}),NOW);
  r.run("app.startUpgrade&&app.startUpgrade('s1');upDraft={amount:'400',refund:'100',acct:'cash',date:'2026-10-22'};app.doUpgrade('s1');");
  t('استرداد الترقية محجوز', r.run("D.txns.find(x=>/استرداد ترقية/.test(x.note)).refWait")===true);
}
{ // ٩ تعديل فاتورة: مفيش سؤال «دي فاتورة الخصم ده؟»، والفاوتشر ظاهر
  const {run,V}=boot(seed({vouchers:[{id:'v1',code:'AAA',amount:30,used:false,expiry:'2026-12-31'}]}),NOW);
  run("app.go('scan');app.manualBill();scan.items=[{name:'شاي',amount:100,cat:'drinks'}];Object.assign(scan,{account:'cash',merchant:'محل',date:'2026-10-20'});app.scanVch('v1');app.saveReceipt();");
  const id=run("D.txns[0].id");
  run("D.txns.push({id:'s1',book:'me',kind:'expense',amount:70,cat:'other',account:'cash',date:'2026-10-20',needs:true,fromSms:true});app.go('log');app.startTxnEdit("+E+",'"+id+"');scan.match='s1';render();");
  t('مفيش ربط بخصم وقت التعديل', V().indexOf('دي فاتورة الخصم ده؟')<0);
  t('الفاوتشر ظاهر في التعديل', V().indexOf('AAA')>-1);
}
{ // ١٠ مركبة تانية مابتغيّرش تاريخ الأولى
  const S=seed({vehicles:[{id:'sc',name:'سكوتر'}],txns:[ex('r0',50,{cat:'repair',note:'غيار زيت',odo:1000,date:'2026-09-01'})]});
  const {run}=boot(S,NOW);
  const b=run("JSON.stringify(vehMaint('sc').rows[0].last)");
  run("app.toggleVeh();vehDraft.name='عربية';app.addVeh();");
  t('إضافة مركبة تانية: السكوتر محتفظ بالغيار', run("JSON.stringify(vehMaint('sc').rows[0].last)")===b&&b!=='null');
  const car=run("D.vehicles[1].id");
  run("D.txns.push({id:'r1',book:'me',kind:'expense',amount:900,cat:'repair',veh:'"+car+"',odo:85000,note:'غيار زيت',account:'cash',date:'2026-10-10'});app.delVeh('"+car+"');");
  t('مسح العربية: غيارها مااتنقلش للسكوتر', run("vehMaint('sc').rows[0].last.txn")==='r0');
}
{ // ١١ صيانة من غير تاريخ، والترتيب بالعداد
  const {run,V}=boot(seed({vehicles:[{id:'sc',name:'سكوتر'}],txns:[ex('r0',50,{cat:'repair',note:'غيار زيت',odo:1000,date:'2026-10-01',veh:'sc'})]}),NOW);
  run("app.mLogOpen('sc','oil');app.mLogNoDate();mLogDraft.odo='1800';app.mLogSave();");
  const m=J(run,"D.vehicles[0].maintLog[0]");
  t('اتسجل من غير تاريخ', m.date===''&&m.odo===1800);
  t('آخر غيار هو الأعلى في العداد', run("vehMaint('sc').rows[0].last.odo")===1800);
}
{ // ١٢ اشتراك اتعدل من غير تغيير: العرض اللي خلص ونصيبك بيفضلوا
  const sub={id:'s1',name:'Netflix',amount:270,cur:'EGP',cycle:'monthly',next:'2026-11-01',account:'card',cat:'subs',payments:[],dues:[],promo:{amount:110,left:0},myShare:100};
  const {run}=boot(seed({subs:[sub]}),NOW);
  const b=run("JSON.stringify(D.subs[0])");
  run("app.startSubEdit('s1');app.saveSubEdit('s1');");
  t('مفيش حاجة اتغيرت', run("JSON.stringify(D.subs[0])")===b, run("JSON.stringify(D.subs[0])"));
}
{ // ١٣ نوع الحركة اتغير بعد ما اخترت تصنيف
  const {run}=boot(seed({vehicles:[{id:'v1',name:'سكوتر'}]}),NOW);
  run("app.go('add');app.setKind('expense');app.setCat('fuel');app.setKind('transfer');draft.account='cib';draft.to='cash';draft.amount='100';app.saveEntry();");
  const x=J(run,"D.txns[0]");
  t('التحويل من غير تصنيف ولا مركبة', x.kind==='transfer'&&x.cat===undefined&&x.veh===undefined, JSON.stringify(x));
}
{ // ١٤ الاسم القديم لسطر الكارت
  const {run}=boot(seed({txns:[{id:'a',book:'me',kind:'settle',dir:'out',amount:524.4,account:'card',date:'2026-09-26',ocard:true,link:'L',note:'باقي تقريب — نت'},
    {id:'b',book:'office',kind:'expense',amount:525,account:'cib',date:'2026-09-26',item:'نت',link:'L',ocard:'card'}]}),NOW);
  t('اتصلح لـ«مصروف المكتب بالكارت»', run("D.txns.find(x=>x.id==='a').note")==='مصروف المكتب بالكارت — نت');
}
{ // مراجعة: مرتجع صنف بعد خصم الفاتورة، وصنف حد تاني مالوش «رجّعته»
  const {run,V}=boot(seed(),NOW);
  run("app.go('scan');app.manualBill();scan.items=[{name:'لبن',amount:100,cat:'dairy'},{name:'شيبسي',amount:50,cat:'snacks',who:'علي'}];Object.assign(scan,{account:'cash',merchant:'م',date:'2026-10-20',disc:'30'});app.saveReceipt();");
  const id=run("D.txns.find(x=>x.items).id");
  run("app.go('log');openTxn='"+id+"';render();");
  t('مفيش «رجّعته» لصنف علي', (V().match(/app\.startReturn\('/g)||[]).length===1);
  const ix=run("D.txns.find(x=>x.id==='"+id+"').items.findIndex(i=>i.name==='لبن')");
  run("app.startReturn('"+id+"',"+ix+");app.doReturn('"+id+"',"+ix+");");
  t('المرتجع بنصيبه بعد الخصم', run("D.txns.find(x=>x.retOf==='"+id+"').amount")===-80);
}
{ // مراجعة: وصل المرتجع بيدخل من يوم وصوله
  const {run,B}=boot(seed({txns:[ex('o',1000,{account:'card',refundSince:'2026-10-15',cat:'subs'})]}),Date.UTC(2026,9,18,9));
  run("app.confirmRefundBack('o');");
  const st=run("JSON.stringify(D)");
  const r=boot(JSON.parse(st),Date.UTC(2026,9,25,9));
  const rid=r.run("D.txns.find(x=>x.refundOf==='o').id");
  const k0=r.run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-10')");
  r.run("app.refArrived('"+rid+"');");
  t('كشف أكتوبر ماتغيرش بعد ما وصل', r.run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-10')")===k0, k0);
  t('بتاريخ وصوله في الرصيد وبتاريخه في الشهر', r.run("D.txns.find(x=>x.id==='"+rid+"').date")==='2026-10-25'&&r.run("sdBuild()['"+rid+"']")==='2026-10-18');
}
{ // مراجعة: سجل اتقفل لأن صرفته اتمسحت مايرجعش دين
  const {run}=boot(seed({txns:[ex('e',300)],owed:[{id:'o1',who:'علي',amount:100,date:'2026-10-10',srcTxn:'e'}]}),NOW);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],60,'cash','علي');save();app.delTxn("+E+",'e');");
  const c=run("D.txns.find(x=>/تحصيل/.test(x.note)).id");
  run("app.startTxnEdit("+E+",'"+c+"');eTxn.amount='50';app.saveTxnEdit('"+c+"');");
  t('تعديل التحصيل: علي مابقاش عليه حاجة', run("peopleLedger().length")===0);
  run("app.delTxn("+E+",'"+c+"');");
  t('مسح التحصيل: السجل اتشال', run("peopleLedger().length")===0&&run("D.owed.length")===0);
}
{ // مراجعة: صيانة من غير تاريخ بين حركات بتاريخ
  const {run}=boot(seed({vehicles:[{id:'sc',name:'سكوتر'}],txns:[ex('a',50,{cat:'repair',note:'غيار زيت',odo:1000,date:'2026-10-20',veh:'sc'}),ex('b',50,{cat:'repair',note:'غيار زيت',date:'2026-10-10',veh:'sc'})]}),NOW);
  run("app.mLogOpen('sc','oil');app.mLogNoDate();mLogDraft.odo='1800';app.mLogSave();");
  t('آخر غيار 1800', run("vehMaint('sc').rows[0].last.odo")===1800);
}
done();
