// الدفعة ٣: فلتر التصنيف في السجل بيفك الفاتورة لأصنافها
const {boot,seed,t,done}=require('./harness');
const ex=(id,date,amount,o)=>Object.assign({id,book:'me',kind:'expense',amount,cat:'other',account:'cash',date},o||{});
{
  const s=seed({txns:[ex('r1','2026-09-20',100,{place:'طلبات',items:[{name:'شيبسي',amount:20,cat:'snk'},{name:'رز',amount:80,cat:'other'}],cat:'snk'}),
    ex('r2','2026-09-21',45,{voucher:{amount:5},place:'كارفور',items:[{name:'شوكولاتة',amount:25,cat:'snk'},{name:'مياه',amount:25,cat:'other'}]}),
    ex('e1','2026-09-21',30,{cat:'snk',note:'حلويات'}),ex('e2','2026-09-22',50,{note:'بنزين'})]});
  s.cats=(s.cats||[]).concat([{id:'snk',label:'سناكس',color:'#f90'}]);
  const {run}=boot(s);
  run("app.go('log');app.setF('cat','snk');");
  const h=run("logList()").replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  t('كل صنف سطر لوحده باسمه ومكانه', h.indexOf('شيبسي')>-1&&h.indexOf('طلبات')>-1&&h.indexOf('شوكولاتة')>-1&&h.indexOf('رز')<0&&h.indexOf('مياه')<0, h);
  t('المجموع بالأصناف باللي اتدفع بس (20 + 22.5 بعد الفاوتشر + 30)', h.indexOf('3 سطور · مصروف 72.50')>-1, h.slice(0,80));
  t('إجمالي اليوم بالأصناف', h.indexOf('مصروف 52.50')>-1);
  run("app.toggleItem('r1',0);");
  t('فتح الصنف بيفتح فاتورته', run("openTxn")==='r1'&&run("logList()").indexOf('رز')>-1);
  run("app.setF('cat','');");
  t('من غير تصنيف: الفاتورة كاملة', run("logList()").replace(/<[^>]+>/g,' ').indexOf('4 حركات')>-1);
}
done();
