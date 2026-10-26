const {boot,seed,t,done}=require('./harness');
const r2=x=>Math.round(x*100)/100;
{ // الاسم المكرر
  const {run,doc}=boot(seed());
  const n=run("D.cats.length");doc.getElementById('newcat').value=run("D.cats[0].label");run("app.addCat()");
  t('تصنيف مصروف مكرر مرفوض', run("D.cats.length")===n);
  const o=run("D.ocats.length");doc.getElementById('newocat').value='شركات';run("app.ocatAdd()");
  t('تصنيف المكتب المكرر مرفوض', run("D.ocats.length")===o);
}
const {run,V,B,doc}=boot(seed());
const bal=id=>r2(run("balances('me')['"+id+"']"));
run("app.go('settings');app.toggleSet('fx');");let v=V();
t('العملات مقفولة في الأول، و«مقفولة» قبل «شغّالة»', v.indexOf('مقفولة')>-1&&v.indexOf('أنهي عملات')<0&&v.indexOf('مقفولة')<v.indexOf('شغّالة'));
run("app.setFxOn(true);app.fxToggle('USD');");
doc.getElementById('fxr_USD').value='50';run("app.saveFxRates();");
t('السعر اتحفظ يدوي', run("D.fx.rates.USD")===50&&run("D.fx.manual.USD")===true);
run("app.toggleSet('fx');");v=V();
t('الملخص فيه اسم العملة، وزرار «رجّع تلقائي»', v.indexOf('دولار')>-1&&v.indexOf('رجّع دولار تلقائي')>-1);
// حساب بالدولار
run("app.go('wallet');showAddAcc=true;app.setWtab('accounts');");
doc.getElementById('newacc').value='دولار كاش';
run("app.accType('cash');app.accCurPick('USD');app.addAccount();");
const uid_=run("D.accounts.find(a=>a.name==='دولار كاش').id");
t('الحساب اتعمل بالدولار ولفلوسي بس', run("accCur('"+uid_+"')")==='USD'&&run("D.accounts.find(a=>a.id==='"+uid_+"').scope")==='me');
// الكارت مالوش عملة
run("showAddAcc=true;app.accType('credit');");v=V();
t('الكارت الائتماني مالوش اختيار عملة', v.indexOf("app.accCurPick")<0);
run("app.accType('prepaid');");v=V();
t('نوع «كارت مسبق الدفع» موجود وبيطلب آخر ٤ أرقام وليه عملة', v.indexOf('كارت مسبق الدفع')>-1&&v.indexOf('آخر 4 أرقام')>-1&&v.indexOf("app.accCurPick")>-1);
t('المسبق الدفع مش في حسابات البنك', run("bankAccs().some(a=>a.atype==='prepaid')")===false);
// دخل بالدولار
const tot0=run("Number(0)");
run("app.go('add');draft.kind='income';render();app.setIcat('other_in');app.shutRow('acct');app.setAccount('"+uid_+"');app.dset('amount','100');");
v=V();
t('المبلغ بالدولار وقيمته بالجنيه', v.indexOf('>دولار<')>-1&&doc.getElementById('fxamthint').innerHTML.indexOf('5,000')>-1||v.indexOf('5,000')>-1);
t('مع حساب بالدولار مفيش عهدة ولا فاوتشر', v.indexOf('كاش العهدة')<0);
run("app.saveEntry();");
t('الرصيد 100 دولار', bal(uid_)===100);
t('الدخل اتسجل 5000 جنيه', run("D.txns.find(x=>x.account==='"+uid_+"'&&x.kind==='income').egp")===5000);
run("app.go('home');app.toggleIncs();");v=V();
t('«جه منين» بالجنيه', v.indexOf('5,000')>-1);
t('صف الحساب فيه «تقريبًا 5,000 جنيه»', v.indexOf('بالدولار')>-1&&/تقريبًا <span class="n">5,000<\/span> جنيه/.test(v));
t('الإجمالي بالجنيه', doc.getElementById('total').textContent===require('util').format('%s', run("fmt(Math.round((balances('me').cash+balances('me').cib+balances('me').vcash+5000)*100)/100)")));
// السعر اتغير
doc.getElementById('fxr_USD').value='52';run("app.go('settings');app.toggleSet('fx');app.saveFxRates();render();");
t('الإجمالي بيتحسب بسعر النهارده', doc.getElementById('total').textContent===run("fmt(Math.round((balances('me').cash+balances('me').cib+balances('me').vcash+5200)*100)/100)"));
// تحويل من دولار لجنيه
const cash0=bal('cash');
run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('"+uid_+"');app.setTo('cash');");v=V();
t('تحويل بين عملتين: حوّلت كام واستلمت كام وكانت إيه', v.indexOf('حوّلت كام')>-1&&v.indexOf('استلمت كام')>-1&&v.indexOf('كانت إيه')>-1);
run("app.dset('amount','50');app.dset('toAmt','2700');");
t('الحفظ مقفول لحد ما تختار «كانت إيه؟»', /id="entrysave" disabled/.test(V()));
run("app.setFxOf('income');");
t('الشرح فيه السعر والفرق', doc.getElementById('xchhint').innerHTML.indexOf('54')>-1&&V().indexOf('200')>-1);
run("app.saveEntry();");
t('الدولار نقص 50 والكاش زاد 2700', bal(uid_)===50&&bal('cash')===r2(cash0+2700));
const x=run("JSON.stringify(D.txns.find(x=>x.kind==='transfer'&&x.to==='cash'))");
t('الفرق 200 على نوع الدخل', /"fxGain":200/.test(x)&&/"fxOf":"income"/.test(x)&&/"fxIcat":"other_in"/.test(x), x);
run("app.go('home');");v=V();
t('الدخل بقى 5200 (قيمة يوم التحويل)', v.indexOf('5,200')>-1);
// شراء دولار
run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cash');app.setTo('"+uid_+"');app.dset('amount','5300');app.dset('toAmt','100');");
t('من جنيه لعملة مفيش «كانت إيه؟»', V().indexOf('كانت إيه')<0&&run('__yn(),entryOk()')===true);
run("app.saveEntry();");
t('متوسط التكلفة 52', r2(run("fxAvg('"+uid_+"')"))===52, run("fxAvg('"+uid_+"')"));
// مصروف بالدولار
run("app.go('add');app.setKind('expense');app.shutRow('acct');app.setAccount('"+uid_+"');app.setCat('grocery');app.dset('amount','10');app.saveEntry();");
t('المصروف 10 دولار = 520 جنيه', run("D.txns.find(x=>x.kind==='expense'&&x.account==='"+uid_+"').egp")===520);
// بيع اللي اشتريته
run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('"+uid_+"');app.setTo('cash');app.dset('amount','40');app.dset('toAmt','2000');app.setFxOf('bought');app.saveEntry();");
t('بيع بخسارة: فرق عملة −80', run("D.txns.find(x=>x.fxOf==='bought').fxGain")===-80);
run("app.go('home');incsOpen=true;render();");v=V();
t('«فرق عملة» في «جه منين»', v.indexOf('فرق عملة')>-1);
// السجل
run("app.go('log');app.setF('acct','"+uid_+"');");v=V();
t('فلتر حساب الدولار: المجموع بالدولار', /مصروف <span class="n">10<\/span> دولار/.test(v), (v.match(/حركة ·[^<]*<span class="n">[^<]*<\/span>[^<]*/)||[''])[0]);
t('الحركة مكتوب جنبها دولار', v.indexOf('<small style="font-size:11px">دولار</small>')>-1);
// الأماكن اللي بالجنيه بس
t('مش في حساباتي بتاعة العهدة', run("myOnly().some(a=>a.id==='"+uid_+"')")===false);
t('مش في الاشتراكات ولا السداد', run("payChips('','x','','me','k')").indexOf('دولار كاش')<0);
run("app.setBook('office');app.go('add');app.oKind('expense');");
t('مش في دفتر المكتب', V().indexOf('دولار كاش')<0);
run("app.setBook('me');");
// قفل العملات
run("app.setFxOn(false);");
t('مينفعش تقفل العملات وفيه حساب بيها', run("D.fx.on")===true);
run("app.fxToggle('USD');");
t('مينفعش تشيل الدولار وفيه حساب بيه', run("D.fx.curs.indexOf('USD')")>-1);
// التعديل
const eid=run("D.txns.find(x=>x.kind==='expense'&&x.account==='"+uid_+"').id");
run("app.go('log');app.setF('acct','');app.toggleTxn('"+eid+"');app.startTxnEdit({stopPropagation(){}},'"+eid+"');");
t('تعديل حركة بالدولار من غير تغيير الحساب', V().indexOf("app.eTxnAcct")<0);
run("app.dset('amount','20');app.saveEntry();");
t('التعديل بيظبط القيمة بالجنيه', run("D.txns.find(x=>x.id==='"+eid+"').egp")===1040);
// كل الشاشات بالعملات
{let err=[];for(const bk of ['me','office'])for(const tb of ['home','add','log','wallet','settings']){
  try{run(`app.setBook('${bk}');app.go('${tb}');`);const w=V().replace(/="undefined"/g,'');if(/undefined|NaN/.test(w))err.push(bk+tb+':'+(w.match(/.{50}(undefined|NaN).{30}/)||[''])[0]);}catch(e){err.push(bk+tb+' '+e.message);}}
 for(const w of ['accounts','subs','ins','vouchers','veh','close'])try{run(`app.setBook('me');app.go('wallet');app.setWtab('${w}');`);if(/NaN/.test(V()))err.push(w);}catch(e){err.push(w+e.message);}
 run("app.setBook('me');app.go('settings');app.toggleSet('accs');app.openAccCfg('"+uid_+"');");if(/NaN|undefined</.test(V()))err.push('cfg');
 t('كل الشاشات في الدفترين من غير أخطاء', err.length===0, err.join(' | '));
 t('إعدادات حساب الدولار: العملة مش بتتغير', V().indexOf('مش بتتغير بعد ما يبقى عليه حركات')>-1&&V().indexOf("scope"+uid_)<0);}
// التحديث التلقائي
{const b=boot(seed({fx:{on:true,curs:['USD','EUR'],rates:{USD:50},at:'',manual:{USD:true}}}));
 b.run("fetch=async()=>({ok:true,json:async()=>({egp:{usd:0.02,eur:0.018}})});");
 b.run("fxFetch(true)");
 setTimeout(()=>{t('التحديث التلقائي: اليورو اتحدث والدولار اليدوي زي ما هو', b.run("D.fx.rates.EUR")===55.56&&b.run("D.fx.rates.USD")===50&&b.run("D.fx.at")===b.run("today()"), b.run("JSON.stringify(D.fx)"));
 },50);}
// الترحيب
{const b=boot(null);b.run("app.welFx(true);app.welFxCur('EUR');wel.accs=[{kind:'prepaid',kindLabel:'x',name:'ميزة',opening:'100'}];app.welDone();");
 t('الترحيب: العملات اتفتحت باليورو', b.run("D.fx.on")===true&&b.run("D.fx.curs.join()")==='EUR');
 t('الترحيب: الحساب اتسجل بنوعه', b.run("D.accounts[0].atype")==='prepaid');}
setTimeout(done,120);
