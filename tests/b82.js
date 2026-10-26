// الدفعة ٤ (٢): اشتراك بتاع حد تاني أو المكتب، وتوحيد أسامي الأماكن، و«تقدر تصرف» بشكله الجديد
const {boot,seed,t,done,r2}=require('./harness');
const NOW=Date.UTC(2026,9,26,9);
const sub=o=>Object.assign({id:'s1',name:'خدمة',amount:999,cur:'EGP',cycle:'monthly',next:'2026-10-26',account:'card',cat:'subs',arr:true,payments:[],dues:[]},o||{});
const owe=run=>-run("loanBalance()");
const offLines=(run,sid)=>JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.book==='office'&&x.kind==='expense'&&x.item==='اشتراك خدمة').map(x=>x.amount))"));

{ // ١ الفورم: «الاشتراك ده بتاع مين؟» بيبدأ فاضي ولازم يتجاوب
  const {run,V}=boot(seed(),NOW);
  run("app.go('wallet');wtab='subs';render();app.toggleSub();app.subSet('name','خدمة');app.subSet('amount','999');");
  t('السؤال موجود ومفيش اختيار', V().indexOf('الاشتراك ده بتاع مين؟')>-1&&run("subDraft.owner")===undefined);
  t('مايتحفظش قبل ما تجاوب', run("subOk()")===false);
  run("app.subPick('owner','office');");
  t('المكتب: سؤال التصنيف', V().indexOf('تصنيفه في المكتب')>-1&&V().indexOf('متقسم مع ناس')<0);
  run("app.subPick('ocat','c2');app.subPick('promo',false);app.addSub();");
  t('اتحفظ بتاع المكتب', run("D.subs[0].owner")==='office'&&run("D.subs[0].ocat")==='c2');
  run("app.toggleSub();app.subSet('name','نت');app.subSet('amount','100');app.subPick('owner','other');app.subPick('promo',false);");
  t('حد تاني: محتاج اسم', run("subOk()")===false);
  run("app.subSet('ownerName','سامي');");t('بعد الاسم يتحفظ', run("subOk()")===true);
  run("app.subPick('owner','me');");t('أنا: سؤال التقسيم لازم يتجاوب', run("subOk()")===false);
  // الدفتر التاني مقفول: الاختيار مش ظاهر
  const r=boot(seed({officeOn:false}),NOW);r.run("app.go('wallet');wtab='subs';app.toggleSub();");
  t('المكتب مقفول: اختيار المكتب مش ظاهر', r.V().indexOf("app.subPick('owner',v))('office')")<0&&r.V().indexOf('الاشتراك ده بتاع مين؟')>-1);
}
{ // ٢ اشتراك المكتب: «لسه» وبعدين التدبير والمرتجع و«سوّها»
  const {run,V,B}=boot(seed({subs:[sub({owner:'office',ocat:'c2'})]}),NOW);
  const card0=B('me','card'), ocash0=B('office','ocash');
  run("app.subCharged('s1');");
  t('«اتخصم» بيسأل «خدت الفلوس؟»', V().indexOf('خدت الفلوس من المكتب؟')>-1);
  run("app.confirmPaySub('s1');");t('مايتسجلش قبل ما تجاوب', run("D.subs[0].payments.length")===0);
  run("app.setPaySubTake(false);app.confirmPaySub('s1');");
  t('الكارت اتخصم 999', B('me','card')===card0-999);
  t('مش مصروف عليك', run("monthStats().spent")===0, run("monthStats().spent"));
  t('دفتر المكتب «اشتراك خدمة» بـ1000', JSON.stringify(offLines(run))==='[1000]');
  t('كاش المكتب ماتحركش', B('office','ocash')===ocash0);
  t('المكتب عليه ليك 1000', owe(run)===1000);
  // التدبير
  const tid=run("D.subs[0].payments[0].t");
  run("app.startFeeFix('s1|"+tid+"');document.getElementById('feein').value='29';feeDate='2026-10-27';app.confirmFee('s1|"+tid+"');");
  t('التدبير: الكارت 29', B('me','card')===card0-999-29);
  t('سطر «تدبير» بـ30', JSON.stringify(offLines(run).sort((a,b)=>a-b))==='[30,1000]');
  t('المكتب عليه 1030', owe(run)===1030);
  t('التدبير مش مصروف عليك', run("monthStats().spent")===0);
  // المرتجع (استرداد ترقية) بيستنى «وصل»
  run("upDraft={amount:'999',refund:'12.36',acct:'card',date:'2026-10-28'};app.doUpgrade('s1');");
  const lines0=offLines(run).sort((a,b)=>a-b);
  t('المرتجع محجوز: لسه مااتخصمش من المكتب', lines0.indexOf(-10)<0, JSON.stringify(lines0));
  const rid=run("D.txns.find(x=>x.sofRef&&!x.refFee).id");
  run("app.refArrived('"+rid+"');");
  const lines=offLines(run).sort((a,b)=>a-b);
  t('وصل: سطر «مرتجع» بالسالب والإجمالي متقرّب', lines.indexOf(-10)>-1, JSON.stringify(lines));
  const k=run("D.subs[0].payments[0].off.k");
  t('إجمالي الدفعة الأولى 1020', run("D.txns.filter(x=>x.sof==='"+k+"'&&x.book==='office'&&x.kind==='expense').reduce((a,x)=>a+x.amount,0)")===1020);
  // التقرير: الاشتراك سطر واحد بالمجموع
  run("app.setBook('office');");
  const rep=JSON.parse(run("JSON.stringify(officeReport('2000-01-01','2026-12-31').items)"));
  t('التقرير: «اشتراك خدمة» بند واحد', rep.filter(i=>i.item==='اشتراك خدمة').length===1);
  // سوّيت كله
  const o=owe(run), pr=run("loanRnd()");
  run("app.setBook('me');flPay={bfrom:'ocash',bto:'cash'};document.getElementById('loanin').value=String("+o+");app.settleLoan();");
  t('سوّها: مفيش حاجة على المكتب', Math.abs(owe(run))<0.01&&Math.abs(run("loanRnd()"))<0.01);
  t('فرق التقريب اتسجل «باقي تقريب»', r2(run("D.txns.filter(x=>x.kind==='income'&&/باقي تقريب — اشتراكات/.test(x.note)).reduce((a,x)=>a+x.amount,0)"))===r2(pr), pr);
  // البناء من تاني مابيغيّرش حاجة
  const j=run("JSON.stringify(D)");run("subOffAll();");t('البناء من تاني نفس البيانات', run("JSON.stringify(D)")===j);
}
{ // ٣ «خدت الفلوس؟ أيوه» وقت الخصم
  const {run,B}=boot(seed({subs:[sub({owner:'office',ocat:'c2'})]}),NOW);
  const cash0=B('me','cash'), card0=B('me','card'), oc0=B('office','ocash');
  run("app.subCharged('s1');app.setPaySubTake(true);app.setPaySubFrom('ocash');app.confirmPaySub('s1');");
  t('خدتها من كاش المكتب لكاشك', B('me','cash')===cash0+1000&&B('me','card')===card0-999&&B('office','ocash')===oc0-1000);
  t('الجنيه «باقي تقريب» دخل', run("D.txns.some(x=>x.kind==='income'&&x.icat==='diff'&&x.amount===1)"));
  t('مفيش حاجة على المكتب', Math.abs(owe(run))<0.01);
  // مسح سطر المكتب بيمسح الدفعة كلها، والتراجع بيرجعها بالظبط
  const pre=run("JSON.stringify(D)");
  const oid=run("D.txns.find(x=>x.book==='office'&&x.sof).id");
  run("app.delTxn({stopPropagation(){}},'"+oid+"');");
  t('المسح: كل سطور الدفعة اتمسحت', run("D.txns.filter(x=>x.sof||x.sofP).length")===0&&B('me','card')===card0);
  run("app.undoLast();");
  t('التراجع رجّع البيانات زي ما كانت', run("JSON.stringify(D.txns)")===JSON.stringify(JSON.parse(pre).txns));
  // «تراجع آخر دفعة»
  run("app.undoSubPay('s1');");
  t('تراجع آخر دفعة: الدفترين نضفوا', run("D.txns.filter(x=>x.sof||x.sofP).length")===0&&B('me','cash')===cash0&&B('office','ocash')===oc0);
}
{ // ٤ بتاع حد تاني
  const {run,B}=boot(seed({subs:[sub({owner:'other',ownerName:'سامي',amount:200})]}),NOW);
  run("app.subCharged('s1');");
  t('كل الدفعة ليك عند سامي', run("JSON.stringify(D.subs[0].dues.map(d=>[d.who,d.amount]))")==='[["سامي",200]]');
  t('مش في مصروفك (فلوس عند الناس)', run("monthStats().byCat.every(c=>c[0]!=='subs'||Math.abs(c[1])<0.005)"));
  const tid=run("D.subs[0].payments[0].t");
  run("app.startFeeFix('s1|"+tid+"');document.getElementById('feein').value='6';app.confirmFee('s1|"+tid+"');");
  t('التدبير عليك', run("D.txns.some(x=>x.arrFee&&x.amount===6&&x.kind==='expense')"));
  run("upDraft={amount:'200',refund:'50',acct:'card',date:'2026-10-28'};app.doUpgrade('s1');");
  t('استرداد: بيقلل اللي ليك عنده', run("D.subs[0].dues[0].amount")===150);
  t('والدفعة الجديدة ليك عنده', run("D.subs[0].dues.length")===2);
  const rid=run("D.txns.find(x=>x.dueCut).id");run("app.delTxn({stopPropagation(){}},'"+rid+"');");
  t('مسح الاسترداد رجّع نصيبه', run("D.subs[0].dues[0].amount")===200);
}
{ // ٥ توحيد أسامي الأماكن
  const e=(id,place,o)=>Object.assign({id,book:'me',kind:'expense',amount:10,cat:'eatout',account:'cash',date:'2026-10-20',place,merchant:place,note:place},o||{});
  const S=seed({txns:[e('a','Super Market'),e('b','Super Market'),e('c','super market'),e('d','Super'),e('e','Hyber Store'),e('f','Hyper Store'),e('g','مطعم'),e('h','كشري',{note:'كشري حلو'})],
    ops:{o1:{f:'entry',b:'me',v:2,d:{amount:'10',place:'super market',note:'super market'}}}});
  S.txns[2].op='o1';
  const {run,V}=boot(S,NOW);
  const g=JSON.parse(run("JSON.stringify(placeGroups().map(x=>x.list.map(y=>y.name)))"));
  t('الاقتراحات: الكابيتال وحرف مختلف وكلمة جوه التانية', g.length===2&&g[0].join()==='Super Market,super market,Super'&&g[1].length===2, JSON.stringify(g));
  t('الأسامي المختلفة مش متقترحة', !g.some(l=>l.indexOf('مطعم')>-1||l.indexOf('كشري')>-1));
  run("app.go('home');alertsOpen=true;render();");t('تنبيه في الرئيسية', V().indexOf('أسامي أماكن شبه بعض')>-1);
  run("app.goPlaces();");t('صفحة التوحيد', V().indexOf('أسامي الأماكن')>-1&&V().indexOf('وحّدهم')>-1);
  const k=run("placeGroups()[0].key");
  run("app.placeGroupMerge('"+k+"');");
  t('اتوحّدوا في الحركات (المكان واسم المحل والملاحظة)', run("D.txns.filter(x=>['a','b','c','d'].indexOf(x.id)>-1).every(x=>x.place==='Super Market'&&x.merchant==='Super Market'&&x.note==='Super Market')"));
  t('وفي العملية عشان التعديل بعدين', run("D.ops.o1.d.place")==='Super Market'&&run("D.ops.o1.d.note")==='Super Market');
  t('ملاحظة مش هي اسم المكان ماتتغيرش', run("D.txns.find(x=>x.id==='h').note")==='كشري حلو');
  const k2=run("placeGroups()[0].key");run("app.placeGroupNo('"+k2+"');");
  t('«دول مختلفين» بيتحفظ', run("placeGroups().length")===0&&run("D.placeNo.length")===1);
}
{ // ٦ «تقدر تصرف»: سطر يساوي اللي قبله مابيظهرش
  const S=seed({txns:[{id:'s',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-10-25',salary:true}],
    subs:[sub({next:'2026-11-05'})]});
  const {run,V}=boot(S,NOW);run("app.go('home');");
  t('اشتراك الكارت: «بعد اشتراكات الكارت» ظاهر', V().indexOf('بعد اشتراكات الكارت')>-1);
  t('مفيش عليك حاجة تانية: «بعد كل اللي عليك» مش ظاهر', V().indexOf('بعد كل اللي عليك')<0);
  t('مفيش ليك عند حد: «ولو رجعلك» مش ظاهر', V().indexOf('ولو رجعلك اللي ليك')<0);
  const c=JSON.parse(run("JSON.stringify(spendCalc())"));
  t('ممكن يبقى بالسالب', c.c===r2(c.x-999-arrEstOf(999)), c.c);
  function arrEstOf(v){return r2(v*0.03);}
}
done();
