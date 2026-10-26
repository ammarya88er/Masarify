// الثوابت على بياناتك الحقيقية — لازم تعدّي قبل أي رفع:
// ١) تعديل أي حركة من غير ما تغيّر حاجة مايغيّرش أي رقم
// ٢) عمليات عشوائية كتير (تسجيل ثم مسح) بترجّع البيانات والأرصدة زي ما كانت
// ٣) مفيش حاجات بتشاور على حركات مش موجودة أكتر من اللي كان
const {boot,t,done}=require('./harness');
const fs=require('fs');
const NOW=Date.UTC(2026,9,15,9,0,0);
const data=()=>JSON.parse(fs.readFileSync(__dirname+'/backup.json','utf8'));
/* مقارنة بالمعنى: ترتيب المفاتيح مايفرقش، وعلامة العملية (op) مش بيانات */
const canon=v=>Array.isArray(v)?v.map(canon):(v&&typeof v==='object')?Object.keys(v).filter(k=>k!=='op'&&v[k]!==undefined&&v[k]!==null&&v[k]!=='').sort().reduce((o,k)=>{o[k]=canon(v[k]);return o;},{}):v;
const strip=s=>{const o=JSON.parse(s);delete o._sv;delete o.ghLastSync;delete o.ops;return JSON.stringify(canon(o));};
/* التعديل: لو اتفتحت شاشة العملية بنحفظها زي ما هي، ولو اتفتح التعديل الصغير بنحفظه */
const editSave=(run,id)=>{run(`app.startTxnEdit({stopPropagation(){}},'${id}')`);
  const f=run("editOp&&D.ops[editOp]?D.ops[editOp].f:''");
  if(f==='entry')run('app.saveEntry()');else if(f==='office')run('app.oSave()');else if(f==='receipt')run('app.saveReceipt()');
  else run(`app.saveTxnEdit('${id}')`);
  return f;};
const orphans=run=>JSON.parse(run(`(function(){const ids={};D.txns.forEach(t=>ids[t.id]=1);let n=0;
  (D.owed||[]).forEach(o=>{if(o.srcTxn&&!o.got&&!ids[o.srcTxn])n++;});
  (D.subs||[]).forEach(s=>(s.payments||[]).forEach(p=>{if(p.t&&!ids[p.t])n++;}));
  (D.certs||[]).forEach(c=>(c.payments||[]).forEach(p=>{if(p.t&&!ids[p.t])n++;}));
  const L={};D.txns.forEach(t=>{if(t.link)L[t.link]=(L[t.link]||0)+1;});Object.keys(L).forEach(k=>{if(L[k]<2)n++;});
  return n;})()`));
const bal=run=>run("JSON.stringify([balances('me'),balances('office')])");
let seedN=7;const rnd=()=>{seedN=(seedN*48271)%2147483647;return seedN/2147483647;};
const pick=a=>a[Math.floor(rnd()*a.length)];

{ // ١) تعديل من غير تغيير
  const {run}=boot(data(),NOW);run('render();');
  const ids=JSON.parse(run("JSON.stringify(D.txns.map(t=>t.id))"));
  const bad=[];
  ids.forEach(id=>{
    const before=strip(run('JSON.stringify(D)'));
    editSave(run,id);
    if(run('editOp?1:0')){bad.push(id+':stuck');run('app.cancelEditOp()');}
    const after=strip(run('JSON.stringify(D)'));
    if(before!==after)bad.push(id);
  });
  t('تعديل من غير تغيير مايغيّرش حاجة ('+ids.length+' حركة)', bad.length===0, bad.slice(0,5).join(','));
}
{ // ٢ و٣) عمليات عشوائية وبعدين مسحها
  const {run}=boot(data(),NOW);run('render();');
  const b0=bal(run), o0=orphans(run), n0=run('D.txns.length');
  const accs=JSON.parse(run("JSON.stringify(accountsFor('me').filter(a=>!a.closed&&!isFxAcc(a.id)&&!isSave(a)).map(a=>a.id))"));
  const cats=JSON.parse(run("JSON.stringify(D.cats.map(c=>c.id))"));
  const made=[];
  for(let i=0;i<200;i++){
    const kind=pick(['expense','expense','income','transfer']);
    const acc=pick(accs);let to=pick(accs);if(to===acc)to=accs.find(a=>a!==acc);
    const amt=(Math.floor(rnd()*90000)/100+1).toFixed(2);
    run(`app.go('add');app.setKind('${kind}');app.setAccount('${acc}');`+(kind==='transfer'?`app.setTo('${to}');`:'')
      +(kind==='expense'?`app.setCat('${pick(cats)}');`:'')+`app.dset('amount','${amt}');app.dset('note','اختبار ${i}');app.saveEntry();`);
    const id=run(`(D.txns.find(t=>t.note==='اختبار ${i}')||{}).id`);
    if(id)made.push(id);
  }
  t('العمليات اتسجلت', made.length>150, made.length);
  t('مفيش حاجات معلقة زيادة بعد التسجيل', orphans(run)<=o0, orphans(run)+' vs '+o0);
  made.forEach(id=>run(`app.delTxn({stopPropagation(){}},'${id}')`));
  t('بعد المسح عدد الحركات رجع', run('D.txns.length')===n0);
  t('بعد المسح الأرصدة رجعت بالظبط', bal(run)===b0);
  t('مفيش حاجات معلقة زيادة بعد المسح', orphans(run)<=o0);
}
{ // ٤) التراجع: أي تسجيل أو تعديل أو مسح وبعده «تراجع» بيرجّع البيانات زي ما كانت بالظبط
  const {run}=boot(data(),NOW);run('render();');
  const accs=JSON.parse(run("JSON.stringify(accountsFor('me').filter(a=>!a.closed&&!isFxAcc(a.id)&&!isSave(a)&&!a.credit).map(a=>a.id))"));
  const all=JSON.parse(run("JSON.stringify(D.txns.map(t=>t.id))"));
  const bad=[];
  for(let i=0;i<60;i++){
    const before=strip(run('JSON.stringify(D)'));
    const what=i%3;
    if(what===0)run(`app.go('add');app.setKind('expense');app.setAccount('${pick(accs)}');app.setCat('other');app.dset('amount','${(i+1)*7}');app.saveEntry();`);
    else if(what===1){const id=pick(all);if(!run(`D.txns.some(t=>t.id==='${id}')`))continue;run(`app.delTxn({stopPropagation(){}},'${id}')`);}
    else{const id=pick(all);if(!run(`D.txns.some(t=>t.id==='${id}')`))continue;
      run(`app.startTxnEdit({stopPropagation(){}},'${id}')`);
      if(run('editOp?1:0')){const f=run('D.ops[editOp].f');
        if(f==='entry')run("app.dset('note','تعديل');app.saveEntry()");else if(f==='office')run("app.oSet('onote','تعديل');app.oSave()");else run('app.saveReceipt()');}
      else{run("if(eTxn)eTxn.date='2026-01-01'");run(`app.saveTxnEdit('${id}')`);}}
    if(!run('lastUndo?1:0'))continue;
    run('app.undoLast()');
    if(strip(run('JSON.stringify(D)'))!==before)bad.push(i+':'+what);
  }
  t('التراجع بيرجّع البيانات بالظبط', bad.length===0, bad.join(','));
}
done();
