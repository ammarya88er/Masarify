// حساب الاستثمار: تحويل، صناديق بعائد، أسهم، مراجعة، وبرّه «تقدر تصرف» والإجمالي
const {boot,seed,t,done}=require('./harness');
const E='{stopPropagation(){}}';
const NOW=Date.UTC(2026,10,17,9);
const S=()=>{const s=seed();s.accounts.push({id:'vw',name:'محفظة',opening:3000,scope:'me',atype:'wallet'});return s;};
const {run,V,els}=boot(S(),NOW);
const B=(bk,x)=>Math.round(run("balances('"+bk+"')['"+x+"']||0")*100)/100;
const total0=run("document.getElementById('total').textContent"), sp0=run("spendCalc().liquid");
run("app.go('wallet');app.setWtab('inv');");
t('تبويب «الاستثمار» في المحفظة', V().indexOf("app.setWtab('inv')")>-1&&V().indexOf("app.invGo('','new')")>-1);
run("app.invGo('','new');app.invSet('name','ثاندر');app.invSave();");
const id=run("D.accounts.find(a=>a.atype==='invest').id");
t('اتضاف حساب استثمار', !!id);
const go=(k,o)=>{run("app.invGo('"+id+"','"+k+"');");Object.keys(o||{}).forEach(x=>run("app.invSet('"+x+"','"+o[x]+"');"));};
// تحويل من البنك ومن المحفظة
go('in');run("app.invPick('acc','cib');app.invSet('amt','10000');app.invSave();");
go('in');run("app.invPick('acc','vw');app.invSet('amt','2000');app.invSave();");
t('التحويل من البنك والمحفظة', B('me',id)===12000&&B('me','cib')===0&&B('me','vw')===1000);
run("app.go('home');");
t('برّه الإجمالي و«تقدر تصرف» والرئيسية', run("spendCalc().liquid")===sp0-12000&&run("accountsShow('me').some(a=>a.id==='"+id+"')")===false&&run("document.getElementById('total').textContent")!==total0);
run("app.go('add');app.setKind('transfer');app.shutRow('acct');app.setAccount('cib');");
t('ممكن تحوّل له من «إضافة» كمان', run("xferToIds('cib').indexOf('"+id+"')")>-1);
run("app.setKind('expense');");t('مايتصرفش منه', run("payChips('','x','','me','acct',false).indexOf('ثاندر')")<0);
// صندوق
run("app.go('wallet');app.setWtab('inv');");
go('fund',{name:'كلاودز',rate:'21'});run("app.invSave();");
const fid=run("D.accounts.find(a=>a.inv&&a.atype==='save').id");
t('الصندوق اتضاف ومش ظاهر في الحسابات', !!fid&&run("accountsFor('me').some(a=>a.id==='"+fid+"')")===false);
go('tofund');run("app.invPick('fund','"+fid+"');");run("app.invSet('amt','20000');");
t('أكتر من الرصيد: مقفول', run("invOk()")===false);
run("app.invSet('amt','10000');app.invSave();");
t('اتحط في الصندوق', B('me',fid)===10000&&B('me',id)===2000);
// أسهم: شرا بعمولة
go('buy',{name:'شركة النيل',qty:'20',price:'80'});run("app.invPick('fee',true);app.invSet('feeAmt','5');");
t('العمولة لازم تتجاوب الأول ومكتوبة', run("invOk()")===true);
run("app.invSave();");
const sid=run("D.accounts.find(a=>a.atype==='stock').id");
t('الشرا: الرصيد نقص بالمبلغ والعمولة', B('me',id)===2000-1600-5&&run("stockQty('"+sid+"')")===20&&B('me',sid)===1600);
t('العمولة مصروف «عمولات ورسوم»', run("D.txns.some(x=>x.cat==='fees'&&x.amount===5&&x.account==='"+id+"')"));
go('buy',{name:'شركة النيل',qty:'10',price:'100'});run("app.invPick('fee',false);");
t('مفيش رصيد كفاية: مقفول', run("invOk()")===false);
run("app.invGo('');");
// بيع جزء بمكسب
go('sell',{name:'شركة النيل',qty:'5',price:'90'});run("app.invPick('fee',false);");
t('مايبعش أكتر من اللي عنده', (run("app.invSet('qty','25');invOk()")===false));
run("app.invSet('qty','5');app.invSave();");
t('البيع: مكسب 50 والتكلفة اتقسمت', run("stockQty('"+sid+"')")===15&&B('me',sid)===1200&&B('me',id)===395+450&&run("D.txns.some(x=>x.kind==='yield'&&x.account==='"+sid+"'&&x.amount===50)"));
// مسح الشرا ممنوع بعد البيع
const bid=run("D.txns.find(x=>x.invQ&&x.to==='"+sid+"').id");
run("app.delTxn("+E+",'"+bid+"');");t('مسح الشرا بعد البيع ممنوع', run("D.txns.some(x=>x.id==='"+bid+"')"));
// بيع الباقي بخسارة
go('sell',{name:'شركة النيل',qty:'15',price:'70'});run("app.invPick('fee',false);app.invSave();");
t('بيع الكل: السهم صفر، والخسارة اتسجلت', run("stockQty('"+sid+"')")===0&&B('me',sid)===0&&run("D.txns.some(x=>x.kind==='yield'&&x.account==='"+sid+"'&&x.amount===-150)"));
run("app.go('wallet');app.setWtab('inv');");t('السهم اللي اتباع كله باهت تحت', V().indexOf('بعته كله')>-1);
// تعديل حركة شرا: المبلغ مش بيتعدل
run("app.go('log');app.toggleTxn('"+bid+"');app.startTxnEdit("+E+",'"+bid+"');");
t('حركة الشرا: المبلغ مقفول في التعديل', V().indexOf('المبلغ جاي من عدد الأسهم والسعر')>-1);
run("app.cancelTxnEdit();");
// المراجعة
run("app.go('wallet');app.setWtab('inv');");
const fv=run("invParts(D.accounts.find(a=>a.id==='"+id+"')).funds[0].v");
go('rev');run("app.invSet('v_"+fid+"','"+(fv+35)+"');app.invSet('r_"+fid+"','19');app.invSet('cash','"+(B('me',id)+12)+"');app.invSave();");
t('المراجعة: فرق الصندوق والرصيد اتسجلوا عايد', run("D.txns.some(x=>x.kind==='yield'&&x.account==='"+fid+"'&&x.amount===35)")&&run("D.txns.some(x=>x.kind==='yield'&&x.account==='"+id+"'&&x.amount===12)"));
t('النسبة الجديدة من النهارده', run("saveRateOn(D.accounts.find(a=>a.id==='"+fid+"'),today())")===19);
t('آخر مراجعة اتسجلت', run("D.accounts.find(a=>a.id==='"+id+"').revLast")===run("today()"));
// التراجع
const pre=run("JSON.stringify(dKey(JSON.stringify(D)))");
go('out');run("app.invPick('acc','vw');app.invSet('amt','100');app.invSave();");
run("app.undoLast();");t('التراجع بيرجّع زي ما كان', run("JSON.stringify(dKey(JSON.stringify(D)))")===pre);
// التنبيه بعد شهر
{ const st=JSON.parse(run("JSON.stringify(D)"));
  const L=boot(st,Date.UTC(2026,11,20,9));L.run("app.go('home');");
  t('بعد شهر: تنبيه «راجع أرقام»', L.V().indexOf('راجع أرقام ثاندر')>-1&&L.V().indexOf("app.invRevGo('"+id+"')")>-1);
  t('العايد اليومي للصندوق شغال', L.run("saveAccrued(D.accounts.find(a=>a.id==='"+fid+"'))")>0);
  L.run("app.invRevGo('"+id+"');");t('«راجع» بيفتح المراجعة', L.run("tab")==='wallet'&&L.run("wtab")==='inv'&&L.run("invF.k")==='rev');}
// المسح
{ const L=boot(S(),NOW);L.run("app.go('wallet');app.setWtab('inv');app.invGo('','new');app.invSet('name','X');app.invSave();");
  const x=L.run("D.accounts.find(a=>a.atype==='invest').id");L.run("app.invGo('"+x+"','cfg');app.invDel('"+x+"');");
  t('حساب فاضي بيتقفل', L.run("D.accounts.find(a=>a.id==='"+x+"').closed")===true);}
done();
