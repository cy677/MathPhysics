"""Rebuild nested banks from preserved original entries and audited THUOCL DF values."""
from pathlib import Path
import json

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
POOLS = (200, 400, 600, 800, 1000)

def main():
    entries = json.loads((BASE / 'data.json').read_text(encoding='utf-8'))
    entries = sorted(entries, key=lambda e: e['id'])
    frequency = {}
    for line in (ROOT / 'research' / 'thuocl_matched.tsv').read_text(encoding='utf-8').splitlines():
        word, df = line.split()
        if word in frequency:
            raise ValueError(f'Duplicate frequency entry: {word}')
        frequency[word] = int(df)
    if len(entries) != 1000 or len({e['word'] for e in entries}) != 1000:
        raise ValueError('Expected 1000 distinct original entries.')
    if len(frequency) != 937 or set(frequency) - {e['word'] for e in entries}:
        raise ValueError('Expected 937 exact source matches.')
    for e in entries:
        if len(e['word']) != 4 or len(e['pinyin'].split()) != 4:
            raise ValueError(f'Invalid word or pinyin: {e}')
        e['frequency'] = {
            'source_id': 'THUOCL_chengyu_2016', 'metric': 'document_frequency',
            'df': frequency.get(e['word']),
            'status': 'exact_match' if e['word'] in frequency else 'not_matched',
        }
    entries.sort(key=lambda e: (e['frequency']['df'] is None, -(e['frequency']['df'] or 0), e['id']))
    for rank, e in enumerate(entries, 1):
        e['rank'] = rank
        e['minimumPool'] = next(size for size in POOLS if rank <= size)
    source = {
        'source_id': 'THUOCL_chengyu_2016',
        'name': 'THUOCL：清华大学开放中文词库 · 成语',
        'repository': 'https://github.com/thunlp/THUOCL',
        'data_url': 'https://github.com/thunlp/THUOCL/blob/master/data/THUOCL_chengyu.txt',
        'raw_url': 'https://raw.githubusercontent.com/thunlp/THUOCL/master/data/THUOCL_chengyu.txt',
        'data_blob_sha': '44d91b3349753dc7f43b53e8cf64cda790c9ea22',
        'source_rows': 8519,
        'corpus': '新浪新闻', 'corpus_period': '2008-01 至 2016-11',
        'corpus_documents': 8421097, 'source_release_date': '2016-12-24',
        'retrieved_on': '2026-10-15',
        'metric': 'document_frequency',
        'metric_definition': '出现该词的语料文档个数；不是该词总出现次数，不是百分比。',
        'license': 'MIT',
        'citation': '韩世依，张钰晖，马云山，涂存超，郭志芃，刘知远，孙茂松．THUOCL：清华大学开放中文词库．2016．',
        'ranking_scope': '仅对原游戏已有的1000条成语重新排序，并非所有汉语成语的全国前1000名。',
        'ordering': '先按精确匹配到的DF降序，同值按原id升序；无精确匹配者附于末尾并按原id升序。',
        'missing_value': '未匹配到来源词条时df=null，不赋零、不借用异形词数值，也不推断其实际低频。',
        'coverage': {'total': 1000, 'exact_matches': 937, 'not_matched': 63},
        'limitations': [
            '新闻语料具有文体和年代偏向，不是2026年的实时使用频率。',
            '使用频率不等于儿童理解难度；五档是词库范围，不是教育部规定的年级分级。',
            '前200、400、600、800档均有同来源DF；1000档含63条无精确匹配的补充词条。',
            '原有拼音与入门简释沿用原游戏，不由THUOCL提供，也不代表经过该项目审定。'
        ]
    }
    write_json = lambda p, v: p.write_bytes((json.dumps(v, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    write_json(BASE / 'data.json', entries)
    write_json(BASE / 'source.json', source)
    groups = json.loads((BASE / 'groups.json').read_text(encoding='utf-8'))
    banks = ROOT / '词库'
    banks.mkdir(exist_ok=True)
    report = []
    for size in POOLS:
        subset = entries[:size]
        payload = {'version': '2.0', 'size': size, 'description': f'原游戏1000条范围内按公开DF排序的前{size}条，逐级包含。',
                   'source': source, 'groups': groups, 'idioms': subset}
        write_json(banks / f'成语词库_{size}.json', payload)
        (banks / f'成语词库_{size}.txt').write_bytes(('\n'.join(e['word'] for e in subset) + '\n').encode('utf-8'))
        known = [e['frequency']['df'] for e in subset if e['frequency']['df'] is not None]
        report.append({'size':size, 'matched':len(known), 'unmatched':size-len(known), 'first':subset[0]['word'], 'last':subset[-1]['word'], 'min_known_df':min(known)})
    write_json(ROOT / 'research' / '分档统计.json', report)
    practice = json.loads((BASE / 'practice.json').read_text(encoding='utf-8'))
    if len(practice) != 32 or len({e['word'] for e in practice}) != 32 or len({e['id'] for e in practice}) != 32:
        raise ValueError('Expected 32 distinct image practice words.')
    by_id = {e['id']: e for e in entries}
    by_word = {e['word']: e for e in entries}
    for e in practice:
        if len(e['word']) != 4 or len(e['pinyin'].split()) != 4:
            raise ValueError(f'Invalid practice word or pinyin: {e}')
        if e['id'] in by_id and by_id[e['id']]['word'] != e['word']:
            raise ValueError(f'Practice ID conflicts with original bank: {e}')
        if e['word'] in by_word and by_word[e['word']]['id'] != e['id']:
            raise ValueError(f'Practice word must reuse original ID: {e}')
    write_json(banks / '练习词库.json', {'version':'2.0', 'size':len(practice), 'description':'用户提供的三张图片中的词语，去重后每局全部出现。', 'idioms':practice})
    (banks / '练习词库.txt').write_bytes(('\n'.join(e['word'] for e in practice) + '\n').encode('utf-8'))
    missing = [e['word'] for e in entries if e['frequency']['df'] is None]
    (ROOT / 'research' / '未匹配词条.txt').write_bytes(('\n'.join(missing)+'\n').encode('utf-8'))
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__ == '__main__':
    main()
