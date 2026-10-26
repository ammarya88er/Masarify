// ثوابت اشتراك المكتب واشتراك حد تاني على بياناتك الحقيقية (لو backup.json موجود، وإلا بيانات تجريبية)
const {boot,seed,t,done,r2}=require('./harness');
const fs=require('fs');
const NOW=Date.UTC(2026,9,26,9);
const has=fs.existsSync(__dirname+'/backup.json');
const data=()=>has?JSON.parse(fs.readFileSync(__dirname+'/backup.json','utf8'))
  :seed({subs:[{id:'a',name:'أ',amount:999.99,cur:'EGP',cycle:'monthly',next:'2026-11-25',account:'card',cat:'subs',arr:true,payments:[],dues:[]},
               {id:'b',name:'ب',amount:139,cur:'EGP',cycle:'monthly',next:'2026-11-29',account:'card',cat:'subs',arr:true,payments:[],dues:[]}]});
const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.keys(v).filter(k=>k!=='op'&&v[k]!==undefined&&v[k]!==null&&v[k]!=='').sort().reduce((o,k)=>{o[k]=canon(v[k]);return o;},{}):v;
const strip=s=>{const o=JSON.parse(s);delete o._sv;delete o.ghLastSync;delete o.ops;return JSON.stringify(canon(o));};

const {run,B}=boot(data(),NOW);run('render();');
// أول اشتراك على الكارت يبقى بتاع المكتب، والتاني بتاع حد تاني، وميعادهم النهارده
const ids=JSON.parse(run("JSON.stringify(D.subs.filter(s=>s.cur==='EGP'&&isCreditAcc(subAcc(s))&&!s.cancelAtEnd&&s.cycle!=='trial').map(s=>s.id))"));
const so=ids[0], sp=ids[1];
run(`(function(){const a=D.subs.find(s=>s.id==='${so}');a.owner='office';a.ocat=D.ocats[0].id;a.next=today();
  const b=D.subs.find(s=>s.id==='${sp}');b.owner='other';b.ownerName='صاحبي';b.next=today();delete b.cancelAtEnd;b.people=[];})()`);
const card0=B('me','card'), oc0=B('office',run("officeCashId()")), owe0=-run("loanBalance()");
const price=run(`subPrice(D.subs.find(s=>s.id==='${so}'))`);
run(`app.subCharged('${so}');app.setPaySubTake(false);app.confirmPaySub('${so}');`);
const p=`D.subs.find(s=>s.id==='${so}').payments.slice(-1)[0]`;
const tid=run(p+".t");
run(`app.startFeeFix('${so}|${tid}');document.getElementById('feein').value='30';app.confirmFee('${so}|${tid}');`);
run(`upDraft={amount:'${price}',refund:'12.36',acct:'card',date:today()};app.doUpgrade('${so}');`);
const rid=run("D.txns.find(x=>x.sofRef&&!x.refFee&&x.refWait).id");run(`app.refArrived('${rid}')`);
run(`app.subCharged('${sp}');`);

const fee=r2(12.36*0.03);
const psp=run(`subPrice(D.subs.find(s=>s.id==='${sp}'))`);
t('الكارت: الخصمين والتدبير والمرتجع واشتراك صاحبك بالظبط', r2(B('me','card')-card0)===r2(-price-30+12.36+fee-price-psp), r2(B('me','card')-card0));
t('كاش المكتب ماتحركش', B('office',run("officeCashId()"))===oc0);
const lines=run("r2s(D.txns.filter(x=>x.book==='office'&&x.sof&&x.kind==='expense').reduce((a,x)=>a+x.amount,0))");
t('اللي على المكتب = مجموع سطوره في دفتره', r2(-run("loanBalance()")-owe0)===lines, lines);
t('سطور المكتب كلها مقرّبة لأقرب 5', run("D.txns.filter(x=>x.book==='office'&&x.sof&&x.kind==='expense').every(x=>Math.abs(x.amount*100%500)<0.01)"));
t('فرق التقريب = اللي على المكتب ناقص اللي اتدفع فعلًا', r2(run("loanRnd()"))===r2(lines-(price+30-12.36-fee+price)), run("loanRnd()"));
t('اشتراك حد تاني: كله ليك عنده', run(`D.subs.find(s=>s.id==='${sp}').dues.slice(-1)[0].who`)==='صاحبي');

// البناء من تاني والتعديل من غير تغيير مايغيّروش حاجة
{const j=strip(run('JSON.stringify(D)'));run('subOffAll();');t('البناء من تاني مايغيّرش حاجة', strip(run('JSON.stringify(D)'))===j);}
{const all=JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.sof||x.sofP).map(x=>x.id))"));const bad=[];
  all.forEach(id=>{const b=strip(run('JSON.stringify(D)'));run(`app.startTxnEdit({stopPropagation(){}},'${id}')`);
    if(run('editOp?1:0'))run('app.cancelEditOp()');else run(`app.saveTxnEdit('${id}')`);
    if(strip(run('JSON.stringify(D)'))!==b)bad.push(id);});
  t('تعديل حركات الاشتراك من غير تغيير مايغيّرش حاجة', bad.length===0, bad.join(','));}
// مسح أي سطر وبعده تراجع
{const all=JSON.parse(run("JSON.stringify(D.txns.filter(x=>x.sof||x.sofP).map(x=>x.id))"));const bad=[];
  all.forEach(id=>{const b=strip(run('JSON.stringify(D)'));const bl=run("JSON.stringify([balances('me'),balances('office'),loanBalance(),loanRnd()])");
    run(`app.delTxn({stopPropagation(){}},'${id}')`);
    /* بعد المسح: مفيش تسوية من غير سطرها، ولا سطر مكتب من غير حركته */
    const ok=run("(D.floatLoans||[]).every(l=>!l.sof||D.txns.some(x=>x.id===l.srcTxn))&&D.txns.filter(x=>x.sof).every(x=>D.txns.some(y=>y.id===x.sof))");
    if(!ok)bad.push(id+':orphan');
    if(run('lastUndo?1:0'))run('app.undoLast()');
    if(strip(run('JSON.stringify(D)'))!==b||run("JSON.stringify([balances('me'),balances('office'),loanBalance(),loanRnd()])")!==bl)bad.push(id);});
  t('مسح أي سطر من الاشتراك وتراجعه بيرجّع كل حاجة', bad.length===0, bad.join(','));}
// «سوّها» على كله
{const o=-run("loanBalance()"),pr=run("loanRnd()"),cash0=B('me','cash');
  run(`flPay={bfrom:officeCashId(),bto:'cash'};document.getElementById('loanin').value=String(${o});app.settleLoan();`);
  t('سوّها: المكتب مابقاش عليه حاجة', Math.abs(run("loanBalance()"))<0.01&&Math.abs(run("loanRnd()"))<0.01);
  t('الكاش زاد باللي خدته بالظبط', r2(B('me','cash')-cash0)===r2(o));}
done();
