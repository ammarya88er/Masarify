const {boot,seed,t,done}=require('./harness');
const S=seed({_autoSince:'2026-09-01',subs:[{id:'a',name:'ChatGPT',amount:20,cur:'USD',next:'2026-09-24',at:'10:00',account:'card',cycle:'monthly',payments:[],dues:[]}]});
const {run,V,doc}=boot(S);
run("chargeSub(D.subs[0],'2026-09-24');sortTxns();save();app.go('home');alertsOpen=true;render();");
const id=run("D.txns[0].id");let v=V();
t('بعد الخصم: محجوز وظبّط جنب بعض', v.indexOf("app.startFix('"+id+"','hold')\">محجوز")>-1 && v.indexOf("app.startFix('"+id+"','final')\">أكّد المبلغ")>-1);
run("app.startFix('"+id+"','hold');");v=V();
t('محجوز بيفتح خانة الرصيد بس', v.indexOf('id="fixbal"')>-1 && v.indexOf('id="fixin"')<0);
doc.getElementById('fixbal').value='40954';run("app.fixHold('"+id+"');");v=V();
t('المحجوز اتسجل', run("D.txns[0].amount")===1046 && run("D.txns[0].hold")===true, run("D.txns[0].amount"));
t('زرار محجوز اختفى وظبّط فاضل', v.indexOf("'hold')\">محجوز")<0 && v.indexOf("app.startFix('"+id+"','final')")>-1);
run("app.startFix('"+id+"','final');");v=V();
t('ظبّط بيفتح المبلغ النهائي بس', v.indexOf('id="fixin"')>-1 && v.indexOf('id="fixbal"')<0);
doc.getElementById('fixin').value='1050';run("app.confirmFix('"+id+"');");
t('النهائي اتسجل والتنبيه راح', run("D.txns[0].amount")===1050 && !run("D.txns[0].pending") && V().indexOf("app.startFix('"+id+"'")<0);
{ // من غير محجوز: ظبّط على طول
  const {run,V,doc}=boot(S);run("chargeSub(D.subs[0],'2026-09-24');sortTxns();save();app.go('home');alertsOpen=true;render();");
  const id=run("D.txns[0].id");run("app.startFix('"+id+"','final');");doc.getElementById('fixin').value='1040';run("app.confirmFix('"+id+"');");
  t('ظبّط على طول من غير محجوز', run("D.txns[0].amount")===1040 && !run("D.txns[0].pending"));
}
{ // جنيه: ظبّط بس
  const S2=seed({txns:[{id:'x',book:'me',kind:'expense',amount:50,cat:'fees',account:'card',date:'2026-09-24',pending:true,insFee:true}]});
  const {run,V}=boot(S2);run("app.go('home');alertsOpen=true;render();");
  t('التقديري بالجنيه مالوش محجوز', V().indexOf("'hold')\">محجوز")<0 && V().indexOf("app.startFix('x','final')")>-1);
}
done();
