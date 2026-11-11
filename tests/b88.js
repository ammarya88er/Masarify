// الحسابات في أماكنها: قواعد التحويل، سحب المحفظة كتحويل، نفس النوع مع المكتب، رسوم التحويل البنكي، زرار الدرجة
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,11,9);
const ACC=[{id:'cash',name:'كاش',opening:5000,scope:'me',atype:'cash'},{id:'cib',name:'حساب CIB',opening:10000,openingOffice:2000,scope:'both',atype:'bank'},
  {id:'bk2',name:'بنك تاني',opening:500,scope:'me',atype:'bank'},
  {id:'card',name:'كارت المشتريات',opening:42000,limit:42000,credit:true,atype:'credit',stmtDay:20,graceDay:15,scope:'me',secured:[],payFrom:'cib'},
  {id:'wal',name:'محفظة',opening:300,scope:'me',atype:'wallet'},{id:'ocash',name:'كاش العهدة',opening:0,openingOffice:3000,scope:'office',atype:'cash'}];
const mk=o=>boot(seed(Object.assign({accounts:ACC},o||{})),NOW);
{ // قواعد التحويل
  const {run,V,B}=mk();
  const ok=(a,b)=>run("xferOk('"+a+"','"+b+"')");
  t('المحفظة: للكاش بس', ok('wal','cash')===true&&ok('wal','cib')===false&&ok('wal','card')===false);
  t('للمحفظة: من البنك أو الكاش', ok('cib','wal')===true&&ok('cash','wal')===true);
  t('الكارت: من حسابه المربوط بس', ok('cib','card')===true&&ok('bk2','card')===false&&ok('cash','card')===false&&ok('card','cash')===false);
  run("app.go('add');app.setKind('transfer');app.setPSwap&&0;draft.swap=false;app.setAccount('wal');");
  t('من المحفظة: الوجهة الكاش واتختارت لوحدها', run("draft.to")==='cash'&&V().indexOf("app.setTo('cib')")<0&&V().indexOf('ده سحب كاش من المحفظة')>-1);
  t('وسؤال عمولة السحب', V().indexOf('فيه عمولة سحب؟')>-1);
  const w0=B('me','wal'),c0=B('me','cash');
  run("app.setSvFee(true);app.dset('svFeeAmt','3');app.dset('amount','100');app.saveEntry();");
  t('السحب اتسجل تحويل والعمولة من المحفظة', B('me','wal')===w0-103&&B('me','cash')===c0+100&&run("D.txns.some(x=>x.kind==='expense'&&x.cat==='fees'&&x.account==='wal'&&x.amount===3)"));
  run("app.go('add');app.setKind('transfer');draft.swap=false;app.setAccount('bk2');");
  t('من بنك مش مربوط بالكارت: الكارت مش ظاهر', V().indexOf("app.setTo('card')")<0&&V().indexOf("app.setTo('wal')")>-1);
  run("app.setKind('expense');app.setAccount('wal');");
  t('المصروف من المحفظة: مفيش «العملية دي إيه؟»', V().indexOf('العملية دي إيه؟')<0&&V().indexOf('سحبت من المكنة')<0);
  // تحويل قديم مخالف: يتعدّل من غير تغيير
  const S=seed({accounts:ACC,txns:[{id:'o',book:'me',kind:'transfer',amount:50,account:'wal',to:'cib',date:'2026-09-10',op:'p1',note:''}],
    ops:{p1:{f:'entry',b:'me',v:2,d:{kind:'transfer',amount:'50',account:'wal',to:'cib',date:'2026-09-10',swap:false}}}});
  const r=boot(S,NOW);const J="JSON.stringify(JSON.parse(JSON.stringify(D.txns)).map(x=>Object.keys(x).sort().map(k=>k+':'+x[k]).join()))";const j=r.run(J);
  r.run("openOp('p1');");t('تحويل قديم: وجهته القديمة لسه ظاهرة', r.V().indexOf("app.setTo('cib')")>-1);
  r.run("__yn();app.saveEntry();");t('وتعديله من غير تغيير مايغيرش حاجة', r.run(J)===j, r.run(J)+' VS '+j);
}
{ // سوّها مع العهدة: نفس النوع
  const {run,V,B}=mk({floatLoans:[{id:'l',dir:'take',amount:100,date:'2026-11-01',acct:'ocash'}]});
  run("app.go('home');alertsOpen=true;loanFor=true;render();");
  t('الافتراضي (كاش): كاش العهدة بس', V().indexOf("app.flPaySet_to('ocash')")>-1&&V().indexOf("app.flPaySet_to('cib')")<0);
  run("app.flPaySet_from('cib');");
  t('من CIB: نصيب المكتب في CIB بس', V().indexOf("app.flPaySet_to('cib')")>-1&&V().indexOf("app.flPaySet_to('ocash')")<0);
  run("app.flPaySet_from('wal');");
  t('من المحفظة: مفيش حساب من نوعها', V().indexOf('حساب من نفس نوع الحساب ده')>-1);
  const n=run("D.floatLoans.length");run("document.getElementById('loanin').value='100';app.settleLoan();");
  t('ومايتسجلش', run("D.floatLoans.length")===n);
  run("flPay={from:'cash'};loanFor=true;render();document.getElementById('loanin').value='100';app.settleLoan();");
  t('كاش لكاش بيتسجل', run("loanBalance()")===0);
  // أخدت من العهدة
  const r=mk({floatLoans:[{id:'l',dir:'back',amount:100,date:'2026-11-01'}]});
  r.run("app.go('home');alertsOpen=true;loanFor=true;flPay={bfrom:'ocash'};render();");
  t('خدت من كاش العهدة: حسابك الكاش بس', r.V().indexOf("app.flPaySet_bto('cash')")>-1&&r.V().indexOf("app.flPaySet_bto('wal')")<0&&r.V().indexOf("app.flPaySet_bto('bk2')")<0);
}
{ // التبديل: حسابي من نفس نوع حساب العهدة
  const {run,V}=mk();
  run("app.go('add');app.setKind('transfer');app.setPSwap(true);");
  t('التبديل: الكاش بس من حساباتي', V().indexOf("app.setPSmy('cash')")>-1&&V().indexOf("app.setPSmy('wal')")<0&&V().indexOf("app.setPSmy('bk2')")<0);
  run("app.setBook('office');app.go('add');app.oKind('xfer');app.oSwap(true);");
  t('ونفسه في دفتر المكتب', V().indexOf("app.oMyAcc('cash')")>-1&&V().indexOf("app.oMyAcc('wal')")<0);
}
{ // رسوم التحويل البنكي
  const {run}=mk();
  t('0.1% بحد أدنى 0.5 وأقصى 20', run("xferFeeFor(100)")===0.5&&run("xferFeeFor(2200)")===2.2&&run("xferFeeFor(50000)")===20);
  run("app.go('add');app.setKind('expense');app.setAccount('cib');app.setOwedKind('lent');app.dset('amount','2200');app.setHasFee(true);");
  t('سلفة من البنك: الرسوم اتملت', run("draft.feeAmt")==='2.2');
  run("app.dset('amount','800');");t('وبتمشي مع المبلغ', run("draft.feeAmt")==='0.8');
  run("app.dset('feeAmt','5');app.dset('amount','900');");t('غيّرتها بنفسك: بتفضل', run("draft.feeAmt")==='5');
  run("app.go('add');draft=newDraft();app.setKind('expense');app.setAccount('cash');app.setOwedKind('lent');app.dset('amount','800');app.setHasFee(true);");
  t('من الكاش: مابتتملاش', run("draft.feeAmt")==='');
  run("app.xfeeSet('min','1');");t('من الإعدادات', run("xferFeeFor(100)")===1);
}
{ // زرار الدرجة
  const {run,V}=mk();run("app.go('add');app.setKind('expense');app.setCat('eatout');");
  t('من غير درجات: مفيش «حدد درجة»', V().indexOf('حدد درجة')<0);
  run("app.lvSetCat('snacks','harm');app.setCat('eatout');");t('بعد أول درجة: بيظهر', V().indexOf('حدد درجة')>-1);
}
t('الكود القديم اتشال', !/function (chargeSub|autoCharge|chargedAlready|beforeChargeTime)\(/.test(require('fs').readFileSync(__dirname+'/s0.js','utf8')));
done();
