// الدفعة ١ — الأقساط: «بيتدفع إمتى؟»، «أجّل شهر» في التنبيه، الدفع بمبلغ مختلف و«ادفع مبلغ زيادة»
// والأقساط الجاية، وتعديل الخطة، والأقساط في المصروف (كل قسط في شهره تحت تصنيف الحاجة)
const {boot,seed,t,done}=require('./harness');
const E='{stopPropagation(){}}';
const NOW=Date.UTC(2026,10,24,9); // 24 نوفمبر، المرتب لسه
const SAL={id:'s1',book:'me',kind:'income',amount:9000,account:'cib',date:'2026-11-25',salary:true};
const OLDSAL={id:'s0',book:'me',kind:'income',amount:9000,account:'cib',date:'2026-10-25',salary:true};
const ins=o=>Object.assign({id:'i1',name:'موبايل',monthly:5200,months:3,paid:0,total:15610,day:26,account:'cib',src:'office',from:'أحمد',
  covered:'2026-10',firstMonth:'2026-11',tail:0,payments:[]},o||{});
const txt=h=>h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const card=(V)=>{const v=V(),k=v.indexOf('id="pay-i1"');return txt(v.slice(k,v.indexOf('class="panel"',k+20)>-1?v.indexOf('class="panel"',k+20):k+6000));};
const alertOf=(run,V)=>{run("app.go('home');alertsOpen=true;render();");const v=V(),k=v.indexOf('موبايل');return k<0?'':txt(v.slice(k,k+500));};

// --- ١) بيتدفع إمتى؟
{const {run,V}=boot(seed({txns:[OLDSAL],installments:[ins({cat:'installment'})]}),NOW);
  t('القسط القديم بيبدأ «مع المرتب»', run("D.installments[0].when")==='salary');
  t('قبل المرتب: مفيش تنبيه، ومش مكتوب يوم 26', alertOf(run,V)===''&&(run("app.go('wallet');wtab='ins';render();"),!/ 26 /.test(card(V))),card(V));
  run("D.txns.push("+JSON.stringify(SAL)+");render();");
  const a=alertOf(run,V);
  t('بعد المرتب: التنبيه بيكتب «مع المرتب» والمبلغ', a.indexOf('مع المرتب')>-1&&a.indexOf('5,200')>-1,a);
  t('وجنب «سدد» فيه «أجّل شهر»', a.indexOf('سدد')>-1&&a.indexOf('أجّل شهر')>-1);
}
{const {run,V}=boot(seed({txns:[OLDSAL],installments:[ins({when:'day',day:20})]}),NOW);
  const a=alertOf(run,V);
  t('«يوم معين»: بيستحق في يومه حتى لو المرتب لسه، والتنبيه بيكتب التاريخ', run("insDue(D.installments[0])")===true&&a.indexOf('20 نوفمبر')>-1&&a.indexOf('مع المرتب')<0,a);
  t('وداخل في «تقدر تصرف»', run("JSON.stringify(spendCalc())").indexOf('موبايل — قسط')>-1);
  run("D.installments[0].day=27;render();");
  const b=alertOf(run,V);
  t('قبلها بـ3 أيام: التنبيه ظاهر بالتاريخ (لسه مااستحقش)', run("insDue(D.installments[0])")===false&&b.indexOf('27 نوفمبر')>-1,b);
  run("D.installments[0].day=5;D.installments[0].covered='2026-11';render();");
  t('لسه بدري: مفيش تنبيه', alertOf(run,V)==='');
}
// إضافة: السؤال لازم يتجاوب، و«يوم معين» بيسأل يوم كام
{const {run,V}=boot(seed({}),NOW);
  run("app.go('wallet');wtab='ins';render();app.toggleIns();app.insSrc('office');app.insSet('name','غسالة');app.insCat('devices');app.insSet('total','6000');app.insSet('monthly','1000');app.insSet('months','6');app.insAccount('cash');render();");
  t('«بيتدفع إمتى؟» ظاهر وفاضي والحفظ مقفول', V().indexOf('بيتدفع إمتى؟')>-1&&V().indexOf('inssave" disabled')>-1);
  run("app.insWhen('day');");t('«يوم معين» بيسأل يوم كام', V().indexOf('يوم كام في الشهر؟')>-1&&V().indexOf('inssave" disabled')>-1);
  run("app.insSet('day','10');render();");t('اتفتح بعد اليوم', V().indexOf('inssave" disabled')<0);
  run("app.addIns();");t('اتحفظ بيوم معين وتصنيفه', run("D.installments[0].when")==='day'&&run("D.installments[0].day")===10&&run("D.installments[0].cat")==='devices');
}

