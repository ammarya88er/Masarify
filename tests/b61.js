// الدفعة ١: المزامنة بالدمج، الاسترجاع، المرتجع في التعديل، تاريخ الجهاز، رسايل البنك، تصنيفات الدخل
const {boot,seed,t,done}=require('./harness');
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date:'2026-09-20'},o||{});

/* جهاز وهمي متوصل بـ gist وهمي مشترك */
function device(gist,data,now){
  const d=boot(data,now);
  d.run("ghToken='tok';ghGist='g1';");
  d.gist=gist;
  d.ctx=d.run('globalThis');
  d.ctx.fetch=async(url,opts)=>{
    opts=opts||{};
    if((opts.method||'GET')==='PATCH'){gist.content=JSON.parse(opts.body).files['masareef-data.json'].content;gist.patches++;
      return {ok:true,json:async()=>({})};}
    return {ok:true,json:async()=>({files:gist.content?{'masareef-data.json':{content:gist.content}}:{}})};
  };
  return d;
}
const ids=s=>JSON.parse(s).txns.map(x=>x.id).sort().join(',');
(async()=>{
  { // جهازين سجلوا في نفس الوقت: الاتنين يفضلوا
    const base=seed({txns:[ex('a0',10)]});
    const gist={content:JSON.stringify(base),patches:0};
    const A=device(gist,JSON.parse(JSON.stringify(base)));const B=device(gist,JSON.parse(JSON.stringify(base)));
    await A.run("ghSync()");await B.run("ghSync()");          // الاتنين متزامنين على نفس الأساس
    A.run("D.txns.unshift({id:'fromA',book:'me',kind:'expense',amount:500,cat:'other',account:'cash',date:'2026-09-21'});save();");
    await A.run("ghSync()");
    B.run("D.txns.unshift({id:'fromB',book:'me',kind:'expense',amount:30,cat:'other',account:'cash',date:'2026-09-21'});save();");
    await B.run("ghSync()");
    t('GitHub فيه حركة الجهازين', ids(gist.content)==='a0,fromA,fromB', ids(gist.content));
    await A.run("ghSync()");
    t('الجهاز الأول خد حركة التاني من غير ما يضيّع حركته', A.run("D.txns.map(x=>x.id).sort().join()")==='a0,fromA,fromB');
    // مسح على جهاز يتنقل للتاني
    A.run("D.txns=D.txns.filter(x=>x.id!=='fromB');save();");await A.run("ghSync()");await B.run("ghSync()");
    t('المسح بيتنقل', B.run("D.txns.map(x=>x.id).sort().join()")==='a0,fromA');
    // تعديل خانتين مختلفتين في نفس الحركة على جهازين
    A.run("D.txns.find(x=>x.id==='a0').note='ملاحظة A';save();");
    B.run("D.txns.find(x=>x.id==='a0').amount=99;save();");
    await A.run("ghSync()");await B.run("ghSync()");await A.run("ghSync()");
    const a0=JSON.parse(gist.content).txns.find(x=>x.id==='a0');
    t('تعديلين على نفس الحركة من جهازين: الاتنين يفضلوا', a0.note==='ملاحظة A'&&a0.amount===99, JSON.stringify(a0));
    t('الجهازين متطابقين', JSON.stringify(A.run("D.txns"))===JSON.stringify(B.run("D.txns")));
  }
  { // جهاز جديد بيتربط: ياخد اللي على GitHub ومايمسحوش
    const real=seed({txns:[ex('p1',100),ex('p2',200)]});
    const gist={content:JSON.stringify(real),patches:0};
    const N=device(gist,null);
    N.run("save();");                                          // الجهاز الجديد حفظ بيانات فاضية بتاريخ أحدث
    N.run("ghToken='';ghGist='';");
    N.ctx.document.getElementById('ghtokin').value='tok';
    N.ctx.ghFindGist=async()=>'g1';
    await N.run("ghConnect()");
    t('الجهاز الجديد خد البيانات', N.run("D.txns.map(x=>x.id).sort().join()")==='p1,p2');
    t('GitHub مااتمسحش', ids(gist.content)==='p1,p2');
  }
  { // التسجيل التلقائي بيستنى المزامنة
    const s=seed({subs:[{id:'s1',name:'Netflix',amount:100,cur:'EGP',cycle:'monthly',next:'2026-09-25',account:'card',cat:'subs',at:'09:00',payments:[]}],_autoSince:'2026-09-01'});
    const gist={content:'',patches:0};
    const A=device(gist,s,Date.UTC(2026,8,25,12,0,0));
    A.run("D.txns=[];D.subs[0].payments=[];D.subs[0].next=dayShift(today(),-1);autoHold=true;runAuto();");
    t('وهو مستني المزامنة مايسجلش', A.run("D.txns.length")===0);
    await A.run("ghSync()");
    t('وبعد المزامنة برضو مابيسجلش لوحده (مستني الخصم)', A.run("D.txns.filter(x=>x.note==='Netflix').length")===0);
  }
  { // الاسترجاع
    const {run}=boot(seed({txns:[ex('old',5)]}));
    const file=JSON.stringify(seed({txns:[ex('b1',1),ex('b2',2)]}));
    run("FileReader=function(){this.readAsText=()=>{this.result="+JSON.stringify(file)+";this.onload();};};");
    run("app.importData({files:[{}],value:''})");
    t('استرجاع النسخة بيرجّعها فعلًا', run("D.txns.map(x=>x.id).sort().join()")==='b1,b2');
  }
  { // تعديل مرتجع من غير تغيير
    const {run,B}=boot(seed({txns:[ex('r1',-50,{note:'مرتجع — حاجة'})]}));
    const b0=B('me','cash');
    run("app.startTxnEdit({stopPropagation(){}},'r1');app.saveTxnEdit('r1');");
    t('المرتجع فضل مرتجع', run("D.txns[0].amount")===-50&&B('me','cash')===b0);
    run("app.startTxnEdit({stopPropagation(){}},'r1');app.eTxnSet('amount','60');app.saveTxnEdit('r1');");
    t('تعديل مبلغ المرتجع', run("D.txns[0].amount")===-60);
  }
  { // تاريخ الجهاز
    const prev=process.env.TZ;
    const {run}=boot(seed(),Date.UTC(2026,9,31,22,30,0));      // ١:٣٠ الفجر في القاهرة يوم ١ نوفمبر
    t('النهارده بتوقيت الجهاز', run("today()")===run("ymdLocal(new Date())"));
  }
  { // رسايل البنك
    const {run}=boot(seed());
    run("localStorage.setItem(AKEY,'k');");
    run("readSms=async()=>({ops:[{kind:'expense',amount:'1,250.00',cur:'EGP',account:'cib',place:'Carrefour',date:'2026-09-24'},{kind:'transfer',amount:300,account:'cib',to:'',date:'2026-09-24'}]})");
    await run("app.readSmsNow('x')");
    t('المبلغ بالفاصلة اتقرا', run("D.txns.some(x=>x.amount===1250&&x.place==='Carrefour')"));
    t('تحويل لحساب مش معروف بيتعلّم للمراجعة', run("D.txns.find(x=>x.kind==='transfer').needs")===true);
    await run("app.readSmsNow('x')");
    t('نفس الرسالة تاني مابتتسجلش', run("D.txns.length")===2);
    run("readSms=async()=>({ops:[{kind:'expense',amount:20,cur:'EGP',account:'cib',place:'X',date:'2027-05-01'}]})");
    await run("app.readSmsNow('x')");
    t('تاريخ لسه ماجاش بيبقى النهارده', run("D.txns.find(x=>x.place==='X').date")===run("today()"));
    t('رصيد من رسالة البنك', run("JSON.stringify(balFromMsg('charged for USD 15.00 at X. Available limit is  40619.42 and the available international limit to use is EGP 147151'))")==='{"bal":40619.42,"usd":15}');
  }
  { // تصنيفات الدخل
    const s=seed({icats:[{id:'salary',label:'مرتب'},{id:'other_in',label:'دخل تاني'},{id:'x1',label:'فرق فلوس'},{id:'x2',label:'شغل'}],
      certs:[{id:'c1',name:'شهادة 1',amount:10000,monthly:162.5,start:'2026-07-13',account:'cib',covered:'2026-08',payments:[]}],
      txns:[{id:'i1',book:'me',kind:'income',amount:147.34,account:'cib',date:'2026-09-01',note:'رسوم أيزوماتك',icat:'x1',from:'سامح'},
        {id:'i2',book:'me',kind:'income',amount:1000,account:'cib',date:'2026-09-02',note:'المؤسسة',icat:'x2',from:'عصام'},
        {id:'i3',book:'me',kind:'income',amount:162.5,account:'cib',date:'2026-08-13',note:'شهادة 1 — فايدة'},
        {id:'i4',book:'me',kind:'expense',amount:-1,cat:'snacks',account:'cash',date:'2026-09-03',note:'زيادة تحصيل من هاجر'}]});
    const {run,V}=boot(s);
    t('«فرق فلوس» بقى الثابت ومعاه دخله', run("D.txns.find(x=>x.id==='i1').icat")==='diff'&&run("D.icats.filter(c=>c.label==='فرق فلوس').length")===1);
    t('عوائد الشهادات القديمة', run("D.txns.find(x=>x.id==='i3').icat")==='certint');
    t('زيادة التحصيل بقت دخل فرق فلوس', run("JSON.stringify(D.txns.find(x=>x.id==='i4'))").indexOf('"kind":"income","amount":1')>-1&&run("D.txns.find(x=>x.id==='i4').icat")==='diff');
    t('عائد جديد بيتسجل على عائد الشهادات', run("catchUp(['c1']);D.txns.find(x=>x.note==='شهادة 1 — عائد').icat")==='certint');
    t('بالوصف', run("icatSuggest('رسوم ايزوماتك','',0)")==='diff');
    t('بالشخص', run("icatSuggest('حاجة جديدة','عصام',0)")==='x2');
    t('بالرقم', run("[icatSuggest('','',389),icatSuggest('','',125),icatSuggest('','',30),icatSuggest('','',120),icatSuggest('','',12.5)].join()")==='diff,diff,diff,,diff');
    run("app.go('add');app.setKind('income');app.dset('amount','300');app.dset('note','المؤسسة');render();");
    t('شاشة التسجيل بتختاره لوحدها', /class="chip sm on"[^>]*>شغل</.test(V()));
    run("app.setAccount('cib');app.saveEntry();");
    t('واتحفظ عليه', run("D.txns.find(x=>x.note==='المؤسسة'&&x.amount===300).icat")==='x2');
    t('ماينفعش يتمسحوا', run("ILOCKED.indexOf('diff')>-1&&ILOCKED.indexOf('certint')>-1"));
  }
  { // مراجعة الدفعة: أول مزامنة من غير أساس، وربط جهاز فيه بيانات، والتسجيل التلقائي بـ id ثابت، وتكرار رسايل من غير مكان
    const remote=seed({officeOn:true,bookName:'المكتب',txns:[ex('r1',10)]});remote._sv=200;
    const gist={content:JSON.stringify(remote),patches:0};
    const stale=seed({officeOn:true,txns:[ex('r1',10),ex('del',5)]});stale._sv=100;
    const A=device(gist,stale);A.run("D._sv=100;");
    await A.run("ghSync()");
    t('أول مزامنة من غير أساس: الأحدث كله (المسوح مايرجعش)', A.run("D.txns.map(x=>x.id).sort().join()")==='r1');
    const N=device(gist,seed({officeOn:false,rate:50,txns:[ex('mine',7)]}));
    N.run("ghToken='';ghGist='';");N.ctx.document.getElementById('ghtokin').value='tok';N.ctx.ghFindGist=async()=>'g1';
    await N.run("ghConnect()");
    t('ربط جهاز فيه بيانات: إعدادات GitHub تفضل وحركته تتضاف', N.run("D.officeOn")===true&&N.run("D.txns.map(x=>x.id).sort().join()")==='mine,r1');
    t('التأمين بـ id ثابت', /^auto:/.test(boot(seed({accounts:[{id:'card',name:'كارت',opening:40000,limit:42000,credit:true,atype:'credit',stmtDay:20,graceDay:15,insure:true,insureRate:0.9,scope:'me',insLast:'2026-08'}]}),Date.UTC(2026,8,25,12,0,0)).run("render();(D.txns.find(x=>x.insFee)||{id:'auto:none'}).id")));
    const {run}=boot(seed());run("localStorage.setItem(AKEY,'k');");
    run("readSms=async()=>({ops:[{kind:'expense',amount:500,cur:'EGP',account:'cib',place:'',date:'2026-09-24'},{kind:'expense',amount:500,cur:'EGP',account:'cib',place:'',date:'2026-09-24'}]})");
    await run("app.readSmsNow('x')");
    t('سحبين بنفس المبلغ في نفس الرسالة يتسجلوا الاتنين', run("D.txns.filter(x=>x.amount===500).length")===2);
    t('مرتب بقروش مايتغيرش لفرق فلوس', run("icatSuggest('','',8437.5)")==='');
  }
  done();
})();
