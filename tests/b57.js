// الخصم جوه الفاتورة، وتنبيه كام كيلو لكل لتر
const {boot,seed,t,done}=require('./harness');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
  { // الذكاء الاصطناعي بيرجّع الخصم لوحده — وأي «خصم» بالسالب بيتنقل للسطر
    const mk=json=>{const x=boot(seed());x.run("localStorage.setItem(AKEY,'sk-ant-1');shrink=async()=>'b64';fetch=async()=>({status:200,json:async()=>({stop_reason:'end_turn',content:[{type:'text',text:"+JSON.stringify(json)+"}]})});");return x;};
    let x=mk('{"merchant":"Carrefour","items":[{"name":"عصير","qty":1,"amount":74.99,"cat":"drinks"},{"name":"أرز","qty":1,"amount":104.99,"cat":"grocery"}],"discount":11}');
    x.run("app.go('scan');app.pickFile({files:[{}],value:''})");for(let i=0;i<10;i++)await tick();
    t('الخصم في سطره ومش صنف', x.run("scan.disc")==='11'&&x.run("scan.items.length")===2);
    x=mk('{"merchant":"Carrefour","items":[{"name":"عصير","qty":1,"amount":74.99,"cat":"drinks"},{"name":"خصم","qty":1,"amount":-11,"cat":"other"}]}');
    x.run("app.go('scan');app.pickFile({files:[{}],value:''})");for(let i=0;i<10;i++)await tick();
    t('«خصم» بالسالب بيتنقل لسطر الخصم', x.run("scan.disc")==='11'&&x.run("scan.items.length")===1);
    const P=boot(seed()).run("promptText()");
    t('التعليمات: الخصم في discount مش صنف', P.indexOf('اكتبه في discount')>-1&&P.indexOf('اسمه "خصم"')<0);
  }
  { // السطور التلاتة دايمًا، والأرقام بتتحدث مع بعض
    const {run,V,doc}=boot(seed());
    run("app.go('scan');app.manualBill();app.iset(0,'name','عصير');app.setItemCat(0,D.cats[0].id);app.iset(0,'amount','100');render();");
    let v=V();
    t('من غير خصم: المجموع والخصم والإجمالي ظاهرين', v.indexOf('>المجموع<')>-1&&v.indexOf('id="rdisc"')>-1&&v.indexOf('>الإجمالي<')>-1&&v.indexOf('خصم على الفاتورة')<0);
    run("app.scanDisc('10');");
    t('الخصم: الإجمالي وزرار الحفظ بعد الخصم، والمجموع قبله', doc.getElementById('rsum').textContent==='100'&&doc.getElementById('rtot').textContent==='90'&&doc.getElementById('saveRec').textContent==='احفظ الفاتورة — 90 جنيه');
    run("app.iset(0,'amount','120');");
    t('تعديل صنف بعد الخصم: الخصم فاضل', doc.getElementById('rsum').textContent==='120'&&doc.getElementById('rtot').textContent==='110'&&doc.getElementById('saveRec').textContent==='احفظ الفاتورة — 110 جنيه');
    run("render();");v=V();
    t('بعد الرسم: نفس الأرقام', /id="rsum">120</.test(v)&&/id="rtot">110</.test(v)&&v.indexOf('احفظ الفاتورة — 110 جنيه')>-1&&/id="rdisc"[^>]*value="10"/.test(v));
    run("app.scanAccount('cash');app.saveReceipt();");
    t('اتسجلت بعد الخصم', run("D.txns[0].amount")===110&&run("D.txns[0].discount")===10);
  }
  { // متربوطة بخصم رسالة بنك: الخصم بيتحسب
    const {run}=boot(seed({txns:[{id:'n1',book:'me',kind:'expense',amount:90,cat:'other',account:'card',date:'2026-09-24',fromSms:true,needs:true}]}));
    run("app.go('home');app.startNeeds('n1');app.ndMode('manual');app.iset(0,'name','عصير');app.setItemCat(0,D.cats[0].id);app.iset(0,'amount','100');app.scanDisc('10');app.saveReceipt();");
    t('على الخصم: الفاتورة بعد الخصم = المخصوم', !run("D.txns[0].needsDiff")&&run("D.txns[0].discount")===10&&!run("D.txns[0].needs"));
  }
  { // كام كيلو لكل لتر
    const f=(id,date,odo,liters,o)=>Object.assign({id,book:'me',kind:'expense',amount:liters*17,cat:'fuel',account:'cash',date,veh:'v1',fuelType:'٩٥',liters,odo},o||{});
    const old=[f('a','2026-09-01',5800,5),f('b','2026-09-08',5890,6),f('c','2026-09-15',5986,3.23)];
    const {run,V}=boot(seed({txns:old}));
    run("app.go('home');alertsOpen=true;render();");
    t('التفويلات القديمة مش بتطلع تنبيه', V().indexOf('بنزين — ')<0);
    run("D.txns.unshift("+JSON.stringify(f('d','2026-09-23',6084,6))+");render();");
    let v=V();
    t('تفويلة جديدة: ٩٨ كم على ٦ لتر = ١٦٫٣٣', v.indexOf('بنزين — العربية')>-1&&/>98<\/span> كم على <span class="n">6</.test(v)&&/>16.33<\/span> كم\/لتر/.test(v));
    t('معاه المتوسط من آخر ٤', v.indexOf('المتوسط <span class="n">'+run("String(vehStats('v1').kmPerL)"))>-1);
    t('في مجموعة المعلومات (رمادي)', /data-g="4"[^>]*><\/span>\s*<span class="g"><span class="t">بنزين/.test(v));
    run("app.fuelSeen('v1');");
    t('شفتها بتخفيه', V().indexOf('بنزين — ')<0);
    run("D.txns.unshift("+JSON.stringify(f('e','2026-09-30',6180,5,{litersEst:true}))+");render();");
    v=V();
    t('التفويلة اللي بعدها بتطلع تاني، والتقريبي مكتوب', v.indexOf('بنزين — ')>-1&&v.indexOf('(تقريبي)')>-1);
    run("D.txns.unshift("+JSON.stringify(f('g','2026-10-03',0,4))+");render();");
    t('تفويلة من غير عداد: مفيش حسبة جديدة', run("fuelPair('v1').t.id")==='e');
  }
  done();
})();
