#!/bin/sh
# بيطلّع كود البرنامج من index.html ويشغّل كل الاختبارات
# الاستخدام: sh run.sh path/to/index.html
H="${1:-$(dirname "$0")/../index.html}"
case "$H" in /*) ;; *) H="$PWD/$H";; esac
export MASAREEF_HTML="$H"
cd "$(dirname "$0")"
python3 -c "
import sys;s=open(sys.argv[1],encoding='utf-8').read()
i=s.rfind('<script>');j=s.rfind('</script>')
open('s0.js','w',encoding='utf-8').write(s[i+8:j])" "$H"
for f in sweep regress inv b*.js; do f=${f%.js}; printf "%s: " $f; o=$(node $f.js 2>&1); r=$(printf "%s\n" "$o" | grep "FAIL\|>>>" | tr '\n' ' ')
  case "$r" in *">>>"*) echo "$r";; *) echo "$r FAIL — الاختبار وقف قبل ما يخلص: $(printf "%s\n" "$o" | grep -m1 "Error")";; esac; done
