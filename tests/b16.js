const {boot,seed,t,done,r2}=require('./harness');
{ // تذكير السداد بالتواريخ (كشف ٢٠، ميعاد ١٥)
  const S=seed({txns:[
    {id:'p',book:'me',kind:'expense',amount:1000,cat:'grocery',account:'card',date:'2026-09-10'},
    {id:'h',book:'me',kind:'expense',amount:300,cat:'subs',account:'card',date:'2026-09-12',usd:6,hold:true,pending:true},
    {id:'r',book:'me',kind:'expense',amount:200,cat:'other',account:'card',date:'2026-09-13',refundSince:'2026-09-14'},
    {id:'n',book:'me',kind:'expense',amount:700,cat:'other',account:'card',date:'2026-09-22'}]});
  S.accounts[2].insure=false;
  let b=boot(S,Date.UTC(2026,8,19,9,0,0));b.run("app.go('home');alertsOpen=true;render();");
  t('قبل يوم الكشف مفيش تنبيه', b.V().indexOf("app.goPayCard('card')")<0 && b.run("cardNextDue(D.accounts[2])")==='2026-10-15');
  b=boot(S);b.run("app.go('home');alertsOpen=true;render();");let v=b.V();
  t('بعد الكشف التنبيه ظاهر ومن غير مبلغ', v.indexOf("app.goPayCard('card')")>-1 && v.indexOf('سداد كارت المشتريات')>-1 && !/1,000|1,700/.test(v.slice(v.indexOf('سداد كارت المشتريات'),v.indexOf("app.goPayCard('card')"))));
  t('المطلوب من الكشف ١٠٠٠ بس (من غير المحجوز والمرتجع واللي بعد الكشف)', b.run("cardStmtLeft(D.accounts[2],'2026-09')")===1000);
  t('الترحيل ربط الكارت بالبنك الوحيد', b.run("D.accounts.find(a=>a.id==='card').payFrom")==='cib');
  b.run("app.seeDue('card','2026-10-15');");t('شفتها بتخفيه', b.V().indexOf("app.goPayCard('card')")<0);
  b.run("D.txns.unshift({id:'sal',book:'me',kind:'income',salary:true,amount:5000,account:'cib',date:'2026-09-25',_q:++D._qmax});render();");
  t('بعد مرتب جديد بيرجع', b.V().indexOf("app.goPayCard('card')")>-1);
  b.run("payCard={id:'card',mode:'part',amount:'400',from:'',date:'2026-09-25'};app.doPayCard('card',1000);render();");
  t('سداد جزء: لسه ظاهر', b.V().indexOf("app.goPayCard('card')")>-1 && b.run("cardStmtLeft(D.accounts[2],'2026-09')")===600);
  b.run("payCard={id:'card',mode:'part',amount:'600',from:'',date:'2026-09-25'};app.doPayCard('card',1000);render();");
  t('سداد الباقي: اختفى', b.V().indexOf("app.goPayCard('card')")<0);
  const b2=boot(S,Date.UTC(2026,9,13,9,0,0));b2.run("app.seeDue('card','2026-10-15');app.go('home');alertsOpen=true;render();");
  t('قبل الميعاد بـ٣ أيام شفتها مالهاش تأثير', b2.V().indexOf("app.goPayCard('card')")>-1 && b2.V().indexOf("app.seeDue(")<0);
  const b3=boot(S,Date.UTC(2026,9,15,9,0,0));b3.run("app.go('home');alertsOpen=true;render();");
  t('يوم الميعاد أحمر', b3.V().indexOf('النهارده آخر ميعاد سداد')>-1);
  b3.run("app.goPayCard('card');app.payCardMode('part');");v=b3.V();
  t('سدد بيفتح السداد ومبلغ تاني فيه الكامل', b3.run("tab")==='wallet' && /value="2200"/.test(v), (v.match(/value="[0-9.]+"/g)||[]).join());
  const b4=boot(S,Date.UTC(2026,9,17,9,0,0));b4.run("app.go('home');alertsOpen=true;render();");
  t('بعد الميعاد مفيش تنبيه لحد الكشف الجاي', b4.V().indexOf("app.goPayCard('card')")<0);
}
{ // أقساط الكارت بتتحرك يوم الميعاد
  const S=seed({installments:[{id:'i',name:'x',src:'card',account:'card',monthly:500,months:6,paid:0,day:20,covered:'',firstMonth:'2026-10',payments:[],total:3000}]});
  S.accounts[2].insAdv='2026-08';
  const b=boot(S,Date.UTC(2026,9,16,9,0,0));
  t('القسط اتحرك مرة واحدة بعد ميعاد ١٥ أكتوبر', b.run("D.installments[0].paid")===1 && b.run("D.accounts[2].insAdv")==='2026-09', b.run("D.installments[0].paid")+' '+b.run("D.accounts[2].insAdv"));
}
{ // ٦٠ وقف الكارت
  const S=seed({txns:[{id:'p',book:'me',kind:'expense',amount:500,cat:'grocery',account:'card',date:'2026-09-24'}]});
  const {run,V}=boot(S);
  run("app.stopCard('card');");
  t('٦٠ مايتوقفش وعليه فلوس', !run("D.accounts.find(a=>a.id==='card').closed"));
  run("D.txns=[];app.stopCard('card');");
  t('٦٠ اتوقف', run("D.accounts.find(a=>a.id==='card').closed")===true);
  run("app.go('add');draft.kind='expense';render();");
  t('٦٠ مش ظاهر في الإضافة', V().indexOf("app.setAccount('card')")<0);
  run("app.reopenCard('card');app.go('add');draft.kind='expense';openRow={};render();");
  t('٦٠ رجع', V().indexOf("app.setAccount('card')")>-1);
}
{ // ٥٩ شراء شهادة بخصم ومصاريف، وعوايد في وعاء
  const S=seed();S.accounts.push({id:'th',name:'ثاندر',opening:0,scope:'me',atype:'save',saveFreq:'month',saveDay:5,saveStart:'2026-01-01',saveRate:0,saveRates:[{from:'2026-01-01',rate:0}]});
  const {run,B,doc}=boot(S);
  run("certDraft={amount:'5000',monthly:'100',day:'1',start:'2026-07-01',end:'2029-07-01',account:'th',bank:'cib',ded:true,fee:'25',type:'cert'};app.addCert();");
  t('٥٩ اتخصم ٥٠٠٠ + ٢٥', B('me','cib')===4975, B('me','cib'));
  t('٥٩ العوايد في الوعاء عايد', run("D.txns.filter(x=>x.kind==='yield'&&x.account==='th').length")===2);
  const cid=run("D.certs[0].id");
  run("certEdit='"+cid+"';");doc.getElementById('cpen').value='200';run("app.breakCert('"+cid+"');");
  t('٥٩ الكسر رجّع الأصل وخصم الغرامة', B('me','cib')===4975+5000-200, B('me','cib'));
  run("catchUp();");
  t('٥٩ مفيش عوايد بعد الصرف', run("D.txns.filter(x=>x.kind==='yield').length")===2);
  run("app.delCert('"+cid+"');");
  t('٥٩ المسح مابيمسحش حركات الحساب (الشراء والصرف والغرامة فضلوا)', B('me','cib')===4975+5000-200&&run("D.certs.length")===0, B('me','cib'));
}
{ // ٥٩ ضامنة: مفيش كسر ولا صرف، وتنبيه التجديد
  const S=seed({certs:[{id:'c1',name:'شهادة ١',type:'cert',amount:20000,monthly:0,start:'2025-09-01',end:'2026-09-01',account:'cib',bank:'cib',covered:'2026-09',payments:[]}]});
  S.accounts[2].secured=['c1'];
  const {run,V,B}=boot(S);run("app.go('home');alertsOpen=true;render();");
  t('٥٩ تنبيه التجديد', V().indexOf("app.renewCert('c1')")>-1);
  t('٥٩ مفيش صرفتها وهي ضامنة', V().indexOf("app.cashCert('c1')")<0);
  run("app.breakCert('c1');app.cashCert('c1');");
  t('٥٩ الكسر ممنوع وهي ضامنة', !run("D.certs[0].redeemed"));
  run("app.renewCert('c1');");
  t('٥٩ جددتها سنة', run("D.certs[0].end")==='2027-09-01');
  run("app.stopCard('card');D.certs[0].end='2026-09-01';render();");
  t('٥٩ بعد وقف الكارت صرفتها ظهرت', V().indexOf("app.cashCert('c1')")>-1);
  run("app.cashCert('c1');");
  t('٥٩ صرفتها رجّعت المبلغ', B('me','cib')===30000, B('me','cib'));
}
{ // حماية المسح
  const S=seed({certs:[{id:'c1',name:'شهادة ١',type:'cert',amount:1000,monthly:0,start:'2026-01-01',end:'',account:'cash',bank:'cib',covered:'2026-09',payments:[]}]});
  const {run}=boot(S);
  run("app.delAccount('cib');");
  t('حماية: الحساب مااتمسحش', run("D.accounts.some(a=>a.id==='cib')"));
}
{ // ترحيل شهادة قديمة
  const S=seed({certs:[{id:'c1',name:'شهادة ١',type:'cert',amount:1000,monthly:10,start:'2026-01-01',end:'',account:'cib',covered:'2026-09',payments:[]}]});
  const {run,B}=boot(S);
  t('ترحيل: البنك = حساب العوايد، والرصيد مااتلمسش', run("D.certs[0].bank")==='cib' && run("D.certs[0].legacy")===true && B('me','cib')===10000);
}
done();
