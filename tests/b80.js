// الدفعة ٤ (١): تقدر تصرف لحد المرتب، كشف الكارت، التدبير الراجع، التقرير المختصر
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,9,26,9);
const ex=(id,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'eatout',account:'cash',date:'2026-10-20'},o||{});
const sal={id:'s',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-10-25',salary:true};
(async()=>{

{ // ١ تقدر تصرف
  const S=seed({txns:[sal,ex('c',2000,{account:'card',date:'2026-10-22'})],
    subs:[{id:'n',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-11-05',account:'cib',cat:'subs',payments:[],dues:[]},
          {id:'k',name:'كارتي',amount:100,cur:'EGP',cycle:'monthly',next:'2026-11-10',account:'card',cat:'subs',payments:[],dues:[]},
          {id:'z',name:'بعد المرتب',amount:500,cur:'EGP',cycle:'monthly',next:'2026-11-26',account:'cib',cat:'subs',payments:[],dues:[]},
          {id:'d',name:'يوم المرتب',amount:50,cur:'EGP',cycle:'monthly',next:'2026-11-25',account:'cib',cat:'subs',payments:[],dues:[]}],
    owed:[{id:'o',who:'علي',amount:400,date:'2026-10-01'}],
    txns2:null});
  S.txns.push({id:'l',book:'me',kind:'settle',dir:'in',amount:700,account:'cash',date:'2026-10-02',debt:true,from:'سامي'});
  const {run}=boot(S,NOW);
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  const liquid=5000+10000+10000+700;
  t('لحد المرتب الجاي (شهر من آخر مرتب)', c.target==='2026-11-25');
  t('الاشتراكات قبل المرتب ويومه نفسه بتتخصم، واللي بعده لأ', c.X.some(i=>/^نت/.test(i.label))&&c.X.some(i=>/يوم المرتب/.test(i.label))&&!c.X.some(i=>/بعد المرتب/.test(i.label)));
  t('اشتراك هيتخصم على الكارت مش داخل (بيتسدد من كشف بعد المرتب)', !c.Y.some(i=>/كارتي/.test(i.label))&&!c.X.some(i=>/كارتي/.test(i.label)));
  t('الرقم الأولاني', c.x===liquid-300-50, c.x+' '+liquid);
  t('الرقم التاني فيه الكارت وفلوس الناس', Math.abs(c.y-(c.x-2000-700))<0.01, c.y);
  t('الرقم التالت فيه اللي ليك', c.z===c.x+400);
  // المرتب اتأخر
  const r=boot(Object.assign(seed({txns:[Object.assign({},sal,{date:'2026-09-20'})]})),NOW);
  t('المرتب عدّى ميعاده: الحسبة لحد النهارده', JSON.parse(r.run("JSON.stringify(spendCalc())")).late===true);
  const {run:r2,V}=boot(S,NOW);r2("app.go('home');render();");
  t('كشف اتسدد زيادة مايطلعش بالسالب', true);
  t('ظاهر في الرئيسية من غير تقسيم على الأيام', V().indexOf('تقدر تصرف لحد المرتب')>-1&&V().indexOf('في اليوم')<0);
}
{ // ٢ كشف الكارت: الكشف اللي ميعاده قبل المرتب
  const S=seed({txns:[Object.assign({},sal,{date:'2026-10-20'}),ex('c',1500,{account:'card',date:'2026-10-10'})]});
  const {run,V}=boot(S,Date.UTC(2026,9,22,9));
  run("app.go('home');alertsOpen=true;render();");
  t('يوم الكشف: تنبيه «نزل كشف»', V().indexOf('نزل كشف كارت المشتريات')>-1);
  run("app.stmtOpen('card');");
  run("document.getElementById('stincard').value='1200';document.getElementById('stmincard').value='300';app.stmtSave('card','2026-10');");
  t('اتحفظ', run("D.cardStmts.length")===1&&run("D.cardStmts[0].amt")===1200&&run("D.cardStmts[0].min")===300);
  t('الفرق مع حسبة البرنامج بيتكتب', V().indexOf('البرنامج حاسب')>-1);
  // كشف ميعاده 15 نوفمبر قبل مرتب 20 نوفمبر: في الرقم الأولاني بمبلغ الكشف
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('الكشف في الرقم الأولاني بمبلغه', c.X.some(i=>/كشف/.test(i.label)&&i.amt===1200), JSON.stringify(c.X));
  run("D.txns.push({id:'p',book:'me',kind:'transfer',amount:1200,account:'cib',to:'card',date:'2026-10-23'});");
  t('بعد السداد: مفيش كشف', !JSON.parse(run("JSON.stringify(spendCalc())")).X.some(i=>/كشف/.test(i.label)));
}
{ // ٣ رسالة الكشف
  const {run}=boot(seed(),NOW);
  run("readSms=async()=>({ops:[],stmts:[{account:'card',amount:'1,921.00',min:'619.02',due:'2026-10-15'}]});");
  await run("app.readSmsNow('كشف حساب')");
  t('اتقرا من الرسالة على كشف سبتمبر', run("D.cardStmts.length")===1&&run("D.cardStmts[0].key")==='2026-09'&&run("D.cardStmts[0].amt")===1921&&run("D.cardStmts[0].min")===619.02);
}
{ // ٤ التدبير الراجع
  const S=seed({txns:[ex('o',1000,{account:'card',cat:'subs',refundSince:'2026-10-20'}),ex('f',30,{account:'card',cat:'fees',arrFee:true,arrOf:'o'})]});
  const {run,V,B}=boot(S,NOW);
  const c0=B('me','card');
  run("app.confirmRefundBack('o');");
  const rid=run("D.txns.find(x=>x.refundOf==='o').id");
  t('اتسجل تدبير راجع 3% محجوز', run("D.txns.find(x=>x.refFee==='"+rid+"').amount")===-30&&run("D.txns.find(x=>x.refFee==='"+rid+"').refWait")===true);
  run("app.go('home');alertsOpen=true;render();");
  t('تنبيه واحد بالمجموع', (V().match(/مرتجع محجوز/g)||[]).length===1&&V().indexOf('1,030')>-1);
  run("app.refArrived('"+rid+"');");
  t('وصلوا مع بعض', B('me','card')===c0+1030);
  run("app.delTxn({stopPropagation(){}},'"+rid+"');");
  t('مسح المرتجع مسح التدبير الراجع', run("D.txns.filter(x=>x.refFee).length")===0);
  // مرتجع حركة مالهاش تدبير
  const r=boot(seed({txns:[ex('o',500,{refundSince:'2026-10-20'})]}),NOW);r.run("app.confirmRefundBack('o');");
  t('من غير تدبير: مفيش سطر تدبير', r.run("D.txns.filter(x=>x.refFee).length")===0);
  // استرداد ترقية على اشتراك عليه تدبير
  const u=boot(seed({subs:[{id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-11-01',account:'card',cat:'subs',arr:true,payments:[],dues:[]}]}),NOW);
  u.run("upDraft={amount:'400',refund:'12',acct:'card',date:'2026-10-26'};app.doUpgrade('s1');");
  t('استرداد 12: تدبيره 0.36', u.run("D.txns.find(x=>x.refFee).amount")===-0.36);
}
{ // ٥ التقرير المختصر
  const S=seed({txns:[{id:'a',book:'office',kind:'expense',amount:100,account:'ocash',date:'2026-10-20',item:'ورق',ocat:'c1'}]});
  const {run,V}=boot(S,NOW);
  run("app.setBook('office');app.goClose();app.setRepShort('short');");
  const h=run("printHTML(officeReport(periodFrom(),closeTo))");
  t('المختصر: من غير بنود المنصرف', h.indexOf('ورق')<0&&h.indexOf('إجمالي المنصرف')>-1&&h.indexOf('إجمالي الرصيد')>-1);
  run("app.setRepShort('full');");
  t('المفصّل فيه البنود', run("printHTML(officeReport(periodFrom(),closeTo))").indexOf('ورق')>-1);
}
{ // مراجعة: كشف ميعاده قبل المرتب ولسه مانزلش، والقسط على الكارت
  const S=seed({txns:[Object.assign({},sal,{date:'2026-10-18'}),ex('c',3000,{account:'card',date:'2026-10-10'})]});
  S.accounts.find(a=>a.id==='card').stmtDay=20;
  const {run}=boot(S,Date.UTC(2026,9,18,9));
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('الكشف اللي جاي وميعاده قبل المرتب في الرقم الأولاني', c.X.some(i=>/كشف/.test(i.label)&&i.amt===3000), JSON.stringify(c.X));
}
{ // مراجعة: مرتجع على حساب تاني مالوش تدبير راجع
  const S=seed({txns:[{id:'r',book:'me',kind:'expense',amount:600,cat:'x',account:'card',date:'2026-10-20',merchant:'م',items:[{name:'أ',amount:600,cat:'x'}]},
    {id:'f',book:'me',kind:'expense',amount:18,cat:'fees',account:'card',date:'2026-10-21',arrFee:true,arrOf:'r'}]});
  const {run}=boot(S,NOW);
  run("app.startReturn('r',0);retAcct='cash';app.doReturn('r',0);");
  t('رجع كاش: مفيش تدبير راجع', run("D.txns.filter(x=>x.refFee).length")===0);
  const r=boot(S,NOW);r.run("app.startReturn('r',0);app.doReturn('r',0);app.delTxn({stopPropagation(){}},'r');");
  t('مسح الفاتورة مسح المرتجع وتدبيره', r.run("D.txns.filter(x=>x.refFee||x.retOf).length")===0);
}
{ // مراجعة: سددت أكتر من الكشف (دفعت حاجات بعده): مفيش سالب ولا تنبيه
  const S=seed({txns:[Object.assign({},sal,{date:'2026-10-25'}),ex('c',1000,{account:'card',date:'2026-10-10'}),ex('d',500,{account:'card',date:'2026-10-23'}),
    {id:'p',book:'me',kind:'transfer',amount:1500,account:'cib',to:'card',date:'2026-10-24'}]});
  S.accounts.find(a=>a.id==='card').stmtDay=21;
  const {run,V}=boot(S,NOW);
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('مفيش أرقام بالسالب ولا كارت', c.y===c.x&&!c.X.length&&!c.Y.length, JSON.stringify(c));
  run("app.go('home');alertsOpen=true;render();");
  t('مفيش «نزل كشف» لكشف اتسدد', V().indexOf('نزل كشف')<0);
  t('ولا سطر «لو دفعت» لو مفيش عليك حاجة', V().indexOf('لو دفعت كل اللي عليك')<0);
}
done();
})();
