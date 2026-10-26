/* كل الشاشات في الدفترين، بالبيانات التجريبية وبيانات حقيقية، من غير أخطاء ولا NaN */
const {boot,seed,t,done}=require('./harness');
const fs0=require('fs');
/* بيانات حقيقية اختيارية: لو فيه backup.json جنب الاختبارات بيتفحص هو كمان */
const U=fs0.existsSync(__dirname+'/backup.json')?JSON.parse(fs0.readFileSync(__dirname+'/backup.json','utf8')):null;
let n=0;
for(const [nm,data] of [['تجريبي',seed()]].concat(U?[['حقيقي',U]]:[])){
  const {run,V}=boot(data);const err=[];
  const chk=l=>{n++;const v=V().replace(/="undefined"/g,'');if(/NaN|undefined</.test(v))err.push(l+': '+(v.match(/.{40}(NaN|undefined<).{20}/)||[''])[0]);};
  for(const bk of ['me','office']){
    for(const tb of ['home','add','scan','log','settings']){try{run(`app.setBook('${bk}');app.go('${tb}');alertsOpen=true;render();`);chk(bk+tb);}catch(e){err.push(bk+tb+' '+e.message);}}
    const w=bk==='me'?['accounts','vouchers','subs','ins','gam','certs','veh']:['accounts','close'];
    for(const x of w){try{run(`app.setBook('${bk}');app.go('wallet');app.setWtab('${x}');`);chk(bk+x);}catch(e){err.push(bk+x+' '+e.message);}}
  }
  for(const s of ['accs','daftar','cats','month','prices','fx','data','app','theme','wipe']){try{run(`app.setBook('me');app.go('settings');app.toggleSet('${s}');`);chk('set-'+s);}catch(e){err.push(s+' '+e.message);}}
  for(const k of ['expense','income','transfer']){try{run(`app.go('add');app.setKind('${k}');`);chk('add-'+k);}catch(e){err.push(k+e.message);}}
  t('كل الشاشات ('+nm+')', err.length===0, err.join(' | '));
}
console.log('  شاشات: '+n);
done();