// --- ٢) أجّل شهر من التنبيه: المبلغ الجاي فعلًا
{const {run,V}=boot(seed({txns:[OLDSAL,SAL],installments:[ins({paid:3,covered:'2026-10',payments:[]})]}),NOW);
  const a=alertOf(run,V);t('التنبيه بيكتب القسط الجاي فعلًا (10 مش 5,200)', a.indexOf(' 10 جنيه')>-1&&a.indexOf('5,200')<0,a);
  run("app.postponeIns('i1');");t('أجّل شهر: اتأجل والمبلغ زي ما هو', run("D.installments[0].covered")==='2026-11'&&run("insLeft(D.installments[0])")===10&&alertOf(run,V)==='');
}

// --- ٣) مبلغ مختلف
const P3=()=>boot(seed({txns:[OLDSAL,SAL],installments:[ins()]}),NOW);
{const {run,V}=P3();const L0=run("insLeft(D.installments[0])");
  run("app.startPay('i1');app.toggleEditAmt();app.payAmt('3000');");
  t('غيّر المبلغ: الباقي والخانتين والزرارين', V().indexOf('الباقي عليك')>-1&&V().indexOf('القسط الشهري الجديد')>-1&&V().indexOf('عدد الشهور اللي فاضلة')>-1&&V().indexOf('نفس القسط')>-1&&V().indexOf('نفس المدة')>-1);
  run("app.plSet('mo','5000');");t('كتبت القسط: الشهور اتحسبت وفيه فرق ولازم تختار', run("plD.n")==='2'&&run("plCalc().need")===true&&run("document.getElementById('inspaybtn').disabled")===true);
  run("app.plTo('alone');");t('شهر لوحده: 5,000 + 5,000 + 2,610', run("JSON.stringify(plCalc().plan)")==='[5000,5000,2610]');
  run("app.plTo('last');");t('في آخر قسط: 5,000 + 7,610', run("JSON.stringify(plCalc().plan)")==='[5000,7610]');
  run("app.confirmPay('i1');");
  t('اتسجل 3,000 والأقساط الجاية = الباقي بالظبط (الفرق ماضاعش)', run("D.txns.find(x=>x.cat==='devices').amount")===3000&&run("insLeft(D.installments[0])")===L0-3000&&run("JSON.stringify(insPlan(D.installments[0]))")==='[5000,7610]');
  t('القسط الشهري بقى 5,000 ودفعت 1 من 3', run("D.installments[0].monthly")===5000&&card(V).indexOf('دفعت 1 من 3')>-1);
  run("app.undoIns('i1');");t('تراجع آخر دفعة: كل حاجة رجعت زي الأول', run("JSON.stringify(insPlan(D.installments[0]))")==='[5200,5200,5200,10]'&&run("D.installments[0].plan")===undefined&&run("D.installments[0].monthly")===5200&&run("D.txns.length")===2);
}
{const {run}=P3();
  run("app.startPay('i1');app.toggleEditAmt();app.payAmt('3000');app.confirmPay('i1');");
  t('قفلت من غير اختيار: الخطة زي ما هي والفرق في آخر قسط', run("JSON.stringify(insPlan(D.installments[0]))")==='[5200,5200,2210]');
  run("app.startPay('i1');app.toggleEditAmt();app.payAmt('5000');app.plSet('mo','1000');app.plSet('n','3');");
  t('كتبت الاتنين والأقساط أقل من الباقي: لازم تختار، والحفظ مقفول', run("plCalc().need")===true&&run("insPayOk(D.installments[0])")===false);
  run("app.plSet('n','20');");t('أكبر من الباقي: مقفول برضو', run("plCalc().ok")===false);
  run("app.plSet('n','');app.plSet('mo','');app.plSame('n');");t('«نفس المدة»: نفس عدد الأقساط الجاية', run("plD.n")==='2'&&run("plD.mo")==='3805');
  run("app.plSame('mo');");t('«نفس القسط»: 5,200', run("plD.mo")==='5200');
}
// الخطة اللي عمار ناويها: يدفع أقل، وبعدين 5,210 مرة والـ10 تتشال
{const {run}=P3();
  run("app.startPay('i1');app.confirmPay('i1');");
  run("app.startPay('i1');app.toggleEditAmt();app.payAmt('5210');app.confirmPay('i1');");
  t('دفعت 5,210: الـ10 اللي في الآخر اتشالت', run("JSON.stringify(insPlan(D.installments[0]))")==='[5200]',run("JSON.stringify(insPlan(D.installments[0]))"));
}
// ادفع مبلغ زيادة
{const {run,V}=P3();
  run("app.go('wallet');wtab='ins';render();");t('زرار «ادفع مبلغ زيادة»', card(V).indexOf('ادفع مبلغ زيادة')>-1);
  run("app.startPay('i1','extra');app.payAmt('2000');app.plSame('n');");
  t('الزيادة مش بتشيل شهر: «نفس المدة» = 4', run("plD.n")==='4');
  run("app.plSet('n','');app.payAmt('2000');app.confirmPay('i1');");
  t('اتسجلت دفعة زيادة والشهر زي ما هو', run("D.installments[0].paid")===0&&run("D.installments[0].covered")==='2026-10'&&run("insLeft(D.installments[0])")===13610&&run("D.txns.some(x=>String(x.note).indexOf('دفعة زيادة')>-1)"));
  t('الفرق في آخر قسط (زي ما هي)', run("JSON.stringify(insPlan(D.installments[0]))")==='[5200,5200,3210]');
  run("app.startPay('i1','extra');app.payAmt('20000');");t('أكتر من الباقي: مقفول', run("insPayOk(D.installments[0])")===false);
}
// عدّل: نفس الخانات، ومن غير تغيير مفيش رقم بيتغير، والدفعات القديمة ماتتلمسش
{const {run,V}=P3();
  run("app.startPay('i1');app.confirmPay('i1');");const tx=run("JSON.stringify(D.txns.find(x=>x.cat==='devices'))");
  const before=run("JSON.stringify(D.installments[0])");
  run("app.go('wallet');wtab='ins';app.startInsEdit('i1');");
  t('عدّل فيه الخانتين والزرارين و«بيتدفع إمتى؟»', V().indexOf('القسط الشهري الجديد')>-1&&V().indexOf('نفس المدة')>-1&&V().indexOf('بيتدفع إمتى؟')>-1);
  run("app.saveInsEdit('i1');");t('تعديل من غير تغيير: ولا رقم اتغير', run("JSON.stringify(D.installments[0])")===before);
  run("app.startInsEdit('i1');app.plSet('mo','2000');app.plTo('alone');app.saveInsEdit('i1');");
  t('تعديل الخطة: الجاي اتغير', run("JSON.stringify(insPlan(D.installments[0]))")==='[2000,2000,2000,2000,2000,410]');
  t('والدفعة القديمة وحركتها زي ما هم', run("JSON.stringify(D.txns.find(x=>x.cat==='devices'))")===tx&&run("D.installments[0].payments[0].amount")===5200);
  run("app.undoIns('i1');");t('تراجع الدفعة القديمة: مبلغها رجع للأقساط الجاية', run("insLeft(D.installments[0])")===15610&&run("insPlan(D.installments[0])[0]")===5200);
  run("app.startInsEdit('i1');app.iDraftWhen('day');app.iDraftSet('day','26');app.saveInsEdit('i1');");t('غيّرته لـ«يوم معين»', run("D.installments[0].when")==='day');
}
// المسح والتعديل من السجل
{const {run}=P3();
  run("app.startPay('i1');app.confirmPay('i1');app.startPay('i1');app.toggleEditAmt();app.payAmt('3000');app.plSet('n','1');app.confirmPay('i1');");
  t('دفعتين: الباقي 7,410 على قسط واحد', run("JSON.stringify(insPlan(D.installments[0]))")==='[7410]');
  const t1=run("D.installments[0].payments[0].t");
  run("app.go('log');openTxn='"+t1+"';render();app.delTxn("+E+",'"+t1+"');");
  t('مسح الدفعة الأولى من السجل: مبلغها رجع والفلوس ماضاعتش', run("insLeft(D.installments[0])")===12610&&run("D.installments[0].paid")===1);
  run("app.undoLast();");t('والتراجع رجّعها', run("insLeft(D.installments[0])")===7410&&run("D.installments[0].paid")===2);
}
// قسط الكارت مش داخل
{const S=seed({txns:[OLDSAL,SAL],installments:[ins({src:'card',account:'card'})]});const {run,V}=boot(S,NOW);
  run("app.go('wallet');wtab='ins';render();");t('قسط الكارت: مفيش «ادفع مبلغ زيادة» ولا تنبيه', card(V).indexOf('ادفع مبلغ زيادة')<0&&alertOf(run,V)==='');}

