// عائد شهادة نزل بدري، ونقط الياء في عنوان الحركة
const {boot,seed,t,done}=require('./harness');
const OCT8=Date.UTC(2026,9,8,6,0,0);
const cert=(o)=>Object.assign({id:'c4',name:'شهادة 4',amount:10000,rate:19.5,monthly:162.5,start:'2026-08-10',account:'cib',bank:'cib',
  end:'2029-08-12',covered:'2026-09',payments:[{d:'2026-09-10',t:'x'}]},o||{});
const cnt=run=>run("D.txns.filter(t=>t.note==='شهادة 4 — عائد').length");
{
  const {run,els,V}=boot(seed({_certp1:1,certs:[cert(),cert({id:'c3',name:'شهادة 3',start:'2026-07-15',payments:[]})]}),OCT8);
  run("app.go('wallet');app.setWtab('certs');");
  t('قبل الميعاد بأسبوع: «نزل؟» في صف الشهادة', V().indexOf("app.certPayOpen('c4')")>-1);
  run("app.startCertEdit('c4');");
  t('«عدّل» مافيهوش سؤال نزل بدري', V().indexOf('نزل بدري')<0&&V().indexOf('id="cmo"')>-1);
  run("app.certPayOpen('c4');");
  t('«نزل؟»: التاريخ والمبلغ', V().indexOf('id="cerd"')>-1&&/id="cera"[^>]*value="162.5"/.test(V()));
  els['cerd']={value:'2026-10-07'};els['cera']={value:'167.92'};
  const b0=run("balances('me').cib");
  run("app.confirmCertEarly('c4');");
  const tx=JSON.parse(run("JSON.stringify(D.txns.find(t=>t.note==='شهادة 4 — عائد'))"));
  t('اتسجل بتاريخه ومبلغه', tx&&tx.date==='2026-10-07'&&tx.amount===167.92&&tx.kind==='income'&&tx.account==='cib');
  t('الرصيد زاد', Math.round((run("balances('me').cib")-b0)*100)/100===167.92);
  t('العائد الشهري زي ما هو', run("D.certs[0].monthly")===162.5&&run("D.certs[0].covered")==='2026-10');
  t('بعد التسجيل: «نزل؟» مش باين لنفس الشهادة', V().indexOf("app.certPayOpen('c4')")<0);
  t('الشهادة التانية لسه بيظهر لها', V().indexOf("app.certPayOpen('c3')")>-1);
  run("runAuto();");
  t('يوم ١٠ مش بيتسجل تاني', cnt(run)===1);
}
{ // في يوم ١٠ نفسه: مايتسجلش تاني
  const s=seed({certs:[cert()],_certp1:1});
  const {run,els}=boot(s,OCT8);
  run("app.go('wallet');app.setWtab('certs');app.certPayOpen('c4');");
  els['cerd']={value:'2026-10-07'};els['cera']={value:'167.92'};run("app.confirmCertEarly('c4');");
  const saved=run("localStorage.getItem('masareef:v3')");
  const r2=boot(JSON.parse(saved),Date.UTC(2026,9,10,9,0,0));r2.run("render();runAuto();render();");
  t('بعد ما ييجي ميعاده: مرة واحدة', cnt(r2.run)===1);
  const r3=boot(JSON.parse(saved),Date.UTC(2026,10,10,9,0,0));r3.run("render();runAuto();");
  t('الشهر الجاي مستني «نزل» بـ١٦٢٫٥٠', cnt(r3.run)===1&&r3.run("certWaiting(D.certs[0])")===true&&r3.run("D.certs[0].monthly")===162.5);
}
{ // تاريخ غلط
  const {run,els}=boot(seed({certs:[cert()],_certp1:1}),OCT8);
  run("app.go('wallet');app.setWtab('certs');app.certPayOpen('c4');");
  els['cerd']={value:'2026-10-09'};els['cera']={value:'160'};run("app.confirmCertEarly('c4');");
  t('تاريخ بعد النهارده: مايتسجلش', cnt(run)===0);
  els['cerd']={value:'2026-09-10'};run("app.confirmCertEarly('c4');");
  t('تاريخ العائد اللي فات: مايتسجلش', cnt(run)===0);
}
{ // بعيد عن ميعاده: الزرار مش باين
  const {run,V}=boot(seed({certs:[cert()],_certp1:1}),Date.UTC(2026,9,1,9,0,0));
  run("app.go('wallet');app.setWtab('certs');");
  t('قبل الميعاد بأكتر من أسبوع: مفيش «نزل؟»', V().indexOf("app.certPayOpen('c4')")<0);
}
{ // عنوان الحركة مساحته مكفية لنقط الياء
  const {run}=boot(seed());
  t('سطر العنوان ١٫٨', /\.tx \.t\{[^}]*line-height:1\.8/.test(run("1")===1?require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8'):''));
}
{ // مسح آخر عائد: بيرجع مستني، وعائد اتمسح قبل التحديث بيرجع مستني كمان
  const {run}=boot(seed({certs:[cert({covered:'2026-10',payments:[{d:'2026-09-10',t:'x'},{d:'2026-10-10',t:'y'}]})],
    txns:[{id:'x',book:'me',kind:'income',amount:162.5,account:'cib',date:'2026-09-10',note:'شهادة 4 — عائد',icat:'certint'},{id:'y',book:'me',kind:'income',amount:162.5,account:'cib',date:'2026-10-10',note:'شهادة 4 — عائد',icat:'certint'}]}),Date.UTC(2026,9,12,9,0,0));
  run("app.delTxn({stopPropagation(){}},'y')");
  t('مسح عائد أكتوبر: أكتوبر رجع مستني', run("D.certs[0].covered")==='2026-09'&&run("certWaiting(D.certs[0])")===true);
  const r=boot(seed({certs:[cert({covered:'2026-10',payments:[{d:'2026-09-10',t:'x'},{d:'2026-10-10'}]})],
    txns:[{id:'x',book:'me',kind:'income',amount:162.5,account:'cib',date:'2026-09-10',note:'شهادة 4 — عائد',icat:'certint'}]}),Date.UTC(2026,9,12,9,0,0));
  t('اللي اتمسح قبل التحديث رجع مستني', r.run("D.certs[0].covered")==='2026-09'&&r.run("certWaiting(D.certs[0])")===true);
}
done();
