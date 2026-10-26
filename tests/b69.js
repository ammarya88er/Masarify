// المواعيد: الاشتراك «مستني الخصم» والشهادة «مستني العائد»
const {boot,seed,t,done}=require('./harness');
const OCT13=Date.UTC(2026,9,13,9,0,0), OCT14=Date.UTC(2026,9,14,9,0,0);
const sub=o=>Object.assign({id:'s1',name:'نت',amount:300,cur:'EGP',cycle:'monthly',next:'2026-10-13',account:'cib',cat:'subs',payments:[],dues:[]},o||{});
{ // في يومه: مستني، مايتسجلش لوحده
  const {run,V}=boot(seed({subs:[sub()],_pendSince:'2026-10-01'}),OCT13);
  run("render();app.go('home');alertsOpen=true;render();");
  t('في يومه مابيتسجلش لوحده', run("D.txns.length")===0);
  t('ظاهر «مستني الخصم» ومعاه «اتخصم» و«لسه»', V().indexOf('مستني الخصم')>-1&&V().indexOf("app.subCharged('s1')")>-1&&V().indexOf("app.subHold('s1')")>-1);
  run("app.subCharged('s1');");
  t('«اتخصم» سجّله بالنهارده والميعاد الجاي اتحرك', run("D.txns.length")===1&&run("D.txns[0].date")==='2026-10-13'&&run("D.subs[0].next")==='2026-11-13');
}
{ // عدّى اليوم من غير ما تدوس: بيفضل «مستني الخصم» ومايتسجلش لوحده
  const s=seed({subs:[sub()],_pendSince:'2026-10-01'});
  const {run,V}=boot(s,OCT14);run("render();runAuto&&runAuto();app.go('home');alertsOpen=true;render();");
  t('مااتسجلش لوحده بعد يومه', run("D.txns.length")===0, run("JSON.stringify(D.txns)"));
  t('لسه «مستني الخصم»', V().indexOf('مستني الخصم')>-1&&V().indexOf("app.subCharged('s1')")>-1);
  run("app.subCharged('s1');");
  t('«اتخصم» بعدها: بتاريخ يومه', run("D.txns.length")===1&&run("D.txns[0].date")==='2026-10-13');
}
{ // «لسه»: يفضل مستني حتى بعد اليوم
  const {run,V}=boot(seed({subs:[sub()],_pendSince:'2026-10-01'}),OCT13);
  run("render();app.subHold('s1');");
  const saved=run("localStorage.getItem('masareef:v3')");
  const r=boot(JSON.parse(saved),OCT14);r.run("render();runAuto&&runAuto();app.go('home');alertsOpen=true;render();");
  t('بعد «لسه» مااتسجلش لوحده', r.run("D.txns.length")===0);
  t('ولسه فيه «اتخصم» من غير «لسه» تاني', r.V().indexOf("app.subCharged('s1')")>-1&&r.V().indexOf("app.subHold('s1')")<0);
  r.run("app.subCharged('s1');");
  t('اتسجل بيوم الدوسة، والجاي في يومه الأصلي', r.run("D.txns[0].date")==='2026-10-14'&&r.run("D.subs[0].next")==='2026-11-13');
}
{ // مفيش خانة ساعة
  const {run,V}=boot(seed(),OCT13);
  run("app.go('wallet');app.setWtab('subs');showSub=true;render();");
  t('خانة الساعة اتشالت', V().indexOf('ساعة الخصم')<0);
}
const cert=o=>Object.assign({id:'c1',name:'شهادة 1',amount:10000,monthly:162.5,start:'2026-07-13',account:'cib',bank:'cib',end:'2029-07-13',covered:'2026-09',payments:[{d:'2026-09-13',t:'x'}]},o||{});
{ // العائد بيستنى «نزل»
  const {run,V,els}=boot(seed({certs:[cert()],_certp1:1}),OCT13);
  run("render();catchUp();app.go('home');alertsOpen=true;render();");
  t('مااتسجلش لوحده', run("D.txns.filter(x=>/عائد/.test(x.note)).length")===0);
  t('ظاهر «مستني العائد» وزرار «نزل»', V().indexOf('مستني العائد')>-1&&V().indexOf("app.certPayOpen('c1',1)")>-1);
  run("app.certPayOpen('c1');");
  t('الزرار بيفتح الشهادة ومعاها التاريخ والمبلغ', run("tab")==='wallet'&&V().indexOf('id="cera"')>-1);
  els['cerd']={value:'2026-10-13'};els['cera']={value:'165.20'};run("app.confirmCertEarly('c1');");
  const tx=JSON.parse(run("JSON.stringify(D.txns.find(x=>/عائد/.test(x.note)))"));
  t('اتسجل بمبلغه وتاريخه', tx&&tx.amount===165.2&&tx.date==='2026-10-13');
  // مسح العائد: الشهر يرجع مستني
  run("app.delTxn({stopPropagation(){}},'"+tx.id+"')");
  t('مسح آخر عائد رجّعه «مستني»', run("D.certs[0].covered")==='2026-09'&&run("certWaiting(D.certs[0])")===true);
}
{ // قبل الميعاد بأسبوع: «نزل؟» تحت العائد الجاي، ومش جوه «عدّل»
  const {run,V}=boot(seed({certs:[cert()],_certp1:1}),Date.UTC(2026,9,8,9));
  run("app.go('wallet');app.setWtab('certs');");
  t('«نزل؟» ظاهر في صف الشهادة', V().indexOf("app.certPayOpen('c1')")>-1&&V().indexOf('نزل؟')>-1);
  run("app.startCertEdit('c1');");
  t('مفيش «نزل بدري» في عدّل', V().indexOf('نزل بدري')<0);
  const r=boot(seed({certs:[cert()],_certp1:1}),Date.UTC(2026,9,1,9));r.run("app.go('wallet');app.setWtab('certs');");
  t('قبلها بأكتر من أسبوع: مفيش زرار', r.V().indexOf('نزل؟')<0);
}
{ // شهادة جديدة قديمة: العوائد اللي فاتت بتتسجل وقت الإضافة بس
  const {run}=boot(seed(),OCT13);
  run("certDraft={amount:'5000',monthly:'80',day:'',start:'2026-08-01',end:'',account:'cib',bank:'cib',ded:true,fee:'',type:'cert'};app.addCert();");
  t('عائد سبتمبر وأكتوبر اتسجلوا وقت الإضافة', run("D.txns.filter(x=>/عائد/.test(x.note)).length")===2);
}
{ // مراجعة: الاشتراك المتأخر بيتسجل بيوم ميعاده ودوسة واحدة بس، والتراجع عن التلقائي مايرجعش يتسجل
  const {run}=boot(seed({subs:[sub({next:'2026-10-11'})],_pendSince:'2026-10-20'}),OCT13);
  run("render();app.subCharged('s1');app.subCharged('s1');");
  t('المتأخر: حركة واحدة بيوم ميعاده', run("D.txns.length")===1&&run("D.txns[0].date")==='2026-10-11'&&run("D.subs[0].next")==='2026-11-11');
  const r=boot(seed({subs:[sub({next:'2026-10-12'})],_pendSince:'2026-10-01'}),OCT13);r.run("render();runAuto();");
  t('مااتسجلش لوحده', r.run("D.txns.length")===0);
  r.run("app.subCharged('s1');app.undoSubPay('s1');runAuto();");
  t('التراجع: مااتسجلش تاني ورجع مستني', r.run("D.txns.length")===0&&r.run("D.subs[0].next")==='2026-10-12');
}
{ // خصم اتسجل من رسالة البنك قبل ما الاشتراك يتسجل لوحده: مايتكررش
  const {run}=boot(seed({subs:[sub({next:'2026-10-12'})],_pendSince:'2026-10-01',
    txns:[{id:'sms1',book:'me',kind:'expense',amount:300,cat:'other',account:'cib',date:'2026-10-12',fromSms:true,note:'NET'}]}),OCT13);
  run("render();runAuto();app.subCharged('s1');");
  t('اتربط بالخصم بتاع الرسالة', run("D.txns.length")===1&&run("D.subs[0].payments[0].t")==='sms1'&&run("D.txns[0].cat")==='subs');
}
{ // شهرين عائد متأخرين: التاني بيتسجل بتاريخه
  const c={id:'c1',name:'شهادة 1',amount:10000,monthly:100,start:'2026-07-13',account:'cib',bank:'cib',end:'',covered:'2026-09',payments:[{d:'2026-09-13'}]};
  const {run,els}=boot(seed({certs:[c],_certp1:1}),Date.UTC(2026,10,15,9));
  els['cerd']={value:'2026-10-13'};els['cera']={value:'100'};run("app.certPayOpen('c1',1);app.confirmCertEarly('c1');");
  els['cerd']={value:'2026-11-13'};els['cera']={value:'100'};run("app.certPayOpen('c1',1);app.confirmCertEarly('c1');");
  t('أكتوبر ونوفمبر اتسجلوا', run("D.txns.filter(x=>/عائد/.test(x.note)).length")===2&&run("D.certs[0].covered")==='2026-11');
  els['cerd']={value:'2026-10-20'};run("app.certPayOpen('c1',1);app.confirmCertEarly('c1');");
  t('تاريخ قبل الميعاد بأكتر من أسبوع: مايتسجلش', run("D.txns.filter(x=>/عائد/.test(x.note)).length")===2);
}
done();
