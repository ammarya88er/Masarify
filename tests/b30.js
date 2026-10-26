const {boot,seed,t,done}=require('./harness');
const snap=(run,B)=>({cash:B('me','cash'),cib:B('me','cib'),card:B('me','card'),ocib:B('office','cib'),loan:run('loanBalance()'),
  spent:run("Math.round(D.txns.filter(x=>(x.book||'me')==='me'&&x.kind==='expense').reduce((a,x)=>a+x.amount,0)*100)/100")});
function oexp(run,acc,extra){run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('"+acc+"');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','500');"+(extra||'')+"render();");}
{ // ٦٢–٦٥ شاشة المكتب
  const {run,B,V,doc}=boot(seed());
  oexp(run,'ocash');let v=V();
  const iD=v.indexOf('>التاريخ<'),iP=v.indexOf('اللي خرج من العهدة (لو مختلف)'),iM=v.indexOf('class="money"'),iMine=v.indexOf('فيه جزء من فلوسك');
  t('٦٢ «اللي خرج من العهدة» تحت التاريخ وقبل المبلغ', iD>-1&&iD<iP&&iP<iM&&iMine<iD, [iMine,iD,iP,iM].join());
  run("app.oSet('paid','510');");
  let x=doc.getElementById('opaidx').innerHTML;
  t('٦٤ الشرح وسؤال الفرق بيظهروا وانت بتكتب', x.indexOf('510')>-1&&x.indexOf('الفرق هيدخل على')>-1);
  run("app.oSet('amount','520');");x=doc.getElementById('opaidx').innerHTML;
  t('٦٤ بيتحدثوا لما المبلغ يتغير', x.indexOf('الفرق يدخل')<0&&x.indexOf('10')>-1&&x.indexOf('من فلوسك')>-1);
  oexp(run,'card',"app.oCardFrom('cib');app.oSet('paid','510');");v=V();
  t('٦٣ مع الكارت سطر شرح واحد للفرق', (v.match(/والفرق/g)||[]).length===1&&v.indexOf('الفرق يدخل على أنهي حساب')<0);
  t('٦٥ المبلغ في النص', /\.money input\{[^}]*padding:26px 60px;/.test(require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8')));
}
{ // الكارت وخدت أقل من المصروف
  const {run,B}=boot(seed());const a=snap(run,B);
  oexp(run,'card',"app.oCardFrom('cib');app.oSet('paid','450');");run("app.oSave();");const b=snap(run,B);
  t('كارت + أقل: الكارت −500، نصيبك +450، نصيب المكتب −450، المكتب عليه ليك 50', b.card===a.card-500&&b.cib===a.cib+450&&b.ocib===a.ocib-450&&b.loan===-50&&b.spent===a.spent, JSON.stringify([a,b]));
  t('مفيش حركة غلط على الكارت في دفتر المكتب', run("!D.txns.some(x=>x.book==='office'&&x.account==='card')"));
}
{ // من غير كارت: أقل من المصروف لسه شغال
  const {run,B}=boot(seed());const a=snap(run,B);
  oexp(run,'cib',"app.oSet('paid','450');app.oMine(true);app.oMineFrom('cash');");run("app.oSave();");
  t('من غير كارت: الفرق من فلوسك', run('loanBalance()')===-50);
}
{ // ٦٦ أنواع الدخل
  const {run,V}=boot(seed());
  t('الأنواع الأساسية موجودة', run("D.icats.map(c=>c.label).join()")==='مرتب,دخل تاني,فرق فلوس,عائد الشهادات');
  run("app.go('settings');app.toggleSet('cats');app.toggleSetSub('icats');");
  let v=V();t('صف أنواع الدخل في الإعدادات', v.indexOf('newicat')>-1&&v.indexOf("icatDel('salary')")<0&&v.indexOf("askDel('icatsalary')")<0);
  run("document.getElementById('newicat').value='تيب';app.icatAdd();");
  const tid=run("D.icats.find(c=>c.label==='تيب').id");
  t('اتضاف نوع جديد', !!tid);
  run("document.getElementById('newicat').value='تيب';app.icatAdd();");
  t('الاسم المكرر مرفوض', run("D.icats.filter(c=>c.label==='تيب').length")===1);
  run("app.go('add');draft.kind='income';render();");v=V();
  t('شاشة الدخل فيها الأنواع', v.indexOf('نوع الدخل')>-1&&v.indexOf('>تيب<')>-1);
  run("app.setIcat('"+tid+"');app.shutRow('acct');app.setAccount('cash');app.dset('amount','200');app.saveEntry();");
  t('الدخل اتسجل بالنوع ومش مرتب', run("(function(){const x=D.txns.find(x=>x.kind==='income'&&x.amount===200);return x&&x.icat==='"+tid+"'&&!x.salary;})()"));
  run("app.go('add');draft.kind='income';render();app.setIcat('salary');app.shutRow('acct');app.setAccount('cib');app.dset('amount','9000');app.saveEntry();");
  t('المرتب لسه بيتعلم salary', run("D.txns.some(x=>x.amount===9000&&x.salary&&!x.icat)"));
  // ٦٧ جه منين
  run("app.go('home');app.toggleIncs();");v=V();
  t('٦٧ «جه منين» بعد «راح فين»', v.indexOf('راح فين')<v.indexOf('جه منين')&&v.indexOf('نوعين')>-1&&v.indexOf('>تيب<')>-1&&v.indexOf('>مرتب<')>-1);
  // تعديل النوع
  const id=run("D.txns.find(x=>x.amount===200).id");
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('تعديل الحركة فيه نوع الدخل', V().indexOf('نوع الدخل')>-1);
  run("app.setIcat('salary');app.saveEntry();");
  t('غيّرت النوع لمرتب', run("(function(){const x=D.txns.find(x=>x.id==='"+id+"');return x.salary===true&&!x.icat;})()"));
  run("app.go('log');app.toggleTxn('"+id+"');app.startTxnEdit({stopPropagation(){}},'"+id+"');app.setIcat('"+tid+"');app.saveEntry();");
  t('ورجعته تيب', run("(function(){const x=D.txns.find(x=>x.id==='"+id+"');return !x.salary&&x.icat==='"+tid+"';})()"));
  // مسح النوع
  run("app.go('settings');app.toggleSet('cats');app.toggleSetSub('icats');app.icatDel('"+tid+"');");
  t('مسح النوع يرجع الحركة «دخل تاني»', run("(function(){const x=D.txns.find(x=>x.id==='"+id+"');return !x.icat&&icatOf(x).id==='other_in';})()"));
  // إعادة التسمية
  run("app.catEditOpen('i','other_in');app.catEditSet('مصادر تانية');app.catEditSave();");
  t('إعادة تسمية نوع', run("icatOf({}).label")==='مصادر تانية');
  // ٦٨ السجل بالأيام
  run("app.go('log');");v=V();
  t('٦٨ السجل متقسم بالأيام', (v.match(/class="dayh"/g)||[]).length>=1&&v.indexOf('دخل <span class="n">9,200')>-1, (v.match(/class="dayh">[\s\S]{0,200}/)||[''])[0]);
  run("app.setF('dir','in');");v=V();
  t('فلتر الداخل بيعرض الأنواع', v.indexOf('كل الأنواع')>-1);
  run("app.setF('cat','salary');");v=V();
  t('فلتر المرتب بس', v.indexOf('9,000')>-1&&v.indexOf('>+200<')<0&&v.indexOf('+200')<0);
}
done();
