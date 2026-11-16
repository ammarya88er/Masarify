// «ضيف بيعة» في «فلوس ليك»، وتفاصيل «تقدر تصرف» في ٣ أقسام
const {boot,seed,t,done}=require('./harness');
const E='{stopPropagation(){}}';
const NOW=Date.UTC(2026,10,16,9);
const sal={id:'sal',book:'me',kind:'income',amount:8000,account:'cib',date:'2026-10-25',salary:true};
{ // البيعة
  const {run,V,B}=boot(seed({txns:[sal]}),NOW);
  const b0=JSON.stringify(run("JSON.stringify(balances('me'))"));
  run("app.go('home');app.spendToggle();");
  t('«ضيف بيعة» موجود حتى لو مفيش حد عليه فلوس', V().indexOf("app.saleGo('spend')")>-1);
  run("app.saleGo('spend');");t('بيسأل بعت إيه، لمين، والمبلغ', V().indexOf("app.saleSet('what'")>-1&&V().indexOf("app.saleSet('who'")>-1&&V().indexOf("app.saleSet('amount'")>-1&&V().indexOf('salesave" disabled')>-1);
  run("app.saleSet('what','لابتوب');app.saleSet('who','كريم');app.saleSet('amount','15000');app.saleSave();");
  t('البيعة اتسجلت من غير ما فلوس تطلع', run("D.sales.length")===1&&JSON.stringify(run("JSON.stringify(balances('me'))"))===b0&&run("D.txns.length")===1);
  const L=JSON.parse(run("JSON.stringify(peopleLedger())"));
  t('الباقي في «اللي ليك» باسم كريم', L.length===1&&L[0].who==='كريم'&&L[0].recTot===15000);
  t('داخل في «ولو رجعلك اللي ليك»', run("spendCalc().rec")===15000);
  run("app.go('home');");t('ظاهرة في «فلوس ليك» من غير ميعاد', V().indexOf('بيعة: لابتوب')>-1&&V().indexOf("app.saleGo('owed')")>-1);
  // استلمت جزء
  run("app.startOwedGet('g_كريم');app.setOwedAcct('cash');app.setOwedGot('5000',0);app.confirmOwedGet('g_كريم');");
  const p=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.saleOf))"));
  t('الدفعة دخل «بيع حاجات» على الحساب', p.kind==='income'&&p.icat==='sale'&&p.amount===5000&&p.account==='cash'&&p.from==='كريم');
  t('«بيع حاجات» لوحده عن المرتب', run("icatOf(D.txns.find(x=>x.saleOf)).label")==='بيع حاجات'&&run("D.icats.some(c=>c.id==='salary')"));
  t('الباقي اتحسب', run("saleLeft(D.sales[0])")===10000&&run("spendCalc().rec")===10000);
  run("app.go('home');");t('بيقول فاضل من المتفق عليه', V().indexOf('فاضل من <span class="n">15,000</span>')>-1);
  // تعديل ومسح الدفعة من السجل
  run("app.go('log');app.toggleTxn('"+p.id+"');app.startTxnEdit("+E+",'"+p.id+"');app.eTxnSet('amount','6000');app.saveTxnEdit('"+p.id+"');");
  t('تعديل الدفعة بيظبط الباقي', run("saleLeft(D.sales[0])")===9000&&run("D.txns.find(x=>x.id==='"+p.id+"').saleOf")===run("D.sales[0].id"));
  run("app.delTxn("+E+",'"+p.id+"');");t('مسح الدفعة: الباقي رجع زي الأول', run("saleLeft(D.sales[0])")===15000);
  run("app.undoLast();");t('التراجع', run("saleLeft(D.sales[0])")===9000);
  // باقي الفلوس كلها
  run("app.startOwedGet('g_كريم');app.setOwedAcct('cib');app.setOwedGot('9000',0);app.confirmOwedGet('g_كريم');");
  t('خلصت: اتشالت من «فلوس ليك»، والدفعات في السجل', run("peopleLedger().length")===0&&run("D.txns.filter(x=>x.saleOf).length")===2&&run("spendCalc().rec")===0);
  // أكتر من الباقي: الزيادة «فرق فلوس»
  run("app.saleGo('owed');saleOpen='spend';app.saleSet('what','كرسي');app.saleSet('who','سامي');app.saleSet('amount','100');app.saleSave();");
  run("app.startOwedGet('g_سامي');app.setOwedAcct('cash');app.setOwedGot('120',0);app.confirmOwedGet('g_سامي');");
  t('وصل أكتر: 100 بيع و20 فرق فلوس', run("D.txns.find(x=>x.note==='بيع — كرسي').amount")===100&&run("D.txns.some(x=>x.icat==='diff'&&x.amount===20)"));
}
{ // شيلها خالص
  const {run}=boot(seed({txns:[sal]}),NOW);
  run("D.sales=[{id:'s1',what:'ساعة',who:'علي',amount:500,date:'2026-11-01'},{id:'s2',what:'شنطة',who:'علي',amount:300,date:'2026-11-02'}];");
  run("app.startOwedGet('g_علي');app.setOwedAcct('cash');app.setOwedGot('200',0);app.confirmOwedGet('g_علي');");
  run("app.dropOwedGroup('g_علي');");
  t('اللي استلمت منها اتقفلت وفضلت، واللي لأ اتشالت', run("JSON.stringify(D.sales.map(s=>[s.id,!!s.closed]))")==='[["s1",true]]'&&run("D.txns.some(x=>x.saleOf==='s1')"));
}
{ // تفاصيل «تقدر تصرف»
  const S=seed({txns:[sal,{id:'c',book:'me',kind:'expense',amount:200,cat:'eatout',account:'card',date:'2026-11-05'}],
    subs:[{id:'s1',name:'نتفليكس',amount:100,cur:'EGP',cycle:'monthly',next:'2026-11-20',account:'cib',cat:'subs',payments:[],dues:[],day:20,people:[]},
      {id:'s2',name:'سبوتيفاي',amount:50,cur:'EGP',cycle:'monthly',next:'2026-11-18',account:'cib',cat:'subs',payments:[],dues:[],day:18,people:[]}],
    owed:[{id:'o1',who:'علي',amount:50,date:'2026-10-01'},{id:'o2',who:'منى',amount:70,date:'2026-10-02'}]});
  const {run,V}=boot(S,NOW);run("app.go('home');app.spendToggle();");const v=V();
  const sec=['بيتخصم لحد المرتب','باقي اللي عليك','اللي ليك'].map(x=>v.indexOf('<span>'+x+'</span>'));
  t('٣ أقسام بالترتيب', sec.every((x,i)=>x>-1&&(i===0||x>sec[i-1])), sec.join());
  t('كل قسم بمجموعه', v.indexOf('<span>بيتخصم لحد المرتب</span><span class="n">150</span>')>-1&&v.indexOf('<span>اللي ليك</span><span class="n">120</span>')>-1);
  t('بالتاريخ: سبوتيفاي (18) قبل نتفليكس (20)', v.indexOf('سبوتيفاي')<v.indexOf('نتفليكس'));
  t('اللي ليك: كل واحد باسمه بلون مختلف', v.indexOf('<bdi>علي</bdi>')>-1&&v.indexOf('<bdi>منى</bdi>')>-1&&(v.match(/vl n" style="color:var\(--mint\)"/g)||[]).length===2);
}
done();