// --- ٤) الأقساط في المصروف
{const S=seed({txns:[OLDSAL,SAL,{id:'m1',book:'me',kind:'expense',amount:150,cat:'installment',account:'cib',date:'2026-10-01',note:'فرق قسط'}],
   installments:[ins({paid:1,covered:'2026-10',payments:[]})]});
  const {run,V}=boot(S,NOW);
  t('تصنيف «قسط» اتشال والقديم اتنقل لـ«أجهزة وأثاث»', run("D.cats.some(c=>c.id==='installment')")===false&&run("D.txns.find(x=>x.id==='m1').cat")==='devices'&&run("D.installments[0].cat")==='devices');
  run("app.startPay('i1');app.confirmPay('i1');");t('دفعة السلفة بتتسجل تحت تصنيف القسط', run("D.txns.find(x=>String(x.note).indexOf('— قسط')>-1).cat")==='devices');
  // شرا بالقسط على الكارت: ماوس 1,999 على 6 شهور من غير فايدة، وفاتورة بصنفين
  run("app.go('wallet');wtab='ins';showIns=true;insDraft={name:'',total:'',monthly:'',months:'',paid:'0',day:'',account:'',src:''};render();");
  run("app.insSrc('card');app.insBuyDate('2026-09-10');app.insSet('name','ماوس Rapoo');app.insCat('devices');app.insSet('total','1999');app.insSet('months','6');app.insSet('monthly','333.17');app.addIns();");
  const bt=run("D.txns.find(x=>x.insBuy).id");
  run("month='2026-09';");const sep=JSON.parse(run("JSON.stringify(monthStats().byCat)"));
  t('سبتمبر: مش 1,999 يوم الشرا — أول قسط بس (333.17)', sep.some(x=>x[0]==='devices'&&Math.abs(x[1]-333.17)<0.01),JSON.stringify(sep));
  run("month='2026-11';");t('نوفمبر: قسطه في شهره', JSON.parse(run("JSON.stringify(monthStats().byCat)")).some(x=>x[0]==='devices'&&x[1]>=333.16));
  run("month='2026-12';");t('القسط الجاي لسه مااتحسبش', !JSON.parse(run("JSON.stringify(monthStats().byCat)")).some(x=>x[0]==='devices'));
  const s3=run("periodSummary('2026-09-01','2026-09-30').spent");t('ملخص الشهر بنفس الحساب', Math.abs(s3-333.17)<0.01,s3);
  // أصناف من تصنيفين: بيتوزع بنسبتها
  run("const x=D.txns.find(t=>t.insBuy);x.items=[{name:'ماوس',cat:'devices',amount:1500},{name:'شنطة',cat:'other',amount:499}];");
  const b9=JSON.parse(run("JSON.stringify(periodSummary('2026-09-01','2026-09-30').byCat)"));
  t('فاتورة بتصنيفين: القسط متوزع بنسبتهم', b9.some(x=>x[0]==='devices'&&Math.abs(x[1]-333.17*1500/1999)<0.02)&&b9.some(x=>x[0]==='other'&&Math.abs(x[1]-333.17*499/1999)<0.02),JSON.stringify(b9));
  // السجل: السطر بمبلغه الكامل، وفلتر التصنيف بيجمع الأقساط بس
  run("app.go('log');fCat='devices';fMonth='2026-09';render();");const lg=txt(V());
  t('فلتر التصنيف: سطر الشرا بمبلغه الكامل وقسطه تحت', lg.indexOf('1,999')>-1&&lg.indexOf('قسط 1 من 6')>-1,lg.slice(0,400));
  t('ومجموعه القسط بس', lg.indexOf('مصروف '+(Math.round(333.17*1500/1999*100)/100).toLocaleString('en-US'))>-1,lg.slice(0,200));
  run("fCat='';fMonth='';render();");t('السجل العادي: السطر بمبلغه الكامل', txt(V()).indexOf('1,999')>-1);
  // سددت الباقي بدري: برضو كل قسط في شهره (الجدول من البنك مش من السداد)
  run("month='2026-10';");t('أكتوبر فيه قسطه بس', JSON.parse(run("JSON.stringify(monthStats().byCat)")).filter(x=>x[0]==='devices'||x[0]==='other').reduce((a,x)=>a+x[1],0)<600);
}
done();
