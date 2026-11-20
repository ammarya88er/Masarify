// الدفعة ٣: «بيعة» في «إضافة» ← «دخل»، وخانات الأرقام بتتحول إنجليزي وانت بتكتب
const {boot,seed,t,done}=require('./harness');
const NOW=Date.UTC(2026,10,20,9);
const sal={id:'sal',book:'me',kind:'income',amount:8000,account:'cib',date:'2026-10-25',salary:true};
{ // من غير ما يستلم حاجة
  const {run,V}=boot(seed({txns:[sal]}),NOW);
  const b0=run("JSON.stringify(balances('me'))");
  run("app.go('add');app.setKind('income');");
  t('«بيعة» جنب «دخل» و«سلفة»', V().indexOf('>دخل</button>')>-1&&V().indexOf('>سلفة</button>')>-1&&V().indexOf('>بيعة</button>')>-1);
  run("app.setLoan('sale');");const v=V();
  const q=['بعت إيه؟','لمين؟','استلمت حاجة دلوقتي؟','المبلغ اللي اتفقتوا عليه'].map(x=>v.indexOf(x));
  t('بيسأل بالترتيب: بعت إيه، لمين، استلمت حاجة، والمبلغ في الآخر', q.every((x,i)=>x>-1&&(i===0||x>q[i-1])), q.join());
  t('مفيش «يتضاف على أنهي حساب؟» ولا نوع الدخل ولا المكان', v.indexOf('يتضاف على أنهي حساب؟')<0&&v.indexOf('نوع الدخل')<0&&v.indexOf('المكان (اختياري)')<0);
  t('«استلمت حاجة» من غير اختيار والحفظ مقفول', v.indexOf('entrysave" disabled')>-1&&v.indexOf('app.saleEntrySave()')>-1);
  run("app.dset('saleWhat','لابتوب');app.setFrom('كريم');app.dset('amount','15000');render();");
  t('لسه مقفول لحد ما يجاوب «استلمت حاجة»', V().indexOf('entrysave" disabled')>-1);
  run("app.setSaleGot(false);");t('بعد «لأ» الحفظ اتفتح', V().indexOf('entrysave" disabled')<0);
  run("app.saleEntrySave();");
  t('البيعة اتسجلت من غير ما فلوس تتحرك', run("D.sales.length")===1&&run("JSON.stringify(balances('me'))")===b0&&run("D.txns.length")===1);
  const L=JSON.parse(run("JSON.stringify(peopleLedger())"));
  t('في «فلوس ليك» باسم كريم بالمبلغ كله', L.length===1&&L[0].who==='كريم'&&L[0].recTot===15000);
  t('الشاشة اتفضت', run("draft.kind")==='expense'&&!run("draft.sale"));
  run("app.undoLast();");t('التراجع بيشيلها', run("(D.sales||[]).length")===0);
}
{ // استلم جزء دلوقتي
  const {run,V}=boot(seed({txns:[sal]}),NOW);
  run("app.go('add');app.setKind('income');app.setLoan('sale');app.dset('saleWhat','كرسي');app.setFrom('سامي');app.dset('amount','1000');app.setSaleGot(true);");
  let v=V();
  t('«أيوه»: بيسأل كام وعلى أنهي حساب', v.indexOf('استلمت كام؟')>-1&&v.indexOf('على أنهي حساب؟')>-1&&v.indexOf('entrysave" disabled')>-1);
  run("app.dset('saleGotAmt','1200');app.setAccount('cash');");
  t('أكتر من المتفق عليه: مقفول وبينبه', V().indexOf('entrysave" disabled')>-1&&V().indexOf('أكتر من المتفق عليه')>-1);
  run("app.dset('saleGotAmt','400');render();");t('400 من 1000: اتفتح', V().indexOf('entrysave" disabled')<0);
  const c0=run("balances('me').cash");
  run("app.setDate('2026-11-18');app.saleEntrySave();");
  const p=JSON.parse(run("JSON.stringify(D.txns.find(x=>x.saleOf))"));
  t('اللي استلمته دخل «بيع حاجات» على الكاش بتاريخ البيعة', p.kind==='income'&&p.icat==='sale'&&p.amount===400&&p.account==='cash'&&p.from==='سامي'&&p.date==='2026-11-18'&&p.note==='بيع — كرسي');
  t('الكاش زاد 400 والبيعة بتاريخها', run("balances('me').cash")===c0+400&&run("D.sales[0].date")==='2026-11-18');
  t('فاضل 600 في «فلوس ليك»', run("saleLeft(D.sales[0])")===600&&run("peopleLedger()[0].recTot")===600);
  t('مالهاش علامة عملية (بتتعدل من «فلوس ليك»)', !p.op&&!run("D.sales[0].op"));
  run("app.go('home');");v=V();
  t('«استلمت» و«عدّل» لسه في «فلوس ليك»', v.indexOf('بيعة: كرسي')>-1);
}
{ // الزراير القديمة اتشالت، والتعديل مابيعرضش «بيعة»
  const {run,V}=boot(seed({txns:[sal],owed:[{id:'o',who:'علي',amount:50,date:'2026-11-01'}]}),NOW);
  run("app.go('home');app.spendToggle();app.toggleOwedPanel();");
  t('مفيش «ضيف بيعة» في «تقدر تصرف» ولا «فلوس ليك»', V().indexOf('ضيف بيعة')<0&&V().indexOf('saleGo')<0);
  run("app.go('add');app.setKind('income');app.setFrom('x');app.dset('amount','10');app.setAccount('cib');app.saveEntry();");
  const id=run("D.txns.find(x=>x.amount===10).id");
  run("app.go('log');app.startTxnEdit({stopPropagation(){}},'"+id+"');");
  t('تعديل دخل: «بيعة» مش ظاهرة', run("!!editOp")&&V().indexOf('>بيعة</button>')<0);
}
{ // خانات الأرقام
  const src=require('fs').readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');
  const bad=(src.match(/<input[^>]*inputmode="(?:decimal|numeric)"[^>]*onchange="[^"]*numFix[^>]*>/g)||[]).filter(x=>x.indexOf('oninput=')<0);
  t('مفيش خانة أرقام بتتحول بس لما تسيبها', bad.length===0, bad.join('\n'));
  const {run}=boot(seed({}),NOW);
  run("var __el={tagName:'INPUT',value:'١٢٣٫٥',selectionStart:5,getAttribute:k=>k==='inputmode'?'decimal':null,setSelectionRange(){}};numInputFix(__el);");
  t('أي خانة أرقام: «١٢٣٫٥» ← «123.5» وانت بتكتب', run("__el.value")==='123.5');
  run("var __e2={tagName:'INPUT',value:'أحمد ١',getAttribute:()=>null};numInputFix(__e2);");
  t('خانة كلام عادية ماتتلمسش', run("__e2.value")==='أحمد ١');
}
done();
