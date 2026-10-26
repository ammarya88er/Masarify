// الدفعة ٣: الأقساط، الاشتراكات، الشهادات، المصاريف الثابتة، الادخار، التقفيل
const {boot,seed,t,done,r2}=require('./harness');
const SAL={id:'s0',book:'me',kind:'income',amount:10000,account:'cib',date:'2026-09-01',salary:true,note:'مرتب'};
{ // ١ آخر باقي في القسط بيتدفع
  const ins={id:'i1',name:'iPhone',monthly:5200,months:12,paid:12,total:62410,day:1,account:'cib',src:'office',covered:'2026-08',firstMonth:'2025-09',payments:[]};
  const {run,V}=boot(seed({txns:[SAL],installments:[ins]}));
  run("app.go('wallet');app.setWtab('ins');");
  t('بعد آخر قسط: الـ10 جنيه باقيين وفيه زرار دفع', run("insDone(D.installments[0])")===false&&V().indexOf("app.startPay('i1'")>-1);
  run("app.startPay('i1','front');app.confirmPay('i1');");
  t('اتدفعوا 10 والقسط خلص', run("D.txns.find(x=>/قسط/.test(x.note)).amount")===10&&run("insDone(D.installments[0])")===true);
}
{ // ٢ التأجيل بيأخر الميعاد بس
  const ins={id:'i1',name:'تلاجة',monthly:1000,months:10,paid:3,total:10000,day:1,account:'cib',src:'office',covered:'2026-08',firstMonth:'2026-06',payments:[]};
  const {run,V}=boot(seed({txns:[SAL],installments:[ins]}));
  const left0=run("insLeft(D.installments[0])");
  run("app.go('wallet');app.setWtab('ins');");
  t('زرار التأجيل موجود', V().indexOf("app.postponeIns('i1')")>-1);
  run("app.postponeIns('i1');");
  t('الباقي زي ما هو وعدد الشهور زي ما هو', run("insLeft(D.installments[0])")===left0&&run("D.installments[0].months")===10);
  t('القسط الجاي بقى الشهر اللي بعده', run("insNextMonth(D.installments[0])")==='2026-10'&&run("insAhead(D.installments[0])")===0);
  run("app.undoIns('i1');");
  t('إلغاء التأجيل رجّع الميعاد ومامسحش دفعات', run("insNextMonth(D.installments[0])")==='2026-09'&&run("D.installments[0].paid")===3);
  const {run:r2b,V:V2}=boot(seed({txns:[SAL],installments:[Object.assign({},ins,{src:'card'})]}));
  r2b("app.go('wallet');app.setWtab('ins');");
  t('قسط كارت المشتريات: مفيش تأجيل', V2().indexOf("app.postponeIns('i1')")<0);
}
{ // ٣ مسح حركة دفعة قسط بيرجّعه مش مدفوع
  const ins={id:'i1',name:'تلاجة',monthly:1000,months:10,paid:3,total:10000,day:1,account:'cib',src:'office',covered:'2026-08',firstMonth:'2026-06',payments:[]};
  const {run}=boot(seed({txns:[SAL],installments:[ins]}));
  run("app.startPay('i1','front');app.confirmPay('i1');");
  const id=run("D.txns.find(x=>/قسط/.test(x.note)).id");
  run("app.delTxn({stopPropagation(){}},'"+id+"')");
  t('القسط رجع ٣ مدفوعين ومستحق سبتمبر', run("D.installments[0].paid")===3&&run("insNextMonth(D.installments[0])")==='2026-09');
}
{ // ٤ قسط على الكارت بنظام البنك: الكشف بيطلب قسط الشهر بس
  const S=seed();
  const {run}=boot(S,Date.UTC(2026,9,25,9));
  run("insDraft={name:'لابتوب',total:'12000',monthly:'1000',months:'12',paid:'0',day:'1',account:'',src:'card',buyDate:'2026-08-25',_r:0};app.addIns();");
  // اشترى ٢٥/٨ → أول قسط مع كشف ٢٠/٩
  const left=run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-09')");
  t('كشف سبتمبر: قسط واحد بس (1000)', Math.abs(left-1000)<0.01, left);
  t('اللي عليك للكارت كله لسه 12000', run("cardDebt(D.accounts.find(a=>a.id==='card'))")===12000);
  t('«من غير الأقساط» بيشيل اللي لسه مانزلش', Math.abs(run("insOnAccount('card')")-10000)<0.01, run("insOnAccount('card')"));
}
{ // ٥ الاشتراك بيفتكر يومه
  const sub={id:'sb',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-01-31',account:'cib',cat:'subs',payments:[],dues:[]};
  const {run}=boot(seed({subs:[sub]}));
  run("D.subs[0].next=subNextOf(D.subs[0]);");
  t('بعد ٣١ يناير: ٢٨ فبراير', run("D.subs[0].next")==='2026-02-28');
  run("D.subs[0].next=subNextOf(D.subs[0]);");
  t('وبعده ٣١ مارس مش ٢٨', run("D.subs[0].next")==='2026-03-31');
}
{ // ٦ التراجع عن آخر دفعة بيسيب السحب المتكرر
  const sub={id:'sb',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-09-20',account:'cib',cat:'subs',payments:[],dues:[]};
  const {run}=boot(seed({subs:[sub]}));
  run("paySubDate='2026-09-20';app.confirmPaySub('sb');repDate='2026-09-21';app.addRepeat('sb');");
  t('دفعة + سحب متكرر', run("D.subs[0].payments.length")===2&&run("D.txns.length")===2);
  run("app.undoSubPay('sb');");
  t('التراجع شال الدفعة والسحب المتكرر فضل', run("D.subs[0].payments.length")===1&&run("D.subs[0].payments[0].dup")===true&&run("D.subs[0].next")==='2026-09-20');
}
{ // ٧ اشتراك مشترك: نصيب الناس «فلوس عند الناس» من الأول، ومسحه بينقل اللي ليك
  const sub={id:'sb',name:'نتفليكس',amount:300,cur:'EGP',cycle:'monthly',next:'2026-09-20',account:'cib',cat:'subs',payments:[],dues:[],people:[{name:'علي',amount:100}]};
  const {run}=boot(seed({subs:[sub]}));
  run("paySubDate='2026-09-20';app.confirmPaySub('sb');");
  const b=JSON.parse(run("JSON.stringify(breakdown(D.txns[0]))"));
  t('اشتراكات 200 وفلوس عند الناس 100', b.length===2&&r2(b[0].amount)===200&&b[1].cat==='lentcat'&&r2(b[1].amount)===100, JSON.stringify(b));
  run("collectOwed([{src:'due',ref:D.subs[0].dues[0],sub:D.subs[0]}],100,'cash','علي');");
  t('التحصيل بيرجع من «فلوس عند الناس»', run("D.txns.find(x=>/تحصيل/.test(x.note)).cat")==='lentcat');
  run("paySubDate='2026-10-20';D.subs[0].next='2026-10-20';app.confirmPaySub('sb');app.delSub('sb');");
  t('مسح الاشتراك: الـ100 اللي على علي فضلت «فلوس ليك»', run("openOwed().length")===1&&run("openOwed()[0].who")==='علي'&&run("openOwed()[0].amount")===100);
  t('واللي اتحصّل فضل متسجل (التصنيفات ماتغيرتش)', run("D.owed.filter(o=>o.got).length")===1&&Math.abs(run("D.txns.filter(x=>x.kind==='expense').reduce((a,x)=>a+breakdown(x).filter(p=>p.cat==='subs').reduce((s,p)=>s+p.amount,0),0)")-400)<0.01);
  t('والحركات فضلت', run("D.txns.length")===3);
}
{ // مراجعة: صنف لحد تاني بخصم، تأكيد الدولار، مسح شراء قسط الكارت
  const {run}=boot(seed());
  run("app.go('scan');app.manualBill();scan.items=[{name:'أ',amount:100,cat:'other'},{name:'ب',amount:100,cat:'other',who:'علي'}];Object.assign(scan,{account:'cash',merchant:'م',date:'2026-09-25',disc:'20'});app.saveReceipt();");
  t('نصيب علي بعد الخصم 90', run("D.owed[0].amount")===90);
  run("D.owed=[];D.txns=[];app.go('add');app.setKind('expense');app.setAccount('card');draft.cur='USD';app.dset('amount','10');app.setOwed(true);draft.owedKind='lent';draft.owedPeople=[{name:'علي',amount:''}];app.saveEntry();");
  const id=run("D.txns[0].id");els0(run,'fixin','560');run("app.confirmFix('"+id+"');");
  t('تأكيد الدولار عدّل اللي على علي', run("D.owed[0].amount")===560);
  const r=boot(seed(),Date.UTC(2026,9,25,9));
  r.run("insDraft={name:'تلفزيون',total:'12000',monthly:'1000',months:'12',paid:'0',day:'1',account:'',src:'card',buyDate:'2026-08-25',_r:0};app.addIns();");
  r.run("D.txns.unshift({id:'f',book:'me',kind:'expense',amount:500,cat:'food',account:'card',date:'2026-09-01'});");
  r.run("app.delTxn({stopPropagation(){}},D.txns.find(x=>x.insBuy).id)");
  t('مسح شراء القسط مابيخفيش باقي اللي على الكارت', Math.abs(r.run("cardStmtLeft(D.accounts.find(a=>a.id==='card'),'2026-09')")-500)<0.01);
}
function els0(run,id,v){run("document.getElementById('"+id+"').value='"+v+"'");}
{ // ٨ تأكيد الدولار بيظبط نصيب الناس
  const sub={id:'sb',name:'Spotify',amount:10,cur:'USD',cycle:'monthly',next:'2026-09-20',account:'card',cat:'subs',payments:[],dues:[],people:[{name:'منى',amount:5}]};
  const {run,els}=boot(seed({subs:[sub]}));
  run("paySubDate='2026-09-20';app.confirmPaySub('sb');");
  t('نصيب منى بالسعر التقديري 250', run("D.subs[0].dues[0].amount")===250);
  const tid=run("D.txns[0].id");els['feein']={value:'540'};
  run("app.confirmFee('sb|"+tid+"');");
  t('بعد التأكيد بـ540: نصيبها 270', run("D.subs[0].dues[0].amount")===270);
}
{ // ٩ حساب الاشتراك بيتغيّر من التعديل
  const sub={id:'sb',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-09-30',account:'card',cat:'subs',payments:[],dues:[]};
  const {run}=boot(seed({subs:[sub]}));
  run("app.startSubEdit('sb');app.sdPick('account','cib');app.saveSubEdit('sb');");
  t('اتحفظ على CIB', run("D.subs[0].account")==='cib');
}
{ // ١٠ مصروف حساب أول ميعاده فات: بيبدأ من الجاي
  const {run}=boot(seed());
  run("app.feeEdOpen('cib');feeEd.name='رسوم';feeEd.amount='20';feeEd.next='2026-08-05';app.feeEdSave();");
  const f=JSON.parse(run("JSON.stringify(D.accounts.find(a=>a.id==='cib').fees[0])"));
  t('الميعاد اتنقل لـ٥ أكتوبر', f.next==='2026-10-05', f.next);
  run("D.accounts.find(a=>a.id==='cib').fees[0].next='2026-07-05';D.accounts.find(a=>a.id==='cib').fees[0].since='2026-09-01';accFeesAuto();");
  t('بيانات قديمة واقفة: بتتحرك، وبتسجل بس اللي بعد ما اتضاف', run("D.accounts.find(a=>a.id==='cib').fees[0].next")==='2026-10-05'&&run("D.txns.length")===1&&run("D.txns[0].date")==='2026-09-05');
}
{ // ١١ الشهادات
  const {run,doc,B}=boot(seed());
  run("certDraft={amount:'10000',monthly:'150',day:'',start:'2024-03-10',end:'2027-03-10',account:'cib',bank:'cib',ded:false,fee:'',type:'cert'};");
  t('شهادة قديمة: آخر عائد افتراضي الشهر ده', run("certLastDue(certDraft)")==='2026-09');
  run("certDraft.lastGot='2026-07';app.addCert();");
  t('اتسجل بس أغسطس وسبتمبر', run("D.txns.filter(x=>/عائد/.test(x.note)).length")===2);
  const c=run("D.certs[0].id");
  run("app.renewCert('"+c+"');app.renewCert('"+c+"');");
  t('تجديدين: ٩ سنين من الأول', run("D.certs[0].end")==='2033-03-10', run("D.certs[0].end"));
  const S=seed();
  const r=boot(S,Date.UTC(2027,2,9,9));
  r.run("certDraft={amount:'5000',monthly:'80',day:'',start:'2024-03-10',end:'2027-03-10',account:'cib',bank:'cib',ded:true,fee:'',type:'cert'};app.addCert();");
  const cid=r.run("D.certs[0].id");
  r.run("app.go('wallet');app.setWtab('certs');app.startCertEdit('"+cid+"');");
  t('قبل الميعاد بيوم: مفيش خانة غرامة', r.V().indexOf('id="cpen"')<0&&r.V().indexOf('مفيش غرامة')>-1);
  r.doc.getElementById('cpen').value='300';r.run("app.breakCert('"+cid+"');");
  t('ومفيش غرامة اتسجلت', r.run("D.txns.filter(x=>/غرامة/.test(x.note)).length")===0);
  const b0=r.B('me','cib');r.run("app.delCert('"+cid+"');");
  t('مسح الشهادة المكسورة مابيغيّرش الرصيد', r.B('me','cib')===b0);
  r.run("certDraft={amount:'5000',monthly:'80',day:'',start:'2026-01-10',end:'2029-01-10',account:'cib',bank:'cib',ded:true,fee:'',type:'cert'};app.addCert();");
  const c2=r.run("D.certs[0].id");r.doc.getElementById('camt').value='6000';r.doc.getElementById('cmo').value='';
  r.run("certEdit='"+c2+"';app.saveCertEdit('"+c2+"');");
  t('تعديل المبلغ عدّل حركة الشراء', r.run("D.txns.find(x=>x.certBuy==='"+c2+"').amount")===6000);
}
{ // ١٢ عايد الادخار الشهري على متوسط الرصيد
  const S=seed();S.accounts.push({id:'sv',name:'وعاء',opening:0,scope:'me',atype:'save',saveFreq:'month',saveDay:1,saveStart:'2026-08-01',saveRate:12,saveRates:[{from:'2026-08-01',rate:12}]});
  S.txns=[{id:'d1',book:'me',kind:'transfer',amount:10000,account:'cib',to:'sv',date:'2026-08-31',note:'إيداع'}];
  const {run}=boot(S);
  run("saveAccrueAll();");
  const y=run("(D.txns.find(x=>x.saveInt&&x.date==='2026-09-01')||{}).amount");
  t('حطيت ١٠ آلاف آخر يوم: عايد يوم واحد مش شهر كامل', y>0&&y<10, y);
}
{ // ١٣ التقفيل
  const S=seed({lastClose:'2026-09-20',closings:[{id:'k',from:'2026-09-01',to:'2026-09-20',settled:false,settleIds:[]}],
    txns:[{id:'o1',book:'office',kind:'expense',amount:100,account:'ocash',date:'2026-09-22',item:'ورق',note:'ورق',ocat:'c1'},
      {id:'o2',book:'office',kind:'expense',amount:50,account:'cash',date:'2026-09-21',item:'حبر',note:'حبر',ocat:'c1'}]});
  const {run}=boot(S);
  run("app.setBook('office');closeTo='2026-09-15';app.closePeriod();");
  t('ماينفعش يقفل لورا', run("D.closings.length")===1);
  run("closeTo='2026-09-21';closeMode='settle';closeFee=false;app.closePeriod();");
  const st=JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.kind==='settle'&&x.book==='office'))"));
  t('التسوية بأرصدة يوم التقفيل (مصروف ٢٢ مش داخل)', st.find(x=>x.account==='ocash').amount===3000);
  t('والكاش الشخصي اللي عليه فلوس مكتب اتسوّى', !!st.find(x=>x.account==='cash'&&x.amount===50&&x.dir==='in'));
}
done();
