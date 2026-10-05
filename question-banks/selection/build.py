#!/usr/bin/env python3
import argparse,json,re,xml.etree.ElementTree as ET
from pathlib import Path
from collections import Counter
ASDIV_TIER={'Addition':'reinforce','Subtraction':'reinforce','Multiplication':'reinforce','Common-Division':'reinforce','Sum':'reinforce','Difference':'reinforce','TVQ-Final':'reinforce','Comparison':'advanced','Ratio':'advanced','Geometry':'advanced','TVQ-Change':'advanced','TVQ-Initial':'advanced','Surplus':'advanced','Floor-Division':'advanced','Ceil-Division':'advanced','Sequential-Operation':'advanced','Set-Operation':'advanced','UnitTrans':'advanced','Number-Operation':'advanced','Number-Pattern':'advanced','Algebra-1':'advanced','Algebra-2':'advanced','GCD':'advanced','LCM':'advanced'}
ALIAS={'Substraction':'Subtraction','Common-Divison':'Common-Division'}
SVAMP={'Addition':'reinforce','Subtraction':'reinforce','Multiplication':'reinforce','Common-Division':'reinforce'}
def typ(x): return ALIAS.get((x or '').strip(),(x or '').strip())
def tags(t):
 t=t.lower(); a=[]
 for k,ws in {'percent':['percent','%','discount'],'rate-time':['mile','mph','kilometer','meter per','hour','minute'],'geometry-measure':['area','perimeter','rectangle','square','triangle','circle','volume'],'average':['average','mean'],'ratio-multiplicative':['ratio','times as many','twice','triple','double'],'money':['dollar','$','cost','price','profit','pay','earn','sell','buy','bought'],'fraction':['fraction','half','third','quarter','1/','2/','3/']}.items():
  if any(w in t for w in ws):a.append(k)
 return a
def asdiv(p):
 out=[]
 for x in ET.parse(p).getroot().findall('.//Problem'):
  s=x.find('Solution-Type'); t=typ(s.text); tier=ASDIV_TIER.get(t,'review')
  out.append({'bank':'asdiv','source_id':x.attrib.get('ID'),'source_grade':x.attrib.get('Grade'),'source_type':t,'tier':tier,'decision':'selected' if tier!='review' else 'review','tags':tags(x.findtext('Body','')+' '+x.findtext('Question',''))})
 return out
def svamp(p):
 out=[]
 for x in json.load(open(p,encoding='utf8')):
  t=typ(x.get('Type')); tier=SVAMP.get(t,'review'); reason='selected-for-semantic-variation'
  if x.get('ID')=='chal-50':tier='review';reason='known-insufficient-condition'
  out.append({'bank':'svamp','source_id':x.get('ID'),'source_type':t,'tier':tier,'decision':'selected' if tier!='review' else 'review','reason':reason,'tags':tags(x.get('Body','')+' '+x.get('Question',''))})
 return out
def gsm(p):
 out=[]
 for split in ['train','test']:
  for i,line in enumerate(open(p/f'{split}.jsonl',encoding='utf8')):
   x=json.loads(line); steps=len(re.findall(r'<<[^>]+>>',x['answer'])); tier='reinforce' if steps<=2 else 'advanced' if steps<=5 else 'review'
   out.append({'bank':'gsm8k','source_id':f'{split}-{i+1:04d}','source_split':split,'source_type':'multi-step-word-problem','tier':tier,'decision':'selected' if tier!='review' else 'review','reason':'step-count-and-content-screen' if tier!='review' else 'long-reasoning-chain-review','operation_count':steps,'tags':tags(x['question'])})
 return out
def summary(rs):return {'total':len(rs),'decision':dict(Counter(x['decision'] for x in rs)),'tier':dict(Counter(x['tier'] for x in rs)),'types':dict(Counter(x['source_type'] for x in rs)),'tags':dict(Counter(t for x in rs for t in x['tags']))}
def main():
 a=argparse.ArgumentParser();a.add_argument('--source-root',type=Path,required=True);a.add_argument('--output',type=Path,required=True);z=a.parse_args();A=asdiv(z.source_root/'asdiv/dataset/ASDiv.xml');S=svamp(z.source_root/'svamp/SVAMP.json');G=gsm(z.source_root/'gsm8k/grade_school_math/data');z.output.mkdir(parents=True,exist_ok=True)
 for n,rs in [('asdiv_selection.jsonl',A),('svamp_selection.jsonl',S),('gsm8k_selection.jsonl',G)]:
  with open(z.output/n,'w',encoding='utf8') as f:
   for r in rs:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
 rep={'asdiv':summary(A),'svamp':summary(S),'asdiv_svamp_selected':summary([x for x in A+S if x['decision']=='selected']),'gsm8k':summary(G),'gsm8k_selected':summary([x for x in G if x['decision']=='selected'])}
 (z.output/'selection_report.json').write_text(json.dumps(rep,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(rep,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
