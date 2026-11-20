// الفاوتشرات مش صرف: المصروف = اللي طلع من حساباتك، والأصناف باللي اتدفع، وسطر الفاوتشرات لوحده
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,20,9);
const tx=[{id:'s',book:'me',kind:'income',amount:5000,account:'cib',date:'2026-11-01',salary:true},
  {id:'h',book:'me',kind:'expense',amount:297,account:'card',date:'2026-11-10',merchant:'م',note:'م',cat:'devices',
   vouchers:[{id:'a',amount:10000},{id:'b',amount:4500}],
   items:[{name:'ميكروويف',amount:5799,cat:'devices'},{name:'قلاية',amount:5999,cat:'lentcat',who:'إسماعيل'},{name:'مروحة',amount:2999,cat:'lentcat',who:'إسماعيل'}]},
  {id:'g',book:'me',kind:'expense',amount:-297,account:'cib',date:'2026-11-11',cat:'lentcat',note:'تحصيل من إسماعيل'},
  {id:'x',book:'me',kind:'expense',amount:100,account:'cash',date:'2026-11-12',cat:'eatout'}];
const S=()=>seed({monthMode:'',txns:tx,owed:[{id:'o',amount:297,who:'إسماعيل',date:'2026-11-10',srcTxn:'h',cat:'lentcat',lent:true,got:true,gotAmount:297,gotTxns:['g']}]});
const {run,V}=boot(S(),NOW);
const m=JSON.parse(run("(()=>{const m=monthStats();return JSON.stringify({spent:m.spent,cats:Object.fromEntries(m.byCat)})})()"));
t('المصروف من غير الفاوتشرات (297 − 297 + 100)', Math.round(m.spent*100)/100===100, m.spent);
t('الميكروويف اتغطى كله: مش في «أجهزة»', !m.cats.devices, JSON.stringify(m.cats));
t('«فلوس عند الناس» صفر (رجّعلك اللي عليه)', !m.cats.lentcat||Math.abs(m.cats.lentcat)<0.01, JSON.stringify(m.cats));
run("app.go('home');sumOpen=true;render();");
t('سطر «اتغطى بفاوتشرات» تحت الكروت', V().indexOf('واتغطى بفاوتشرات <span class="n">14,500</span>')>-1);
t('سطر باهت في آخر «صرفت على إيه»', V().indexOf('<span>اتغطى بفاوتشرات</span>')>-1);
t('الملخص المفتوح تحت الكروت مايكررش الأرقام', V().indexOf('<span>صرفت زيادة</span>')<0&&V().indexOf('<span>صرفت</span>')<0);
t('أرقام الكروت بتصغر لو طويلة', require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8').indexOf("querySelectorAll('.stat b').forEach")>-1);
// مصروف بفاوتشر واحد من «إضافة»: الصنف باللي اتدفع
const b=boot(seed({monthMode:'',txns:[{id:'e',book:'me',kind:'expense',amount:60,account:'cash',date:'2026-11-05',cat:'grocery',voucher:{id:'v',amount:40}}]}),NOW);
t('فاوتشر في «إضافة»: الصنف بـ60 بس', b.run("JSON.stringify(monthStats().byCat)")==='[["grocery",60]]');
done();
