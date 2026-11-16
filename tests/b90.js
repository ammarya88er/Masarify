// الدولار: الشراء بالدولار على أي كارت، التحويل بأكتر من الرصيد ممنوع، وفرق العملة بيتحسب من جديد
const {boot,seed,t,done}=require('./harness');
const E={stopPropagation(){}};
const fx=o=>seed(Object.assign({fx:{on:true,curs:['USD'],rates:{USD:50},at:'',manual:{}}},o||{}));
const S=()=>{const s=fx();
  s.accounts.push({id:'k2',name:'كارت تاني',opening:20000,limit:20000,credit:true,atype:'credit',scope:'me',secured:[]});
  s.accounts.push({id:'usd',name:'دولار',opening:0,scope:'me',atype:'bank',cur:'USD',openRate:50});
  s.accounts.push({id:'usd2',name:'دولار تاني',opening:0,scope:'me',atype:'bank',cur:'USD',openRate:50});return s;};
{ // ١) العملة بتظهر مع أي كارت مشتريات
  const {run,V}=boot(S());
  run("app.go('add');app.setKind('expense');app.shutRow('acct');app.setAccount('k2');");
  t('كارت تاني: اختيار العملة ظاهر', V().indexOf("app.setCur")>-1);
  run("app.setCur('USD');");t('وبيفضل بالدولار', run("draft.cur")==='USD'&&V().indexOf('id="usdhint"')>-1);
  run("app.setAccount('card');");t('من كارت لكارت: العملة زي ما هي', run("draft.cur")==='USD');
  run("app.setAccount('cash');");t('حساب مش كارت: بترجع جنيه ومفيش اختيار', run("draft.cur")==='EGP'&&V().indexOf("app.setCur")<0);
  const src=run("vAdd.toString()+app.setAccount.toString()+subDefAcc.toString()");
  t("مفيش id ثابت للكارت", src.indexOf("'card'")<0);
}
{ // ٢) التحويل بأكتر من رصيد الدولار
  const {run,V,B,els}=boot(S());
  run("app.go('add');draft.kind='income';render();app.shutRow('acct');app.setAccount('usd');app.dset('amount','100');app.saveEntry();");
  t('دخل 100 دولار', B('me','usd')===100);
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('cash');app.dset('amount','150');app.dset('toAmt','7500');app.setFxOf('income');");
  t('أكتر من الرصيد: الحفظ مقفول ورسالة', run('entryOk()')===false&&V().indexOf('أكتر من اللي في الحساب')>-1);
  run("app.saveEntry();");t('ومابيتسجلش', B('me','usd')===100&&run("D.txns.length")===1);
  run("app.dset('amount','100');app.dset('toAmt','5000');");t('قد الرصيد بالظبط: مفتوح', run('__yn(),entryOk()')===true);
  run("app.setTo('usd2');app.dset('amount','101');");
  t('لحساب بنفس العملة: برضو مقفول ورسالة', run('entryOk()')===false&&V().indexOf('id="fxoverhint"')>-1&&els['fxoverhint'].innerHTML.indexOf('أكتر من اللي في الحساب')>-1);
  run("app.setAccount('cash');app.setTo('cib');app.dset('amount','999999');");
  t('حسابات الجنيه زي ما هي', run('__yn(),entryOk()')===true);
}
{ // ٣) فرق العملة بيتحسب من جديد
  const {run,B}=boot(S());const g=q=>run("D.txns.find(x=>"+q+")");
  const inc=(amt,d)=>run("app.go('add');draft.kind='income';render();app.shutRow('acct');app.setAccount('usd');app.setDate('"+d+"');app.dset('amount','"+amt+"');app.saveEntry();");
  inc(100,'2026-09-10');
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('cash');app.setDate('2026-09-20');app.dset('amount','10');app.dset('toAmt','520');app.setFxOf('bought');app.saveEntry();");
  run("app.go('add');app.setKind('expense');app.setCat('eatout');app.shutRow('acct');app.setAccount('usd');app.setDate('2026-09-21');app.dset('amount','5');app.saveEntry();");
  run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('usd');app.setTo('usd2');app.setDate('2026-09-22');app.dset('amount','20');app.saveEntry();");
  const tid=g("x.to==='cash'&&x.toAmt").id, eid=g("x.kind==='expense'&&x.account==='usd'").id, xid=g("x.to==='usd2'").id;
  const st=()=>JSON.stringify([g("x.id==='"+tid+"'").fxGain,g("x.id==='"+eid+"'").egp,g("x.id==='"+xid+"'").egpv]);
  t('قبل: فرق 20، المصروف 250، التحويل 1000', st()==='[20,250,1000]', st());
  const cash0=B('me','cash'), usd0=B('me','usd');
  // تعديل من غير تغيير: ولا رقم بيتغير
  const iid=g("x.kind==='income'").id, before=run("JSON.stringify(dKey(JSON.stringify(D)))");
  run("app.go('log');app.toggleTxn('"+iid+"');app.startTxnEdit({stopPropagation(){}},'"+iid+"');app.saveEntry();");
  t('تعديل من غير تغيير: مفيش رقم اتغير', st()==='[20,250,1000]'&&B('me','usd')===usd0);
  // دخل بتاريخ قديم بسعر تاني: التكلفة بقت 55
  run("D.fx.rates.USD=60;");inc(100,'2026-09-12');
  t('دخل قديم بسعر 60: الفرق والتكلفة اتحسبوا من جديد', st()==='[-30,275,1100]', st());
  t('والأرصدة ماتغيرتش غير بالدخل', B('me','cash')===cash0&&B('me','usd')===usd0+100);
  // تعديل الدخل القديم: 100 → 300 (المتوسط 57.5)
  const nid=g("x.kind==='income'&&x.date==='2026-09-12'").id;
  run("app.go('log');app.toggleTxn('"+nid+"');app.startTxnEdit({stopPropagation(){}},'"+nid+"');app.dset('amount','300');app.saveEntry();");
  t('تعديل حركة قديمة: الفرق اتحسب من جديد', st()==='[-55,287.5,1150]', st());
  // مسحها يرجّع الأصل، والتراجع يرجّع اللي كان بالظبط
  const pre=run("JSON.stringify(dKey(JSON.stringify(D)))");
  const nid2=g("x.kind==='income'&&x.date==='2026-09-12'").id;
  run("app.delTxn({stopPropagation(){}},'"+nid2+"');");
  t('مسح الحركة القديمة: رجع الأصل', st()==='[20,250,1000]', st());
  run("app.undoLast();");
  t('التراجع بيرجّع البيانات بالظبط', run("JSON.stringify(dKey(JSON.stringify(D)))")===pre);
  // الإجمالي: مفيش فلوس ظهرت أو اختفت
  t('رصيد الدولار مظبوط', B('me','usd')===100+300-10-5-20&&B('me','usd2')===20);
}
done();
