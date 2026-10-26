// الفاوتشرات من الإعدادات، قراءة رسالة الفاوتشر، الترتيب، المسافة تحت المبلغ، ترتيب الاشتراكات بالساعة
const {boot,seed,t,done}=require('./harness');
const fs=require('fs'), tick=()=>new Promise(r=>setImmediate(r));
const MSG='تم استبدال 200000 نقطة BONUS بقسيمة رقم 9000000000004 بقيمة 1000 جم صالحة حتى 28/12/2026. لمعرفة التجار، قم بزيارة  bonus.cibeg.com .تطبق الشروط والأحكام \nCIB BONUS';
const vch=(o)=>Object.assign({id:'v'+Math.random().toString(36).slice(2,6),code:'111',amount:100,expiry:'2026-12-01',card:'123456',used:false,usedOn:'',added:'2026-09-01'},o);
const src=fs.readFileSync(process.env.MASAREEF_HTML||__dirname+'/../index.html','utf8');

{ // مفيش بيانات شخصية جوه البرنامج
  /* بياناتك الحقيقية (لو النسخة الاحتياطية موجودة جنب الاختبارات) مش مكتوبة جوه البرنامج */
  const U=fs.existsSync(__dirname+'/backup.json')?JSON.parse(fs.readFileSync(__dirname+'/backup.json','utf8')):{};
  const priv=[U.cardDigits,U.phone].concat((U.vouchers||[]).map(v=>v.code)).filter(x=>x&&String(x).length>=4);
  t('رقم البطاقة والموبايل مش مكتوبين جوه البرنامج', priv.every(x=>src.indexOf(String(x))<0));
  t('«CIB» مش مكتوبة ثابتة في الفاوتشرات', src.indexOf('بنك CIB')<0&&src.indexOf('فاوتشر CIB')<0);
  const {run}=boot(seed());
  t('حد جديد: الخانات فاضية والإعدادات مش متظبطة', run("D.cardDigits")===''&&run("D.phone")===''&&run("D.vchAcct")===''&&!run("vchSetupOk()"));
}
{ // بياناتك القديمة
  const {run}=boot(seed({cardDigits:'900001',phone:'01000000009',vouchers:[vch({})]}));
  t('الأرقام القديمة فضلت', run("D.cardDigits")==='900001'&&run("D.phone")==='01000000009');
  t('الفاوتشرات القديمة اتربطت بحساب البنك', run("D.vchAcct")==='cib'&&run("vchBank()")==='حساب CIB');
}
{ // الإعدادات
  const {run,V,doc}=boot(seed());
  run("app.goVchSet();");let v=V();
  t('قسم الفاوتشرات في الإعدادات مفتوح', run("tab")==='settings'&&v.indexOf('الفاوتشرات جاية من أنهي حساب؟')>-1&&v.indexOf('vchcard')>-1&&v.indexOf('vchphone')>-1);
  t('الصف فيه حسابات البنك بس', v.indexOf('حساب CIB')>-1&&!/vchacct[^]*?كارت المشتريات/.test(v.slice(v.indexOf('الفاوتشرات جاية'),v.indexOf('vchcard'))));
  run("app.setVchAcct('cib');");
  doc.getElementById('vchcard').value='90-00 01';doc.getElementById('vchphone').value='010 1234 5678';
  run("app.saveVchSet();");
  t('اتحفظت', run("D.vchAcct")==='cib'&&run("D.cardDigits")==='900001'&&run("D.phone")==='01012345678'&&run("vchSetupOk()"));
}
{ // شاشة ضيف فاوتشر
  let x=boot(seed());x.run("app.goVouchers();app.toggleVch();");let v=x.V();
  t('من غير إعدادات: سطر يوديك للإعدادات', v.indexOf('كمّل بيانات الفاوتشرات')>-1&&v.indexOf('readonly')<0&&v.indexOf('الصق رسالة الفاوتشر')>-1);
  x=boot(seed({cardDigits:'900001',phone:'0101',vchAcct:'cib'}));x.run("app.goVouchers();app.toggleVch();");
  t('بالإعدادات: مفيش السطر', x.V().indexOf('كمّل بيانات الفاوتشرات')<0);
}
{ // قراءة الرسالة
  const {run}=boot(seed());
  const m=run("JSON.stringify(parseVchMsg("+JSON.stringify(MSG)+"))");
  t('الرسالة: الرقم والقيمة والانتهاء', m===JSON.stringify({code:'9000000000004',amount:'1000',expiry:'2026-12-28'}), m);
  t('بأرقام عربي', run("parseVchMsg('بقسيمة رقم ٢٠١٦٨٠٤٨٩١٨١٥ بقيمة ٥٠٠ جم صالحة حتى ٠٥/٠١/٢٠٢٧').expiry")==='2027-01-05');
  t('رسالة بنك عادية مش فاوتشر', run("parseVchMsg('تم خصم 120 جنيه من بطاقتك')")===null);
}
(async()=>{
  { const {run}=boot(seed());run("app.goVouchers();app.toggleVch();navigator.clipboard={readText:async()=>"+JSON.stringify(MSG)+"};app.pasteVchMsg();");
    for(let i=0;i<5;i++)await tick();
    t('الصق رسالة الفاوتشر بيملى الخانات', run("vchDraft.code")==='9000000000004'&&run("vchDraft.amount")==='1000'&&run("vchDraft.expiry")==='2026-12-28');
    run("navigator.clipboard={readText:async()=>'رقم 99887766'};app.pasteVchMsg();");for(let i=0;i<5;i++)await tick();
    t('رقم بس: بيتحط في خانة الرقم', run("vchDraft.code")==='99887766');
    run("navigator.clipboard={readText:async()=>'أهلا'};app.pasteVchMsg();");for(let i=0;i<5;i++)await tick();
    t('مفيش حاجة: رسالة واضحة', run("vchMsg")==='مفيش رسالة فاوتشر ولا رقم في الحافظة.');
  }
  { const {run}=boot(seed());run("globalThis.__f=0;fetch=async()=>{__f++;throw new Error('x');};navigator.clipboard={readText:async()=>"+JSON.stringify(MSG)+"};app.go('scan');app.pasteSms();");
    for(let i=0;i<5;i++)await tick();
    t('رسالة فاوتشر في «الصق رسالة بنك»: بتفتح ضيف فاوتشر من غير مفتاح ولا طلب', run("tab")==='wallet'&&run("wtab")==='vouchers'&&run("showVch")===true&&run("vchDraft.code")==='9000000000004'&&run("__f")===0&&!run("sms.err"));
  }
  { // العرض والترتيب والمشاركة
    const L=[vch({id:'u1',code:'U1',used:true,usedOn:'2026-09-11',added:'2026-09-20'}),
      vch({id:'g1',code:'G1',given:true,givenTo:'كريم',added:'2026-09-18'}),
      vch({id:'a1',code:'A1',added:'2026-08-01'}),vch({id:'a2',code:'A2',added:'2026-09-05'}),
      vch({id:'u2',code:'U2',used:true,usedBy:'سامي',usedOn:'2026-09-09',added:'2026-09-25'})];
    const {run,V}=boot(seed({vouchers:L,cardDigits:'900001',phone:'01011112222',vchAcct:'cib'}));
    run("app.goVouchers();");const v=V();
    const pos=c=>v.indexOf('>'+c+'<');
    t('الترتيب: شغال (الأجدد فوق) ← مبعوت ← مستخدم (الأجدد فوق)', pos('A2')<pos('A1')&&pos('A1')<pos('G1')&&pos('G1')<pos('U2')&&pos('U2')<pos('U1'), [pos('A2'),pos('A1'),pos('G1'),pos('U2'),pos('U1')].join());
    t('«استخدمته» و«استخدمه سامي»', v.indexOf('استخدمته في')>-1&&v.indexOf('استخدمه سامي')>-1);
    t('اسم الحساب ظاهر ورقم البطاقة لأ', v.indexOf('حساب CIB')>-1&&v.indexOf('900001')<0&&v.indexOf('123456')<0);
    run("globalThis.__txt='';navigator.share=async o=>{__txt=o.text;};app.shareVch('a2');");for(let i=0;i<5;i++)await tick();
    const tx=run("__txt");
    t('المشاركة: نفس الكلام والبنك من الإعدادات', tx.indexOf('فاوتشر — حساب CIB')===0&&tx.indexOf('رقم الفاوتشر: A2')>-1&&tx.indexOf('آخر 6 أرقام من البطاقة: 123456')>-1&&tx.indexOf('رقم الموبايل: 01011112222')>-1, tx);
  }
  { // المسافة تحت المبلغ
    t('صف العملة مش لازق في خانة المبلغ (٤ أماكن)', (src.match(/<div style="margin-top:8px">\$\{pickRow\('(subcur|subcur2|subcur3|sdcur)/g)||[]).length===4);
  }
  { // الاشتراكات: نفس اليوم بالساعة
    const sub=(id,name,at)=>({id,name,amount:100,cur:'EGP',cycle:'monthly',next:'2026-09-25',at,account:'card',cat:'subs',payments:[],dues:[]});
    const {run,V}=boot(seed({subs:[sub('s1','Crunchyroll','23:30'),sub('s2','Netflix','20:15'),Object.assign(sub('s3','Later',''),{next:'2026-10-02'})]}));
    run("tab='wallet';wtab='subs';render();");const v=V();
    t('نفس اليوم: الأبدري فوق', v.indexOf('Netflix')<v.indexOf('Crunchyroll')&&v.indexOf('Crunchyroll')<v.indexOf('Later'));
    t('«الجاي النهارده» من غير ساعة ومن غير تكرار', /الجاي <b[^>]*>النهارده<\/b>/.test(v)&&v.indexOf(' الساعة ')<0&&(v.match(/>النهارده</g)||[]).length===2, (v.match(/>النهارده</g)||[]).length);
  }
  done();
})();
