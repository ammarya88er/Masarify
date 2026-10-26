// الدفعة ٣: الفاتورة، فلوس عند الناس، الكارت، المسح، الجمعية، النسخة الاحتياطية، المزامنة
const {boot,seed,t,done,r2}=require('./harness');
const scanSet=(run,items,extra)=>run("app.go('scan');app.manualBill();scan.items="+JSON.stringify(items)+";Object.assign(scan,"+JSON.stringify(Object.assign({account:'cash',merchant:'محل',date:'2026-09-25',ocat:'c1',oitem:'ورق'},extra||{}))+");app.saveReceipt();");
{ // ١ الخصم بيتوزع على أصنافك وأصناف المكتب
  const {run}=boot(seed());
  scanSet(run,[{name:'شاي',amount:20,cat:'other'},{name:'ورق',amount:100,cat:'other',off:true}],{disc:'30'});
  const me=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.book==='me'))")), of=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.book==='office'))"));
  t('مصروفك 15 والمكتب 75 (الخصم 30 بالنسبة)', me.amount===15&&of.amount===75, me.amount+' / '+of.amount);
}
{ // ٢ الفاوتشر بيغطي الفاتورة كلها
  const {run,B}=boot(seed({vouchers:[{id:'v1',code:'123456',amount:100,used:false}]}));
  const c0=B('me','cash');
  scanSet(run,[{name:'شاي',amount:40,cat:'other'},{name:'ورق',amount:100,cat:'other',off:true}],{voucherId:'v1'});
  const me=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.book==='me'))"));
  t('الفاوتشر كله اتحسب (100)', me.voucher&&me.voucher.amount===100);
  t('مصروفك في التصنيف 40 بس', r2(run("mySpend(D.txns.find(x=>x.book==='me'))"))===40);
  t('الكاش خرج منه 40 بس في الفاتورة كلها', r2(B('me','cash')+B('office','cash')-c0)===-40, B('me','cash')+B('office','cash')-c0);
}
{ // ٣ صنف لحد تاني: «فلوس عند الناس» من الأول
  const {run}=boot(seed());
  scanSet(run,[{name:'شاي',amount:20,cat:'other'},{name:'كوكا',amount:15,cat:'other',who:'هاجر'}]);
  const b=JSON.parse(run("JSON.stringify(breakdown(D.txns[0]))"));
  t('الكوكا راحت فلوس عند الناس', b[1].cat==='lentcat'&&b[1].amount===15);
  run("collectOwed([{src:'owed',ref:D.owed[0]}],15,'cash','هاجر');");
  t('ولما دفعت: «فلوس عند الناس» بقت صفر', r2(D_lent(run))===0);
}
function D_lent(run){return run("D.txns.filter(x=>x.kind==='expense').reduce((a,x)=>a+breakdown(x).filter(p=>p.cat==='lentcat').reduce((s,p)=>s+p.amount,0),0)");}
{ // ٤ فاتورة متقسمة مع حد: نصيبه بيتشال من كل التصنيفات بالنسبة
  const {run}=boot(seed());
  scanSet(run,[{name:'خضار',amount:100,cat:'food'},{name:'مواصلات',amount:100,cat:'transport'}],{split:true,people:[{name:'علي',amount:'100'}]});
  const b=JSON.parse(run("JSON.stringify(breakdown(D.txns[0]))"));
  t('خضار 50 ومواصلات 50 وعلي 100', r2(b[0].amount)===50&&r2(b[1].amount)===50&&b[2].cat==='lentcat'&&r2(b[2].amount)===100, JSON.stringify(b));
}
{ // ٥ «كلها ليا عند حد» لأكتر من شخص، وبالدولار، وبخصم
  const {run}=boot(seed());
  run("app.go('add');app.setKind('expense');app.setAccount('cash');app.dset('amount','1000');app.setOwed(true);draft.owedKind='lent';draft.owedPeople=[{name:'علي',amount:''},{name:'منى',amount:''}];app.saveEntry();");
  t('اتقسمت 500 و500', JSON.stringify(JSON.parse(run("JSON.stringify(D.owed.map(o=>o.amount))")))==='[500,500]');
  run("D.owed=[];D.txns=[];app.go('add');app.setKind('expense');app.setAccount('cash');app.dset('amount','1000');app.setOwed(true);draft.owedKind='lent';draft.owedPeople=[{name:'علي',amount:'300'},{name:'منى',amount:''}];app.saveEntry();");
  t('علي 300 ومنى الباقي 700', run("D.owed.map(o=>o.amount).join()")==='300,700');
  run("D.owed=[];D.txns=[];app.go('add');app.setKind('expense');app.setAccount('cash');app.dset('amount','1000');draft.hasDisc=true;draft.discAmt='200';app.setOwed(true);draft.owedKind='lent';draft.owedPeople=[{name:'علي',amount:''}];app.saveEntry();");
  t('بخصم: عليه 800 مش 1000', run("D.owed[0].amount")===800);
  run("D.owed=[];D.txns=[];app.go('add');app.setKind('expense');app.setAccount('card');draft.cur='USD';app.dset('amount','20');app.setOwed(true);draft.owedKind='lent';draft.owedPeople=[{name:'علي',amount:''}];app.saveEntry();");
  t('بالدولار: عليه 1000 جنيه مش 20', run("D.owed[0].amount")===1000, run("D.owed[0].amount"));
}
{ // ٦ تغيير حد الكارت مايغيّرش اللي عليك
  const {run}=boot(seed({txns:[{id:'e',book:'me',kind:'expense',amount:1000,cat:'other',account:'card',date:'2026-09-20'}]}));
  t('عليك 1000', run("cardDebt(D.accounts.find(a=>a.id==='card'))")===1000);
  run("app.openAccCfg('card');accCfg.card.limit='50000';app.saveAccount('card');");
  t('بعد ما الحد بقى 50 ألف: لسه عليك 1000', run("cardDebt(D.accounts.find(a=>a.id==='card'))")===1000&&run("D.accounts.find(a=>a.id==='card').limit")===50000);
}
{ // ٧ مسح حساب بيسيب حركات الحسابات التانية
  const S=seed({txns:[{id:'x1',book:'me',kind:'transfer',amount:300,account:'cash',to:'w',date:'2026-09-20'},
    {id:'x2',book:'me',kind:'transfer',amount:100,account:'w',to:'cib',date:'2026-09-21'},
    {id:'x3',book:'me',kind:'expense',amount:50,cat:'other',account:'w',date:'2026-09-22'}]});
  S.accounts.push({id:'w',name:'محفظة',opening:0,scope:'me',atype:'wallet'});
  const {run,B}=boot(S);
  const c=B('me','cash'),b=B('me','cib');
  run("app.delAccount('w');");
  t('الكاش والبنك زي ما هم', B('me','cash')===c&&B('me','cib')===b);
  t('حركة المحفظة لوحدها اتمسحت', run("D.txns.length")===2&&!run("D.txns.some(x=>x.id==='x3')"));
}
{ // ٨ مسح تصنيف: فلوس الناس عليه بتتنقل
  const S=seed({owed:[{id:'o',amount:50,who:'علي',date:'2026-09-20',cat:'k1',got:false}]});
  S.cats=[{id:'k1',label:'جديد',color:'#fff'},{id:'other',label:'أخرى',color:'#000'},{id:'lentcat',label:'فلوس عند الناس',color:'#999'}];
  const {run}=boot(S);
  run("app.delCat('k1');");
  t('اتنقلت لـ«أخرى»', run("D.owed[0].cat")==='other');
  const {run:r2b}=boot(seed({txns:[{id:'o1',book:'office',kind:'expense',amount:100,account:'ocash',date:'2026-09-22',item:'ورق',note:'ورق',ocat:'c1'}]}));
  r2b("app.ocatDel('c1');");
  t('تصنيف مكتب اتمسح: مصاريفه راحت «أخرى»', r2b("ocatOf(D.txns[0].ocat).label")==='أخرى');
}
{ // ٩ الجمعية: الأقساط اللي قبل البرنامج مابتتحسبش مرتين
  const g={id:'g',name:'جمعية',role:'member',amount:1000,months:10,start:'2026-07',turn:10,prePaid:2,payMode:'day',day:5,col:{}};
  const {run}=boot(seed({gams:[g],txns:[{id:'p1',book:'me',kind:'settle',dir:'out',amount:1000,account:'cash',date:'2026-07-05',gam:'g',gk:1},
    {id:'p2',book:'me',kind:'settle',dir:'out',amount:1000,account:'cash',date:'2026-08-05',gam:'g',gk:2}]}));
  t('المدفوع 2000 مش 4000', run("gamPaid(D.gams[0])")===2000&&run("gamNext(D.gams[0])")===3);
}
{ // ١٠ كاش العهدة وفودافون كاش مابيرجعوش بعد المسح
  const S=seed();S.accounts=S.accounts.filter(a=>a.id!=='ocash');S._ocash1=1;S._vcash1=1;
  const {run}=boot(S);
  t('مارجعوش', !run("D.accounts.some(a=>a.id==='ocash'||a.id==='vcash')"));
}
{ // ١١ تاريخ النسخة الاحتياطية بيتسجل بس لما تتحفظ فعلًا
  const {run}=boot(seed({lastBackup:'2026-09-01'}));
  run("navigator.canShare=()=>true;navigator.share=()=>Promise.reject(Object.assign(new Error('x'),{name:'AbortError'}));File=function(){};");
  run("app.exportData()");
  setTimeout(()=>{
    t('لغيت: التاريخ زي ما هو', run("D.lastBackup")==='2026-09-01');
    // ١٢ اسم الفاتورة في التراجع
    const r=boot(seed());
    scanSet(r.run,[{name:'شاي',amount:20,cat:'other'},{name:'سكر',amount:30,cat:'other'}]);
    t('«سجّلت فاتورة · صنفين»', r.run("lastUndo&&lastUndo.label")==='سجّلت فاتورة · صنفين', r.run("lastUndo&&lastUndo.label"));
    done();
  },20);
}
