// اختبار رجوع للحاجات اللي اتعملت في الدفعات اللي فاتت
const {boot,seed,t,done,r2}=require('./harness');
{ // بنزين تقريبي
  const {run}=boot(seed());
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('cash');app.setCat('fuel');draft.veh='v1';draft.fuelType='٩٢';app.dset('amount','200');app.saveEntry();");
  t('سابق: اللترات التقريبية', Math.abs(run("D.txns[0].liters")-13.11)<0.02 && run("D.txns[0].litersEst")===true);
}
{ // الدولار: التقدير والمحجوز والتظبيط
  const {run,doc}=boot(seed());
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('card');app.setCat('subs');app.setCur('USD');app.dset('amount','10');draft.balAfter='41484';app.saveEntry();");
  const id=run("D.txns[0].id");
  t('سابق: المحجوز', run("D.txns[0].amount")===516 && run("D.txns[0].hold")===true);
  run("app.go('home');alertsOpen=true;app.startFix('"+id+"');");doc.getElementById('fixin').value='523';run("app.confirmFix('"+id+"');");
  t('سابق: التظبيط حدّث السعر', run("D.rate")===52.3);
}
{ // الاشتراك التلقائي بالجنيه على الكارت
  const S=seed({subs:[{id:'a',name:'يوتيوب',amount:52.99,cur:'EGP',next:'2026-09-20',account:'card',cycle:'monthly',payments:[],dues:[]}]});
  const {run}=boot(S);
  run("paySubDate='2026-09-20';app.confirmPaySub('a');");
  t('سابق: دفعة الاشتراك اتسجلت', run("D.txns.filter(x=>x.note==='يوتيوب').length")===1);
  t('سابق: تقديره ١٫٥٨ (بيقطع)', run("D.subs[0].payments[0].fee")===1.58, run("JSON.stringify(D.subs[0].payments)"));
}
{ // فلوس ليك: زيادة على اللي عليه
  const {run,B}=boot(seed({owed:[{id:'o',amount:100,who:'علي',date:'2026-09-01',cat:'lentcat',got:false,lent:true}]}));
  run("owedAcct='cash';owedGot='150';app.confirmOwedGet('g_علي');");
  t('سابق: الزيادة دخل', B('me','cash')===5150 && run("D.txns.some(x=>x.kind==='income'&&x.amount===50)"));
}
{ // جزء من العهدة وسداده
  const {run,B,doc}=boot(seed());
  run("app.go('add');draft.kind='expense';app.shutRow('acct');app.setAccount('cash');app.setCat('repair');app.dset('amount','300');app.setFromFloat(true);app.dset('floatAmt','300');app.saveEntry();");
  run("app.go('home');alertsOpen=true;app.goLoans();app.flPaySet_from('cib');app.flPaySet_to('cib');");doc.getElementById('loanin').value='300';run("app.settleLoan();");
  t('سابق: سداد العهدة', B('me','cib')===9700 && B('office','cib')===20300 && B('office','ocash')===2700);
}
{ // التبديل
  const {run,B}=boot(seed());
  run("app.go('add');draft.kind='transfer';render();app.setPSwap(true);app.setPSmy('cash');app.setPSoff('ocash');app.dset('amount','500');app.saveEntry();");
  t('سابق: التبديل', B('me','cash')===5500 && B('office','ocash')===2500 && B('office','cib')===20500 && B('me','cib')===9500);
}
{ // التأمين
  const S=seed({txns:[{id:'a',book:'me',kind:'expense',amount:8316.11,cat:'grocery',account:'card',date:'2026-08-18'}]});
  S.accounts[2].insLast='2026-08';
  const {run}=boot(S);
  run("app.go('home');");
  t('سابق: التأمين ٧٤٫٨٤ ومستني تأكيد', run("JSON.stringify(D.txns.filter(x=>x.insFee).map(x=>[x.amount,x.pending]))")==='[[74.84,true]]');
}
{ // قسط الكارت
  const {run}=boot(seed());
  run("app.go('wallet');wtab='ins';render();app.toggleIns();app.insSrc('card');app.insSet('name','iMedia');app.insBuyDate('2026-04-19');app.insCat('other');app.insSet('total','2999');app.insSet('months','6');app.insSet('monthly','550.55');app.addIns();app.go('home');");
  t('سابق: فوايد القسط زي البنك', run("JSON.stringify(D.txns.filter(x=>x.insInt).map(x=>x.amount).sort((a,b)=>a-b).slice(0,2))")==='[15.16,29.91]');
}
{ // الوعاء
  const S=seed();S.accounts.push({id:'th',name:'ثاندر',opening:0,scope:'me',atype:'save',saveFreq:'month',saveDay:5,saveStart:'2026-07-01',saveRate:12,saveRates:[{from:'2026-07-01',rate:12}]});
  S.txns.push({id:'d',book:'me',kind:'transfer',amount:10000,account:'cash',to:'th',date:'2026-07-01'});
  const {run}=boot(S);run("app.go('home');");
  t('سابق: عايد الوعاء الشهري', run("JSON.stringify(D.txns.filter(x=>x.kind==='yield').map(x=>x.amount).sort((a,b)=>a-b))")==='[100,101,102.01]');
}
{ // الفلتر والكارت مش مصدر تحويل
  const {run,V}=boot(seed());
  run("app.go('add');draft.kind='transfer';render();");
  t('سابق: الكارت مش مصدر تحويل', V().indexOf("app.setAccount('card')")<0);
  run("app.go('log');app.setF('dir','in');");
  t('مع داخل: أنواع الدخل بدل التصنيفات', V().indexOf('كل الأنواع')>-1&&V().indexOf('كل التصنيفات')<0);
  run("app.setF('dir','tr');");
  t('سابق: التصنيفات بتختفي مع التحويلات', V().indexOf("setF('cat'")<0);
}
done();
