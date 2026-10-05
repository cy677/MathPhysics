import json,unittest
from pathlib import Path
P=Path(__file__).parents[1]/'curated'
def rows(n):
 with open(P/n,encoding='utf8') as f:return [json.loads(x) for x in f]
class T(unittest.TestCase):
 def test_counts(self):
  self.assertEqual(len(rows('asdiv_selection.jsonl')),2305);self.assertEqual(len(rows('svamp_selection.jsonl')),1000);self.assertEqual(len(rows('gsm8k_selection.jsonl')),8792)
 def test_svamp_bad(self):
  x=next(x for x in rows('svamp_selection.jsonl') if x['source_id']=='chal-50');self.assertEqual(x['decision'],'review')
 def test_gsm_separate(self):self.assertTrue(all(x['bank']=='gsm8k' for x in rows('gsm8k_selection.jsonl')))
if __name__=='__main__':unittest.main()
