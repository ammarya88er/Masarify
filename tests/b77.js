// دفعة الفحص ١: المزامنة، الاسترجاع، المسح، التصنيفات، قفل الفترة، التكرار، التراجع
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,18,9);
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date:'2026-10-10'},o||{});
const ox=(id,amount,o)=>Object.assign({id,book:'office',kind:'expense',amount,account:'ocash',date:'2026-10-10',item:'بند',ocat:'c1'},o||{});
const E='({stopPropagation(){}})';

function device(gist,data,onPatch){
  const d=boot(data,NOW);
  d.run("ghToken='tok';ghGist='g1';");
  d.ctx=d.run('globalThis');
  d.ctx.fetch=async(url,opts)=>{
    opts=opts||{};
    if((opts.method||'GET')==='PATCH'){gist.content=JSON.parse(opts.body).files['masareef-data.json'].content;gist.patches++;
      if(onPatch)onPatch(d);
      return {ok:true,json:async()=>({})};}
    return {ok:true,json:async()=>({files:gist.content?{'masareef-data.json':{content:gist.content}}:{}})};
  };
  return d;
}
const ids=s=>JSON.parse(s).txns.map(x=>x.id).sort().join(',');

(async()=>{
  { // ١ حركة اتسجلت والمزامنة شغالة: ماتضيعش
    const base=seed({txns:[ex('a0',10)]});
    const gist={content:JSON.stringify(base),patches:0};
    let once=false;
    const A=device(gist,JSON.parse(JSON.stringify(base)),d=>{if(once)return;once=true;
      d.run("D.txns.unshift({id:'mid',book:'me',kind:'expense',amount:7,cat:'other',account:'cash',date:'2026-10-18'});save();");});
    A.run("D.txns.unshift({id:'n1',book:'me',kind:'expense',amount:5,cat:'other',account:'cash',date:'2026-10-18'});save();");
    await A.run("ghSync()");
    t('الحركة اللي اتسجلت وقت الرفع لسه موجودة', A.run("D.txns.some(x=>x.id==='mid')")===true);
    await A.run("ghSync()");
    t('ووصلت GitHub', ids(gist.content).indexOf('mid')>-1, ids(gist.content));
  }
  { // ٢ الأساس بيفضل لو فصلت ورجعت نفس الحساب، ومايتاخدش مع حساب تاني
    const {run}=boot(seed(),NOW);
    run("ghGist='g1';ghSetBase({txns:[{id:'x'}]});");
    t('الأساس متخزن', run("ghBase()&&ghBase().txns[0].id")==='x');
    run("ghGist='g2';");t('حساب تاني: مفيش أساس', run("ghBase()")===null);
    run("ghGist='g1';");t('رجعت نفس الحساب: الأساس رجع', run("ghBase()&&ghBase().txns[0].id")==='x');
    run("localStorage.setItem(BASEKEY,JSON.stringify({txns:[{id:'old'}]}));");
    t('الأساس القديم (من غير حساب) لسه بيتقري', run("ghBase().txns[0].id")==='old');
  }
  { // ٣ أول توصيل من غير أساس: كل القوايم بتتدمج مش الحركات بس
    const {run}=boot(seed(),NOW);
    const m=JSON.parse(run(`JSON.stringify(syncMerge(null,{_sv:0,txns:[{id:'l1',kind:'expense'}],subs:[{id:'s1',name:'A'}]},
      {_sv:3,txns:[{id:'r1',kind:'expense'}],subs:[{id:'s2',name:'B'}]}))`));
    t('الحركات من الناحيتين', m.txns.map(x=>x.id).sort().join()==='l1,r1');
    t('والاشتراكات من الناحيتين', m.subs.map(x=>x.id).sort().join()==='s1,s2');
  }
  { // ٤ مسح البيانات بيفصل المزامنة الأول
    const {run}=boot(seed({txns:[ex('a',5)]}),NOW);
    run("ghToken='tok';ghGist='g1';localStorage.setItem(GKEY,'tok');localStorage.setItem(GIDKEY,'g1');app.wipe();");
    t('المزامنة اتفصلت', run("ghToken")===''&&run("ghGist")===''&&run("localStorage.getItem(GKEY)")===null);
    t('البيانات اتمسحت', run("D.txns.length")===0);
  }
  { // ٥ ملف استرجاع بايظ: بياناتك زي ما هي
    const {run}=boot(seed({txns:[ex('keep',5)]}),NOW);
    run("alert=()=>{};");
    for(const bad of ['{"accounts":5,"txns":[]}','{"accounts":[],"txns":[{"id":"x"}]}','not json','{"txns":[]}']){
      run("FileReader=function(){this.readAsText=()=>{this.result="+JSON.stringify(bad)+";this.onload();};};");
      run("app.importData({files:[{}],value:''})");
      t('ملف بايظ ماغيّرش حاجة: '+bad.slice(0,20), run("D.txns.map(x=>x.id).join()")==='keep');
    }
  }
  { // ٦ تصنيف اتمسح مايرجعش، واسم اتغير مايرجعش
    const {run}=boot(seed(),NOW);
    t('التصنيفات اتضافت أول مرة', run("D.cats.some(c=>c.id==='fuel')")===true&&run("D._cats2")===1);
    run("D.cats=D.cats.filter(c=>c.id!=='fuel'&&c.id!=='donation');D.cats.find(c=>c.id==='transport').label='مواصلات وبنزين';save();");
    const r=boot(JSON.parse(run("localStorage.getItem('masareef:v3')")),NOW);
    t('التصنيف الممسوح مارجعش', r.run("D.cats.some(c=>c.id==='fuel'||c.id==='donation')")===false);
    t('الاسم اللي اخترته فضل', r.run("D.cats.find(c=>c.id==='transport').label")==='مواصلات وبنزين');
    const old=seed();delete old.cats;
    const r2=boot(old,NOW);
    t('بيانات من غير تصنيفات: بتتعمل عادي', r2.run("D.cats.some(c=>c.id==='installment')")===true);
  }
  { // ٧ عملية متربطة: جهاز مسحها والتاني عدّل جزء منها — بترجع كاملة
    const {run}=boot(seed(),NOW);
    const base={_sv:1,txns:[{id:'a',link:'L',book:'me',kind:'expense',amount:5},{id:'b',link:'L',book:'office',kind:'expense',amount:5},{id:'z',kind:'expense',amount:1}]};
    const local={_sv:2,txns:[{id:'z',kind:'expense',amount:1}]};
    const remote={_sv:3,txns:[{id:'a',link:'L',book:'me',kind:'expense',amount:5,note:'اتعدلت'},{id:'b',link:'L',book:'office',kind:'expense',amount:5},{id:'z',kind:'expense',amount:1}]};
    const m=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(base)+","+JSON.stringify(local)+","+JSON.stringify(remote)+"))"));
    t('العملية رجعت كاملة (السطرين)', m.txns.map(x=>x.id).sort().join()==='a,b,z', m.txns.map(x=>x.id).join());
    // مسح عادي من غير تعديل في الناحية التانية: بيتمسح كله
    const m2=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(base)+","+JSON.stringify(local)+","+JSON.stringify(base)+"))"));
    t('المسح من غير تعديل: اتمسحت كلها', m2.txns.map(x=>x.id).join()==='z');
    // سطر اتشال من العملية وقت تعديل (الناحية التانية لسه عندها العملية): ده تعديل عادي
    const l3={_sv:2,txns:[{id:'a',link:'L',book:'me',kind:'expense',amount:5},{id:'z',kind:'expense',amount:1}]};
    const m3=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(base)+","+JSON.stringify(l3)+","+JSON.stringify(base)+"))"));
    t('سطر اتشال وقت التعديل: مايرجعش', m3.txns.map(x=>x.id).sort().join()==='a,z');
    // سجل فلوس عند حد مربوط بحركة اتمسحت هناك
    const b4={_sv:1,txns:[{id:'p',kind:'expense',amount:50}],owed:[{id:'o1',srcTxn:'p',amount:20}]};
    const l4={_sv:2,txns:[],owed:[]};
    const r4={_sv:3,txns:[{id:'p',kind:'expense',amount:50}],owed:[{id:'o1',srcTxn:'p',amount:20,got:true}]};
    const m4=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(b4)+","+JSON.stringify(l4)+","+JSON.stringify(r4)+"))"));
    t('الحركة رجعت مع السجل المربوط بيها', m4.txns.some(x=>x.id==='p')&&m4.owed.length===1);
    // تقفيلة لنفس الفترة من جهازين: واحدة بس
    const b5={_sv:1,txns:[],closings:[],lastClose:''};
    const l5={_sv:2,txns:[{id:'s1',closeSet:true,kind:'settle',book:'office'}],closings:[{id:'c1',from:'2026-10-01',to:'2026-10-16',settleIds:['s1']}],lastClose:'2026-10-16'};
    const r5={_sv:3,txns:[{id:'s2',closeSet:true,kind:'settle',book:'office'}],closings:[{id:'c2',from:'2026-10-01',to:'2026-10-16',settleIds:['s2']}],lastClose:'2026-10-16'};
    const m5=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(b5)+","+JSON.stringify(l5)+","+JSON.stringify(r5)+"))"));
    t('التقفيلة ماتكررتش', m5.closings.length===1&&m5.txns.length===1, JSON.stringify(m5.closings));
  }
  { // ٨ قفل الفترة على العملية كلها
    const S=seed({lastClose:'2026-10-16',closings:[{id:'k',from:'2026-10-01',to:'2026-10-16'}],
      txns:[ox('o1',100,{link:'L1',date:'2026-10-12'}),ex('m1',100,{link:'L1',kind:'income',date:'2026-10-17',fromOffice:true}),ex('free',30,{date:'2026-10-17'})]});
    const {run,V}=boot(S,NOW);
    run("app.delTxn("+E+",'m1');");
    t('الجزء الشخصي من عملية متقفلة مااتمسحش', run("D.txns.some(x=>x.id==='m1')")===true&&run("D.txns.some(x=>x.id==='o1')")===true);
    run("app.startTxnEdit("+E+",'m1');");
    t('ولا بيفتح التعديل', run("eTxn")===null&&run("editOp")===null);
    run("app.go('log');openTxn='m1';render();");
    t('مكتوب إنها جوه فترة متقفلة', V().indexOf('الحركة دي جوه فترة متقفلة')>-1);
    t('بس نوع الدخل لسه بيتغير', V().indexOf("app.setTxnIcat('m1'")>-1);
    run("app.delTxn("+E+",'free');");
    t('الحركة العادية بتتمسح عادي', run("D.txns.some(x=>x.id==='free')")===false);
    // تسجيل في المكتب بتاريخ متقفل
    run("book='office';draftO=newDraftO();draftO.kind='expense';draftO.item='ورق';draftO.amount='50';draftO.account='ocash';draftO.date='2026-10-15';draftO.ocat='c1';");
    const n0=run("D.txns.length");run("app.oSave()");
    t('مصروف مكتب بتاريخ متقفل مااتسجلش', run("D.txns.length")===n0);
    run("app.go('add');render();");
    t('خانة التاريخ ليها حد أدنى', V().indexOf('min="2026-10-17"')>-1);
    // تعديل حركة شخصية عادية بتاريخ قديم: مسموح
    run("app.startTxnEdit("+E+",'m1');");
  }
  { // ٩ التقفيل: مش لتاريخ جاي، ومش لفترة فاضية
    const S=seed({txns:[ox('o1',100,{date:'2026-10-12'})]});
    const {run}=boot(S,NOW);
    run("closeTo='2026-10-25';");t('تاريخ جاي مرفوض', /لسه ماجاش/.test(run("closeWhy()")));
    run("closeTo='2026-10-05';");t('فترة مفيهاش حركات مرفوضة', /مفيش ولا حركة/.test(run("closeWhy()")));
    run("closeTo='2026-10-12';");t('فترة فيها حركة: تمام', run("closeWhy()")==='');
    run("closeTo='2026-10-25';closeMode='carry';app.closePeriod();");
    t('التقفيل لتاريخ جاي مااتعملش', run("(D.closings||[]).length")===0);
  }
  { // ١٠ تظبيط رصيد المكتب بعد التقفيل: سطر بتاريخ النهارده، الافتتاحي زي ما هو
    const S=seed({lastClose:'2026-10-16',closings:[{id:'k',from:'2026-10-01',to:'2026-10-16'}],txns:[ox('o1',100,{date:'2026-10-12'})]});
    const {run,els}=boot(S,NOW);
    const before=run("officeReport('2026-10-01','2026-10-16').result");
    els['obalin']={value:'3500'};
    const cur=run("balances('office').ocash");
    run("app.setOfficeBalance('ocash',"+cur+")");
    t('الافتتاحي ماتغيرش', run("D.accounts.find(a=>a.id==='ocash').openingOffice")===3000);
    t('الرصيد بقى زي ما كتبت', Math.round(run("balances('office').ocash")*100)/100===3500);
    t('سطر التظبيط بتاريخ النهارده', run("D.txns.some(x=>x.adj&&x.date==='2026-10-18'&&x.book==='office')")===true);
    t('تقرير الفترة المتقفلة ماتغيرش', run("officeReport('2026-10-01','2026-10-16').result")===before);
    const S2=seed({txns:[]});const b=boot(S2,NOW);b.els['obalin']={value:'2500'};
    b.run("app.setOfficeBalance('ocash',3000)");
    t('قبل أي تقفيل: الافتتاحي بيتظبط زي الأول', b.run("D.accounts.find(a=>a.id==='ocash').openingOffice")===2500&&b.run("D.txns.length")===0);
  }
  { // ١١ فاتورة لخصم من غير تفاصيل: التنقل مايضيعش الربط
    const {run}=boot(seed({txns:[ex('need',120,{needs:true,fromSms:true,account:'cib'})]}),NOW);
    run("needsTxn='need';scan={stage:'review',items:[{name:'لبن',amount:120,cat:'food'}],merchant:'سوبر',date:'2026-10-10',account:'cib',err:'',voucherId:'',voucherAmt:''};app.go('log');app.go('scan');");
    t('الربط فضل بعد التنقل', run("needsTxn")==='need');
    run("app['saveReceipt']()");
    t('الفاتورة اتربطت بالخصم ومااتكررتش', run("D.txns.filter(x=>x.book!=='office').length")===1&&run("D.txns[0].items.length")===1);
  }
  { // ١٢ اشتراك «اتخصم» بعد ما رسالة البنك اتسجلت: مايتكررش، والتراجع مايمسحش الرسالة
    const sub={id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-17',account:'cib',cat:'subs',payments:[],dues:[]};
    const {run}=boot(seed({subs:[sub],txns:[ex('sms',300,{account:'cib',date:'2026-10-17',fromSms:true,needs:true,note:'خصم'})]}),NOW);
    run("app.subCharged('s1');");
    t('اتربط برسالة البنك', run("D.txns.length")===1&&run("D.subs[0].payments[0].t")==='sms'&&run("D.txns[0].cat")==='subs'&&run("D.txns[0].needs")===undefined);
    run("app.undoSubPay('s1');");
    t('التراجع: الرسالة فضلت ورجعت زي ما كانت', run("D.txns.length")===1&&run("D.txns[0].cat")==='other'&&run("D.txns[0].needs")===true&&run("D.txns[0].note")==='خصم');
    t('والاشتراك رجع مستني ومش هيتسجل لوحده', run("D.subs[0].next")==='2026-10-17');
    // دفعة اتسجلت بإيدك والرسالة جت بعدها
    const r=boot(seed({subs:[sub]}),NOW);
    r.run("paySubDate='2026-10-17';app.confirmPaySub('s1');");
    const tid=r.run("D.txns[0].id");
    t('الرسالة اللي بعدها لقت الدفعة', r.run("subPaidTwin('cib',300,'2026-10-18')&&subPaidTwin('cib',300,'2026-10-18').id")===tid);
    t('ومش بتلاقي دفعة مبلغها مختلف', r.run("subPaidTwin('cib',299,'2026-10-18')")===null);
  }
  { // ١٣ زرار التراجع بيتبع آخر حاجة اتعملت
    const sub={id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-25',account:'cib',cat:'subs',payments:[],dues:[]};
    const {run}=boot(seed({subs:[sub],txns:[ex('a',5)]}),NOW);
    run("app.delTxn("+E+",'a');");
    t('التراجع على المسح', /مسحت/.test(run("lastUndo&&lastUndo.label")));
    run("app.delSub('s1');");
    t('مسح الاشتراك بقى هو آخر حاجة', run("lastUndo&&lastUndo.label")==='مسحت اشتراك');
    run("app.undoLast();");
    t('التراجع رجّع الاشتراك والحركة لسه ممسوحة', run("D.subs.length")===1&&run("D.txns.some(x=>x.id==='a')")===false);
  }
  { // مراجعة: عملية اترفضت بسبب التقفيل ماترجعش بعد ما تفتح البرنامج تاني
    const S=seed({lastClose:'2026-10-16',closings:[{id:'k',from:'2026-10-01',to:'2026-10-16'}],txns:[ox('o1',100,{date:'2026-10-12'})]});
    const {run}=boot(S,NOW);
    run("book='me';draft=newDraft();draft.kind='transfer';draft.swap=true;draft.amount='200';draft.account='cash';draft.date='2026-10-14';");
    const n0=run("D.txns.length");run("app.saveEntry()");
    const stored=JSON.parse(run("localStorage.getItem('masareef:v3')")).txns.length;
    t('المرفوضة مااتحفظتش لا في الذاكرة ولا في التخزين', run("D.txns.length")===n0&&stored===n0, stored);
  }
  { // مراجعة: تراجع دفعة اتربطت برسالة بعد ما البرنامج اتفتح تاني
    const sub={id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-17',account:'cib',cat:'subs',payments:[],dues:[]};
    const a=boot(seed({subs:[sub],txns:[ex('sms',300,{account:'cib',date:'2026-10-17',fromSms:true,needs:true,note:'خصم'})]}),NOW);
    a.run("app.subCharged('s1');");
    const b=boot(JSON.parse(a.run("localStorage.getItem('masareef:v3')")),NOW);
    b.run("app.undoSubPay('s1');");
    t('بعد ما اتفتح تاني: الرسالة رجعت زي ما كانت', b.run("D.txns[0].cat")==='other'&&b.run("D.txns[0].note")==='خصم'&&b.run("D.txns[0].needs")===true);
  }
  { // مراجعة: نفس الرسالة اتلزقت مرتين بعد دفعة اشتراك بإيدك
    const sub={id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-17',account:'cib',cat:'subs',payments:[],dues:[]};
    const {run}=boot(seed({subs:[sub]}),NOW);
    run("paySubDate='2026-10-17';app.confirmPaySub('s1');");
    run("readSms=async()=>({ops:[{kind:'expense',amount:300,account:'cib',date:'2026-10-17',place:'WE'}]});");
    await run("sms={busy:false,err:''};app.readSmsNow&&app.readSmsNow('x')");
    await run("app.readSmsNow&&app.readSmsNow('x')");
    t('مااتسجلتش ولا مرة', run("D.txns.length")===1&&run("D.txns[0].smsSeen")==='WE|2026-10-17', run("D.txns.length"));
  }
  { // مراجعة: العملية اللي رجعت بالمزامنة بترجع معاها سجلاتها وخاناتها
    const {run}=boot(seed(),NOW);
    const T=[{id:'a',op:'P',book:'me',kind:'expense',amount:50},{id:'b',op:'P',book:'me',kind:'expense',amount:5}];
    const base={_sv:1,txns:T,owed:[{id:'o1',op:'P',srcTxn:'a',amount:20}],ops:{P:{f:'entry',d:{}}}};
    const local={_sv:2,txns:[],owed:[],ops:{}};
    const remote={_sv:3,txns:[Object.assign({},T[0],{icat:'x'}),T[1]],owed:[{id:'o1',op:'P',srcTxn:'a',amount:20}],ops:{P:{f:'entry',d:{}}}};
    const m=JSON.parse(run("JSON.stringify(syncMerge("+JSON.stringify(base)+","+JSON.stringify(local)+","+JSON.stringify(remote)+"))"));
    t('السطور والسجل وخانات العملية رجعوا', m.txns.length===2&&m.owed.length===1&&!!(m.ops&&m.ops.P), JSON.stringify(m));
  }
  { // مراجعة: مسح حركة جزء منها اتحصّل، والمزامنة مابترجعهاش
    const {run}=boot(seed({txns:[ex('p',100)],owed:[{id:'o1',srcTxn:'p',amount:40,who:'علي',gotAmount:10,date:'2026-10-10'}]}),NOW);
    run("app.delTxn("+E+",'p');");
    t('السجل فضل من غير ربط بالحركة الممسوحة', run("D.owed.length")===1&&run("D.owed[0].srcTxn")===undefined);
  }
  done();
})();
