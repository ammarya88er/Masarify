// الدفعة ٢ — العهدة: اللي في الإيد واللي ناقص وهو فين، «عليك للعهدة» في الدفترين،
// «اديت عهدة لحد» و«صفّي» و«ادفعله»، وسؤال الرسوم مع حساب البنك بس
const {boot,seed,t,done}=require('./harness');
const E='{stopPropagation(){}}';
const NOW=Date.UTC(2026,10,23,9);
const S=()=>seed({txns:[{id:'x1',book:'me',kind:'expense',amount:150,cat:'eatout',account:'cash',date:'2026-11-20',link:'L1'},
  {id:'x2',book:'me',kind:'settle',dir:'in',amount:100,account:'cash',date:'2026-11-20',flIn:true,link:'L1'}],
  floatLoans:[{id:'f1',dir:'take',amount:100,date:'2026-11-20',srcTxn:'x1',acct:'ocash',mig:1}]});
const {run,V,B,els}=boot(S(),NOW);
const total=()=>els['total'].textContent;
run("app.setBook('office');app.go('home');");
t('كاش العهدة: الرقم الكبير اللي في الإيد (2,900)', V().indexOf('>2,900</span>')>-1);
t('وتحته: ناقص 100 — معاك انت', V().indexOf('ناقص <span class="n">100</span> — معاك انت')>-1);
t('«عليك للعهدة» ظاهر في دفتر المكتب', V().indexOf('عليك للعهدة')>-1);
run("app.setBook('me');app.go('home');alertsOpen=true;render();");t('و«عليك للعهدة» في فلوسي', V().indexOf('عليك للعهدة')>-1);
run("app.setBook('office');app.go('home');");const T0=total();
// اديت عهدة لحد (من الكاش: مفيش سؤال رسوم)
t('زرار «اديت عهدة لحد»', V().indexOf('اديت عهدة لحد')>-1);
run("app.hdOpen('new','give');");
t('من الكاش: مفيش سؤال رسوم', V().indexOf('فيها عمولات ورسوم؟')<0&&V().indexOf('hdsave" disabled')>-1);
run("app.hdSet('who','كريم');app.hdAcc('ocash');app.hdSet('amt','500');render();");
t('اتفتح بعد الاسم والمبلغ', V().indexOf('hdsave" disabled')<0);
run("app.hdGiveSave();");
const h=JSON.parse(run("JSON.stringify(D.holders[0])"));
t('اتسجل حساب «مع كريم» جوه الدفتر بس', h.who==='كريم'&&run("D.accounts.some(a=>a.id==='"+h.id+"')")===false&&run("holderBal('"+h.id+"')")===500);
t('إجمالي العهدة ماتغيرش', total()===T0, total()+' '+T0);
t('الكاش: 2,400 في الإيد وتحته «مع كريم»', V().indexOf('>2,400</span>')>-1&&V().indexOf('ناقص <span class="n">500</span> — مع <bdi>كريم</bdi>')>-1);
t('تنبيه «عهدة مع كريم» بزرار «صفّي»', V().indexOf('عهدة مع <bdi>كريم</bdi>')>-1&&V().indexOf(">صفّي</button>")>-1);
t('مش ظاهر في اختيارات الحسابات', run("officeAccs().some(a=>a.id==='"+h.id+"')")===false);
// صفّي: صرف 300 ورجّع 150 والباقي 50 معاه
run("app.hdOpen('"+h.id+"','settle');app.hdLine(0,'item','ورق');app.hdLine(0,'ocat','c1',1);app.hdLine(0,'amount','300');render();");
t('فضل معاه 200 وبيسأل رجّعلك كام', V().indexOf('فضل معاه <span class="n">200</span>')>-1&&V().indexOf('رجّعلك كام؟')>-1);
run("app.hdSet('back','150');app.hdAcc('ocash');app.hdSettleSave('"+h.id+"');");
t('اللي صرفه مصروف للدفتر بتصنيفه', run("D.txns.some(x=>x.book==='office'&&x.kind==='expense'&&x.account==='"+h.id+"'&&x.amount===300&&x.item==='ورق'&&x.ocat==='c1')"));
t('اللي فضل معاه 50', run("holderBal('"+h.id+"')")===50);
t('في تقرير الفترة: المنصرف 300', run("officeReport(periodFrom(),today()).spent")===300);
t('الإجمالي = اللي قبل − المنصرف', Number(total().replace(/,/g,''))===Number(T0.replace(/,/g,''))-300);
// صرف أكتر من اللي معاه واديتهوله دلوقتي
run("app.hdOpen('"+h.id+"','settle');app.hdLine(0,'item','حبر');app.hdLine(0,'ocat','c1',1);app.hdLine(0,'amount','120');render();");
t('صرف أكتر بـ70 وبيسأل اديتهوله دلوقتي', V().indexOf('صرف أكتر من اللي معاه بـ<span class="n">70</span>')>-1&&V().indexOf('اديتهوله دلوقتي؟')>-1&&V().indexOf('hdsave" disabled')>-1);
run("app.hdPayNow(true);app.hdAcc('ocash');app.hdSettleSave('"+h.id+"');");
t('خلص: صفر معاه والتنبيه اتشال', run("holderBal('"+h.id+"')")===0&&V().indexOf('عهدة مع <bdi>كريم</bdi>')<0);
// ماادهولوش: الدفتر عليه ليه
const r=boot(S(),NOW);r.run("app.setBook('office');app.go('home');app.hdOpen('new','give');app.hdSet('who','سامي');app.hdAcc('ocash');app.hdSet('amt','100');app.hdGiveSave();");
const sid=r.run("D.holders[0].id");
r.run("app.hdOpen('"+sid+"','settle');app.hdLine(0,'item','شاي');app.hdLine(0,'ocat','c2',1);app.hdLine(0,'amount','150');app.hdPayNow(false);app.hdSettleSave('"+sid+"');");
t('الدفتر عليه لسامي 50 (أحمر) بزرار «ادفعله»', r.run("holderBal('"+sid+"')")===-50&&r.V().indexOf('عليه <bdi>لسامي</bdi>')>-1&&r.V().indexOf('>ادفعله</button>')>-1);
r.run("app.hdOpen('"+sid+"','pay');");t('«ادفعله» بالمبلغ اللي عليه', r.run("hdD.amt")==='50');
r.run("app.hdAcc('ocash');app.hdPaySave('"+sid+"');");t('اتدفعله: صفر', r.run("holderBal('"+sid+"')")===0);
// من البنك: سؤال الرسوم، والرسوم عليك ومربوطة بالتحويل
const q=boot(S(),NOW);q.run("app.setBook('office');app.go('home');app.hdOpen('new','give');app.hdSet('who','علي');app.hdAcc('cib');app.hdSet('amt','200');render();");
t('من البنك: بيسأل عن الرسوم ولازم تجاوب', q.V().indexOf('فيها عمولات ورسوم؟')>-1&&q.V().indexOf('hdsave" disabled')>-1);
q.run("app.hdFee(true);");t('الرسوم اتملت من الإعدادات (0.5)', q.run("hdD.feeAmt")==='0.5');
const cib0=q.B('me','cib');q.run("app.hdGiveSave();");
const g=JSON.parse(q.run("JSON.stringify(D.txns.find(x=>x.hd&&x.kind==='transfer'))"));
t('الرسوم مصروف عليك من البنك ورسوم ليك عند الدفتر', q.B('me','cib')===cib0-0.5&&q.run("D.ofees.some(f=>f.amount===0.5)"));
t('التحويل والرسوم عملية واحدة', q.run("D.txns.filter(x=>x.link==='"+g.link+"').length")===2);
q.run("app.go('log');openTxn='"+g.id+"';render();app.delTxn("+E+",'"+g.id+"');");
t('المسح بيشيل العملية كلها (والرسوم)', q.run("D.txns.some(x=>x.link==='"+g.link+"')")===false&&q.run("D.ofees.length")===0&&q.B('me','cib')===cib0);
q.run("app.undoLast();");t('والتراجع بيرجعها', q.run("D.txns.filter(x=>x.link==='"+g.link+"').length")===2);
// سؤال الرسوم مع البنك بس — في الدفترين
const z=boot(seed(),NOW);
z.run("app.go('add');app.setKind('expense');app.setAccount('cash');");t('فلوسي من الكاش: مفيش سؤال رسوم', z.V().indexOf('فيها عمولات ورسوم؟')<0);
z.run("app.setAccount('cib');");t('فلوسي من البنك: فيه', z.V().indexOf('فيها عمولات ورسوم؟')>-1);
z.run("app.setBook('office');app.go('add');app.oKind('expense');app.oAccount('ocash');");t('المكتب من الكاش: مفيش', z.V().indexOf('فيها عمولات ورسوم؟')<0);
z.run("app.oAccount('cib');");t('المكتب من البنك: فيه', z.V().indexOf('فيها عمولات ورسوم؟')>-1);
z.run("app.setBook('me');app.go('add');app.setKind('expense');app.setAccount('cib');app.setHasFee(true);app.dset('feeAmt','5');app.setAccount('cash');app.setCat('eatout');app.dset('amount','50');app.saveEntry();");
t('اخترت رسوم وبعدين غيرت لكاش: الرسوم ماتتسجلش', z.run("D.txns.some(x=>x.cat==='fees')")===false);
done();
