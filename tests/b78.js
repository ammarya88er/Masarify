// دفعة الفحص ٢: الأرقام الغلط + فاوتشر لحد تاني + نوع الفلوس بين المكتب وبينك
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,21,9);
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'eatout',account:'cash',date:'2026-10-10'},o||{});
const E='({stopPropagation(){}})';

{ // ١ تحصيل فلوس في شهر بعد الصرفة: الشهر مايطلعش بالسالب
  const {run}=boot(seed({monthMode:'cal',txns:[ex('l1',500,{cat:'lentcat',date:'2026-09-20'}),ex('e1',100,{date:'2026-10-05'})],
    owed:[{id:'o1',who:'علي',amount:500,date:'2026-09-20',srcTxn:'l1',lent:true,cat:'lentcat'}]}),NOW);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],500,'cash','علي');save();");
  const c=JSON.parse(run("JSON.stringify(D.txns.find(x=>/تحصيل/.test(x.note)))"));
  t('التحصيل بتاريخ النهارده في السجل', c.date==='2026-10-21'&&run("sdBuild()['"+c.id+"']")==='2026-09-20');
  run("month='2026-10';");t('أكتوبر مش بالسالب', run("monthStats().spent")===100);
  run("month='2026-09';");t('سبتمبر: السلفة رجعت فبقت صفر', run("monthStats().spent")===0);
  t('ملخص الفترة زيه', run("periodSummary('2026-10-01','2026-10-31').spent")===100);
  t('الرصيد بتاريخه الحقيقي', run("balances('me').cash")===5000-500-100+500);
  // التحصيلات القديمة بتتظبط لوحدها
  const old=seed({txns:[ex('l1',300,{cat:'lentcat',date:'2026-09-02'}),ex('g1',-300,{cat:'lentcat',date:'2026-10-02',note:'تحصيل'})],
    owed:[{id:'o1',who:'علي',amount:300,date:'2026-09-02',srcTxn:'l1',got:true,gotAmount:300,gotTxns:['g1']}]});
  const r=boot(old,NOW);
  t('تحصيل قديم اتحسب في شهر الصرفة', r.run("sdBuild().g1")==='2026-09-02');
}
{ // ٢ مسح حساب: سلف العهدة مابتتمسحش
  const S=seed({txns:[ex('p1',200,{cat:'other'})],floatLoans:[{id:'f1',dir:'take',amount:600,date:'2026-10-01',srcTxn:'p1'},{id:'f2',dir:'back',amount:600,date:'2026-10-05'}]});
  const {run}=boot(S,NOW);
  const lb=run("loanBalance()");
  run("app.delAccount('cash');");
  t('رصيد السلف ماتغيرش بعد مسح الحساب', run("loanBalance()")===lb&&run("D.floatLoans.length")===2);
}
{ // ٣ إجمالي السجل زي الرئيسية لما فيه فاوتشر، والدخل مايعدّش اللي حد دفعه عنك
  const {run,V}=boot(seed({txns:[ex('v1',300,{voucher:{id:'x',amount:100}}),
    {id:'pb',book:'me',kind:'settle',dir:'in',amount:150,account:'cash',date:'2026-10-11',paidBy:'عمر',note:'عشا'},
    {id:'in',book:'me',kind:'income',amount:1000,account:'cash',date:'2026-10-12',icat:'other_in'}]}),NOW);
  run("month='2026-10';");
  const home=run("monthStats().spent");
  run("app.go('log');app.setF('month','2026-10');app.setF('dir','out');");
  t('مصروف السجل = الرئيسية (بالفاوتشر)', V().indexOf('مصروف <span class="n">'+home+'</span>')>-1&&V().indexOf('بفاوتشر')>-1, home);
  run("app.setF('dir','in');");
  t('دخل السجل = الرئيسية', V().indexOf('دخل <span class="n">1,000</span>')>-1&&run("monthStats().earned")===1000);
  t('واللي مش دخل مكتوب لوحده', V().indexOf('مش دخل')>-1);
}
{ // ٤ الخصم ونصيب الناس
  const {run}=boot(seed(),NOW);
  run("app.go('add');draft.kind='expense';draft.account='cash';draft.cat='eatout';draft.hasDisc=true;draft.discAmt='50';draft.amount='100';draft.owed=true;draft.owedKind='share';draft.owedPeople=[{name:'علي',amount:'80'}];");
  t('نصيب الناس أكبر من المبلغ بعد الخصم: مايتحفظش', run("entryOk0()")===false&&/أكتر من المبلغ/.test(run("owedHintTxt()")));
  run("draft.owedPeople[0].amount='30';");
  t('نصيبك المتوقع بعد الخصم', run("entryOk0()")===true&&/>20</.test(run("owedHintTxt()")));
  // مطابقة الفاتورة بالخصم
  const r=boot(seed({txns:[ex('sms',150,{account:'cib',needs:true,fromSms:true,cat:'other',date:'2026-10-20'})]}),NOW);
  t('الفاتورة بعد الخصم بتتطابق مع رسالة البنك', r.run("scanMatch([{amount:100},{amount:60}],'2026-10-20',10)")==='sms');
  r.run("scan={stage:'review',items:[{name:'أ',amount:100,cat:'food'},{name:'ب',amount:100,cat:'food',who:'علي'}],disc:'20',split:true,people:[{name:'سعيد',amount:'50'}],account:'cash',date:'2026-10-20'};");
  t('نصيبك من الخصم على قد أصنافك', r.run("scanMineNet()")===90&&r.run("scanMyShare()")===40);
  r.run("scan.people[0].amount='95';");
  t('تقسيم أكبر من نصيبك: الفاتورة ماتتحفظش', r.run("scanSaveOk0()")===false);
}
{ // ٥ اشتراك متقسم وعليه عرض: اللي على الناس مايعديش المدفوع
  const sub={id:'s1',name:'نت',amount:270,cur:'EGP',cycle:'monthly',next:'2026-10-21',account:'cash',cat:'subs',payments:[],dues:[],
    promo:{amount:110,left:1},people:[{name:'أ',amount:90},{name:'ب',amount:90}]};
  const {run}=boot(seed({subs:[sub]}),NOW);
  run("app.subCharged('s1');");
  const dues=run("D.subs[0].dues.reduce((a,d)=>a+d.amount,0)"), paid=run("D.txns[0].amount");
  t('نصيب الناس بنفس نسبة العرض', paid===110&&Math.abs(dues-73.34)<0.02, dues);
  // دفعة اتغير مبلغها من مكان تاني
  const r=boot(seed({subs:[Object.assign({},sub,{promo:undefined,people:[],payments:[{d:'2026-10-10',t:'x',paid:750}]})],txns:[ex('x',793.67,{cat:'subs'})]}),NOW);
  t('مبلغ الدفعة بقى زي حركتها', r.run("D.subs[0].payments[0].paid")===793.67);
}
{ // ٦ قسط سلفة مايتحولش لكارت من التعديل
  const S=seed({installments:[{id:'L1',name:'موبايل',monthly:1000,months:10,paid:2,day:5,account:'cash',covered:'2026-09',firstMonth:'2026-08',tail:0,payments:[],src:'office',from:'x',total:10000}]});
  const {run}=boot(S,NOW);
  run("app.startInsEdit('L1');iDraft.src='card';app.saveInsEdit('L1');");
  t('فضل سلفة', run("D.installments[0].src")==='office');
}
{ // ٧ فلوس المكتب في حساب شخصي: ظاهرة في الدفترين
  const {run,V}=boot(seed({txns:[{id:'x',book:'office',kind:'transfer',amount:300,account:'ocash',to:'cash',date:'2026-10-10'}]}),NOW);
  run("app.setBook('office');app.go('home');");
  t('الكاش الشخصي ظاهر في المكتب بفلوس المكتب اللي فيه', /كاش[\s\S]{0,400}فلوسك/.test(V())&&run("accountsShow('office').some(a=>a.id==='cash')"));
  run("app.setBook('me');app.go('home');");
  t('وفي فلوسي مكتوب جنبه عهدة المكتب', /عهدة المكتب <span class="n">300<\/span>/.test(V()));
}
{ // ٨ فاوتشر بتاع حد تاني
  const {run,V}=boot(seed({cardDigits:'111111',phone:'01000000000',vchAcct:'cib'}),NOW);
  run("app.go('wallet');wtab='vouchers';showVch=true;vchDraft={code:'123456789',amount:'200',expiry:'2026-12-31'};render();");
  t('سؤال «بتاع مين» بيبدأ فاضي ولازم يتجاوب', run("vchAddOk()")===false&&V().indexOf('الفاوتشر ده بتاع مين؟')>-1);
  run("app.vchWho('other');app.vchSet('oname','أحمد');app.vchSet('ophone','01222222222');app.vchSet('ocard','222222');app.addVch();");
  const v=JSON.parse(run("JSON.stringify(D.vouchers[0])"));
  t('اتسجل باسمه وموبايله وبطاقته', v.owner==='أحمد'&&v.phone==='01222222222'&&v.card==='222222');
  run("showVch=true;vchDraft={code:'987654321',amount:'100',expiry:'2026-12-31'};app.vchWho('other');app.vchOwnerPick('أحمد');");
  t('اسمه اتكتب تاني: موبايله وبطاقته اتملوا', run("vchDraft.ophone")==='01222222222'&&run("vchDraft.ocard")==='222222');
  run("app.addVch();");
  let txt='';run("navigator.share=async o=>{globalThis.__sh=o.text;};");
  run("app.shareVch(D.vouchers[0].id)");txt=run("globalThis.__sh||''");
  t('المشاركة ببياناته مش بياناتك', txt.indexOf('01222222222')>-1&&txt.indexOf('222222')>-1&&txt.indexOf('01000000000')<0);
  t('بيظهر في اختيار الفاوتشر في الفاتورة باسمه', /أحمد/.test(run("vchPicker('',500,'app.x')")));
  run("app.go('wallet');wtab='vouchers';render();");
  t('مكتوب في القايمة بتاع مين', V().indexOf('بتاع <bdi>أحمد</bdi>')>-1);
  run("showVch=true;vchDraft={code:'5555',amount:'50',expiry:'2026-12-31'};app.vchWho('me');app.addVch();");
  t('فاوتشرك بيفضل ببطاقتك', run("D.vouchers[2].card")==='111111'&&!run("D.vouchers[2].owner"));
}
{ // ٩ نوع الفلوس: كاش لكاش، بنك لبنك، محفظة لمحفظة
  const S=seed();S.accounts.push({id:'cash2',name:'كاش البيت',opening:100,scope:'me',atype:'cash'},{id:'vf',name:'فودافون كاش',opening:0,scope:'me',atype:'wallet'});
  const {run,V}=boot(S,NOW);
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('card');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oCardFrom('ocash');render();");
  const opts=run("JSON.stringify(kindList('ocash','').map(a=>a.id))");
  t('من كاش العهدة: حسابات الكاش بس', opts==='["cash","cash2"]', opts);
  t('والسؤال ظاهر لأن فيه أكتر من واحد', V().indexOf('ودخلت على أنهي حساب عندك؟')>-1&&V().indexOf('>حساب CIB<')<0);
  const r=boot(seed(),NOW);
  r.run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('card');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oCardFrom('ocash');render();");
  t('كاش واحد بس: اتختار لوحده والسؤال اختفى', r.run("draftO.cardTo")==='cash'&&r.V().indexOf('ودخلت على أنهي حساب عندك؟')<0&&r.V().indexOf('ودخلت على <b>كاش</b>')>-1);
  // مفيش حساب من النوع ده
  const S2=seed();S2.accounts=S2.accounts.filter(a=>a.id!=='cash');
  const q=boot(S2,NOW);
  q.run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('card');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oCardFrom('ocash');render();");
  t('مفيش كاش عندك: بيقولك بدل ما يعرض حسابات غلط', q.V().indexOf('مفيش عندك حساب كاش')>-1&&q.run("draftO.cardTo")===''&&q.run("oOk0()")===false);
}
{ // مراجعة: السجل مابيطلعش بالسالب بعد تحصيل، ولو تاريخ الصرفة اتغير التحصيل بيمشي معاها
  const {run,V}=boot(seed({monthMode:'cal',txns:[ex('l1',500,{cat:'lentcat',date:'2026-09-20'}),ex('e1',100,{date:'2026-10-05'})],
    owed:[{id:'o1',who:'علي',amount:500,date:'2026-09-20',srcTxn:'l1',lent:true,cat:'lentcat'}]}),NOW);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],500,'cash','علي');save();");
  run("app.go('log');app.setF('month','2026-10');app.setF('dir','out');");
  t('مصروف أكتوبر في السجل 100 زي الرئيسية', V().indexOf('مصروف <span class="n">100</span>')>-1&&V().indexOf('تحصيل لصرفة في شهر تاني')>-1&&V().indexOf('-400')<0);
  run("D.txns.find(x=>x.id==='l1').date='2026-08-20';");
  run("month='2026-09';");t('الصرفة اتنقلت لأغسطس: سبتمبر مش بالسالب', run("monthStats().spent")===0);
  run("month='2026-08';");t('وأغسطس فيه الصرفة والتحصيل', run("monthStats().spent")===0);
}
{ // مراجعة: الاسترداد بنوع الحساب اللي هتاخد منه
  const {run}=boot(seed({txns:[{id:'oe',book:'office',kind:'expense',amount:25000,account:'cib',date:'2026-10-10',item:'x',ocat:'c1'}]}),NOW);
  run("app.setBook('office');app.go('home');alertsOpen=true;app.startRefund('cib');app.toggleRefundPart('ocash',5000);render();");
  t('من كاش العهدة: بيدخل كاشك', run("refundTo")==='cash');
}
{ // مراجعة: تغيير الحساب وقت تعديل عملية مايسيبش حساب من نوع تاني
  const S=seed();S.accounts.push({id:'cash2',name:'كاش البيت',opening:0,scope:'me',atype:'cash'});
  const {run}=boot(S,NOW);
  run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('ocash');app.oSet('item','ورق');app.oCat(D.ocats[0].id);app.oSet('amount','100');app.oToMe(true);app.oTo('cash2');app.oSave();");
  const id=run("D.txns.find(x=>x.book==='office'&&x.kind==='expense').id");
  run("app.go('log');app.startTxnEdit("+E+",'"+id+"');app.oAccount('cib');render();");
  t('بقى من البنك: كاش البيت اتشال', run("draftO.to")==='cib');
}
{ // مراجعة: اسم تاني بعد ما بيانات حد اتملت
  const {run}=boot(seed({vouchers:[{id:'v0',code:'1',amount:10,expiry:'2026-12-31',owner:'أحمد',phone:'01222222222',card:'222222',added:'2026-10-01'}]}),NOW);
  run("vchDraft={code:'2',amount:'20',expiry:'2026-12-31',who:'other'};app.vchOwnerPick('أحمد');app.vchOwnerPick('محمود');");
  t('بيانات أحمد اتشالت', run("vchDraft.ophone")===''&&run("vchDraft.ocard")==='');
}
done();
