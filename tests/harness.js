// بيشغّل البرنامج من غير متصفح، بساعة ثابتة وبيانات تجريبية
const fs=require('fs'), vm=require('vm'), path=require('path');
const SRC=path.join(__dirname,'s0.js');
function mkEl(){return {style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},value:'',textContent:'',innerHTML:'',disabled:false,files:[],appendChild(){},remove(){},focus(){},select(){},setAttribute(){},getAttribute(){return null;},addEventListener(){},scrollIntoView(){},querySelector(){return mkEl();},querySelectorAll(){return [];}};}
function boot(seed,nowUtc){
  const src=fs.readFileSync(SRC,'utf8');
  const NOW=nowUtc||Date.UTC(2026,8,25,12,0,0);
  class FakeDate extends Date{constructor(...a){if(a.length===0)super(NOW);else super(...a);} static now(){return NOW;}}
  const els={};
  const doc={body:mkEl(),documentElement:mkEl(),getElementById(id){if(!els[id])els[id]=mkEl();return els[id];},querySelector(){return mkEl();},querySelectorAll(){return [];},createElement(){return mkEl();},addEventListener(){},hidden:false};
  const store={};
  const ls={getItem(k){return k in store?store[k]:null;},setItem(k,v){store[k]=String(v);},removeItem(k){delete store[k];}};
  const G={Date:FakeDate,document:doc,localStorage:ls,navigator:{storage:null},window:{addEventListener(){},scrollTo(){}},alert(){},confirm(){return true;},prompt(){return '';},fetch(){return Promise.reject(new Error('x'));},FileReader:function(){},Image:function(){},setTimeout(){return 0;},clearTimeout(){},setInterval(){return 0;},clearInterval(){},requestAnimationFrame(){return 0;}};
  if(seed)store['masareef:v3']=JSON.stringify(seed);
  const ctx=vm.createContext(G); G.globalThis=ctx;
  vm.runInContext(src,ctx,{filename:'app.js'});
  /* الاختبارات القديمة كانت معتمدة إن أسئلة «أيوه ولا لأ» بتبدأ «لأ» والدخل «مرتب»:
     قبل الحفظ بنجاوب اللي ماتجاوبش بنفس القيم دي (الاختبارات الجديدة بتنادي app['saveEntry']() عشان تتخطى ده) */
  vm.runInContext(`globalThis.__yn=function(){
    if(typeof YN_ENTRY!=='undefined'){YN_ENTRY.forEach(k=>{if(draft[k]===undefined)draft[k]=false;});if(draft.salary===undefined&&!draft.icat&&!draft.icatPicked)draft.salary=true;}
    if(typeof YN_OFFICE!=='undefined')YN_OFFICE.forEach(k=>{if(draftO[k]===undefined)draftO[k]=false;});
    if(typeof scan!=='undefined'&&scan&&scan.split===undefined)scan.split=false;
    if(typeof scan!=='undefined'&&scan&&scan.matchYes===undefined&&scan.match)scan.matchYes=false;
    if(typeof render==='function')render();}`,ctx);
  const run=c=>vm.runInContext(String(c).replace(/app\.(saveEntry|oSave|saveReceipt)\(\)/g,'(__yn(),app.$1())'),ctx);
  return {run,els,doc,V:()=>els['view'].innerHTML,B:(bk,id)=>Math.round(run("balances('"+bk+"')."+id)*100)/100};
}
function seed(o){
  return Object.assign({_sv:1,rate:50,p92:15.25,p95:17,officeOn:true,vehOn:true,ofeeLimit:200,monthMode:'cal',
   accounts:[{id:'cash',name:'كاش',opening:5000,openingOffice:0,scope:'me',atype:'cash'},
     {id:'cib',name:'حساب CIB',opening:10000,openingOffice:20000,scope:'both',atype:'bank'},
     {id:'card',name:'كارت المشتريات',opening:42000,limit:42000,credit:true,atype:'credit',stmtDay:20,graceDay:15,insure:true,insureRate:0.9,scope:'me',secured:[],insLast:'2026-09'},
     {id:'ocash',name:'كاش العهدة',opening:0,openingOffice:3000,scope:'office',atype:'cash'}],
   ocats:[{id:'c1',label:'شركات'},{id:'c2',label:'مشترك'}],groups:[],vehicles:[{id:'v1',name:'العربية'}],
   txns:[],owed:[],subs:[],installments:[],certs:[],vouchers:[],closings:[],stmts:[],floatLoans:[],ofees:[],lastBackup:'2026-09-25'},o||{});
}
let fails=0;
const t=(l,c,x)=>{if(c)console.log('  ok   '+l);else{fails++;console.log(' FAIL  '+l+(x!==undefined?' :: '+x:''));}};
const done=()=>{console.log(fails?('\n>>> '+fails+' فشل'):'\n>>> كله تمام');process.exitCode=fails?1:0;};
module.exports={boot,seed,t,done,r2:x=>Math.round(x*100)/100};
