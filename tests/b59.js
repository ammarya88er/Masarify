// الحروف اللي شبه بعض، الأصناف الفاضية في الفاتورة اليدوي، والخانات اللي مابتتمسحش لما ترجع للبرنامج
const {boot,seed,t,done}=require('./harness');
const ex=(id,date,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date},o||{});
{ // normTxt في الاتجاهين
  const {run}=boot(seed());
  const pairs=[['چ','ج'],['ڤ','ف'],['پ','ب'],['گ','ك'],['ژ','ز'],['ؤ','و'],['ئ','ي'],['أ','ا'],['إ','ا'],['آ','ا'],['ة','ه'],['ى','ي']];
  t('كل حرف زي نظيره', pairs.every(([a,b])=>run(`normTxt('${a}')===normTxt('${b}')`)));
  t('الفارسي زي ما هو والأرقام بتبقى إنجليزي', run("normTxt('ک')!==normTxt('ك')&&normTxt('ی')!==normTxt('ي')&&normTxt('١٢')==='12'"));
}
{ // البحث في السجل
  const s=seed({txns:[ex('a','2026-09-20',50,{items:[{name:'چيتوس',amount:50,cat:'other'}]}),ex('b','2026-09-21',30,{note:'جيبسي'})]});
  const {run,V}=boot(s);
  run("app.go('log');q='جيتوس';render();");
  t('«جيتوس» بيلاقي «چيتوس» (سطر الصنف)', V().indexOf('چيتوس')>-1&&V().indexOf('سطر واحد')>-1, V().slice(0,300));
  run("q='چيبسي';render();");
  t('«چيبسي» بيلاقي «جيبسي» (بالعكس)', V().indexOf('جيبسي')>-1&&V().indexOf('حركة واحدة')>-1);
}
{ // سعر الصنف وأسامي الأصناف
  const s=seed({txns:[ex('a','2026-09-10',40,{items:[{name:'چيتوس',amount:40,cat:'other'}]}),ex('b','2026-09-12',10,{items:[{name:'جيتوس',amount:10,cat:'other'},{name:'مياة',amount:5,cat:'other'}]})]});
  const {run}=boot(s);
  const h=JSON.parse(run("JSON.stringify(itemLast('جيتوس',12,1))"));
  t('تتبع السعر بيجمع الاسمين', h&&h.price===10&&h.date==='2026-09-12');
  t('تتبع السعر بالعكس', JSON.parse(run("JSON.stringify(itemLast('چيتوس',12,1))")).price===10);
  t('الأسامي اللي بتروح للقراءة من غير تكرار', JSON.parse(run("JSON.stringify(scanKnownNames())")).filter(n=>/يتوس/.test(n)).length===1);
}
{ // الناس: «أحمد» و«احمد» واحد
  const s=seed({owed:[{id:'o1',amount:100,who:'أحمد',date:'2026-09-20',note:'غدا'},{id:'o2',amount:50,who:'احمد',date:'2026-09-21',note:'بنزين'}],
    txns:[{id:'d1',book:'me',kind:'settle',dir:'in',debt:true,amount:30,account:'cash',date:'2026-09-22',from:'احمد',note:'سلفة'},
          {id:'d2',book:'me',kind:'settle',dir:'in',debt:true,amount:20,account:'cash',date:'2026-09-23',from:'أحمد',note:'سلفة'}]});
  const {run}=boot(s);
  const L=JSON.parse(run("JSON.stringify(peopleLedger().map(x=>({who:x.who,r:x.recTot,d:x.debtTot,n:x.net})))"));
  t('سطر واحد بالاسم اللي ظهر الأول', L.length===1&&L[0].who==='أحمد', JSON.stringify(L));
  t('ليك ١٥٠ وعليك ٥٠', L[0].r===150&&L[0].d===50&&L[0].n===100);
  t('الأسامي المقترحة من غير تكرار', JSON.parse(run("JSON.stringify(personNames())")).length===1);
  run("app.go('home');app.startOwedGet('g_أحمد');app.setOwedAcct('cash');app.confirmOwedGet('g_أحمد');");
  t('الاستلام بيقفل الاتنين', run("D.owed.every(o=>o.got)"));
  t('والسلفتين اتخصموا', run("debtItems('احمد').length")===0&&run("peopleLedger().length")===0);
}
{ // الفاتورة اليدوي
  const {run,V}=boot(seed());
  run("app.go('scan');app.manualBill();");
  t('أول صنف فاضي من غير تصنيف', run("scan.items[0].name===''&&scan.items[0].amount===0&&scan.items[0].cat===''"));
  t('مكتوب «التصنيف»', /class="ct ph">التصنيف ▾<select/.test(V()));
  run("app.addItem();");
  t('«ضيف صنف ناقص» فاضي برضو', run("scan.items[1].name===''&&scan.items[1].cat===''"));
  run("app.scanAccount('cash');app.iset(0,'name','عصير');app.iset(0,'amount','40');");
  t('الحفظ مقفول لحد ما تختار تصنيف', run("scanSaveOk()")===false&&run("document.getElementById('saveRec').disabled")===true);
  t('«اختار تصنيف لكل صنف»', run("document.getElementById('catneed').style.display")==='');
  run("render();");
  t('الرسالة باينة في الشاشة', /id="catneed" style="text-align:center;margin-top:8px">اختار تصنيف لكل صنف/.test(V()));
  run("app.setItemCat(0,D.cats[0].id);");
  t('اختار التصنيف: الحفظ اتفتح والرسالة اختفت', run("__yn(),scanSaveOk()")===true&&/id="catneed" style="[^"]*display:none"/.test(V()), (V().match(/id="catneed"[^>]*>/)||[''])[0]);
  run("app.iset(1,'amount','5');");
  t('صنف فيه مبلغ من غير تصنيف بيقفل تاني', run("scanSaveOk()")===false);
  run("app.iset(1,'amount','');");
  const n0=run("D.txns.length");run("app.saveReceipt();");
  t('الصف الفاضي بيتشال وقت الحفظ', run("D.txns.length")===n0+1&&run("D.txns[0].items.length")===1&&run("D.txns[0].amount")===40);
  run("app.manualBill();app.scanAccount('cash');");
  t('فاتورة كلها فاضية مش بتتحفظ', run("scanSaveOk()")===false);
}
{ // الخانات اللي مش متخزنة مابتتمسحش مع الرسم في الخلفية
  const {run,els,doc}=boot(seed());
  const mk=(id,v,dv,h)=>({id,value:v,defaultValue:dv,getAttribute:a=>a==='oninput'?h:null});
  const fixin=mk('fixin','123','27.23','numFix(this,1)'), amt=mk('amt','55','','app.dset(\'amount\',this.value)');
  doc.querySelectorAll=()=>[fixin,amt];
  const m=JSON.parse(run("JSON.stringify(keptVals())"));
  t('بتتحفظ الخانة اللي مش متخزنة بس', m.fixin==='123'&&!('amt' in m), JSON.stringify(m));
  els['fixin']={value:'27.23'};
  run("putVals({fixin:'123'})");
  t('وبترجع بعد الرسم', els['fixin'].value==='123');
  doc.querySelectorAll=()=>[];
}
done();
