#!/usr/bin/env python3
"""Import licensed upstreams intact. First import locks SHA256; reruns verify bytes.
No sim minification, puzzle truncation, remote iframe, CDN or source-code patching.
"""
from __future__ import annotations
import concurrent.futures, hashlib, io, json, os, re, shutil, tarfile, time, urllib.request, zipfile
from pathlib import Path, PurePosixPath
from phet_registry import verified_additions
ROOT = Path(__file__).resolve().parents[1]
LOCK_PATH = ROOT / 'config/upstream-lock.json'
LOCK = json.loads(LOCK_PATH.read_text()) if LOCK_PATH.exists() else {'schemaVersion':1,'files':{},'repositories':{}}
FILES = LOCK['files']
SIMS = ['area-builder','forces-and-motion-basics','energy-skate-park-basics','vector-addition']

def digest(data): return hashlib.sha256(data).hexdigest()
def get(url):
    for attempt in range(4):
        try:
            headers={'User-Agent':'MathPhysics-educational-integration/1.0'}
            if url.startswith('https://api.github.com/') and os.getenv('GH_TOKEN'):
                headers['Authorization']='Bearer '+os.environ['GH_TOKEN']
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=120) as response:
                data=response.read(100*1024*1024+1)
                if len(data)>100*1024*1024: raise ValueError('Download exceeds safety limit')
                return data
        except Exception:
            if attempt==3: raise
            time.sleep(2**attempt)

def save_download(path,url,license_id):
    rel=str(path); target=ROOT/rel; old=FILES.get(rel)
    if old and target.exists():
        data=target.read_bytes()
        if digest(data)!=old['sha256']: raise ValueError('Modified upstream file: '+rel)
        return data
    data=get(old['url'] if old else url)
    if old and digest(data)!=old['sha256']: raise ValueError('Upstream drift; refusing replacement: '+rel)
    target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(data)
    FILES[rel]={'url':url if not old else old['url'],'sha256':digest(data),'bytes':len(data),'license':license_id}
    print('IMPORTED',rel,len(data),flush=True)
    return data

def extract_zip(data,destination):
    destination.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for item in archive.infolist():
            parts=PurePosixPath(item.filename).parts[1:]
            if not parts or item.is_dir(): continue
            if '..' in parts or PurePosixPath(*parts).is_absolute(): raise ValueError('Unsafe archive path')
            if ((item.external_attr>>16)&0o170000)==0o120000: raise ValueError('Symlink in upstream archive')
            target=destination.joinpath(*parts); target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(archive.read(item))

def repository(repo,destination,ref,license_id):
    old=LOCK['repositories'].get(repo)
    sha=old['commit'] if old else json.loads(get('https://api.github.com/repos/'+repo+'/commits/'+ref))['sha']
    archive_path='vendor/archives/'+repo.replace('/','--')+'.zip'
    data=save_download(archive_path,'https://codeload.github.com/'+repo+'/zip/'+sha,license_id)
    extract_zip(data,ROOT/destination)
    LOCK['repositories'][repo]={'commit':sha,'sourceArchive':archive_path,'extractedTo':destination,'license':license_id}
    return sha

def npm_package(name,version):
    archive_path=f'vendor/archives/{name}-{version}.tgz'
    data=save_download(archive_path,f'https://registry.npmjs.org/{name}/-/{name}-{version}.tgz','See package LICENSE')
    dest=ROOT/'vendor/deps'/name
    with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
        for item in archive.getmembers():
            parts=PurePosixPath(item.name).parts[1:]
            if not parts or not item.isfile(): continue
            if '..' in parts: raise ValueError('Unsafe npm archive')
            target=dest.joinpath(*parts); target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(archive.extractfile(item).read())
    metadata=json.loads((dest/'package.json').read_text())
    FILES[archive_path]['license']=metadata.get('license','See LICENSE')

TITLES={
'airFriction':'空气阻力','avalanche':'滚落的积木','ballPool':'小球池','bridge':'吊桥实验','car':'小车过桥','catapult':'跷跷板投石机','chains':'链条','circleStack':'圆球堆叠','cloth':'柔软布料','collisionFiltering':'碰撞分类','compositeManipulation':'组合物体变换','compound':'复合形状','compoundStack':'复合积木堆叠','concave':'凹形积木','constraints':'弹簧与约束','doublePendulum':'双摆','events':'碰撞事件','friction':'摩擦力','gravity':'改变重力','gyro':'陀螺','manipulation':'物体操作','mixed':'形状游乐场','newtonsCradle':'牛顿摆','ragdoll':'布偶','pyramid':'积木金字塔','raycasting':'射线探测','restitution':'弹性与反弹','rounded':'圆角积木','remove':'添加与移除','renderResize':'自适应画布','sensors':'传感器','sleeping':'静止与唤醒','slingshot':'弹弓实验','softBody':'软体结构','sprites':'贴图物体','stack':'积木塔','staticFriction':'静摩擦','stats':'运行统计','stress':'压力测试一','stress2':'压力测试二','stress3':'压力测试三','stress4':'压力测试四','substep':'时间子步','svg':'SVG形状','terrain':'凹形地形','timescale':'时间快慢','views':'移动视野','wreckingBall':'拆除球'}

def inventory():
    repo=ROOT/'vendor/matter'
    index=(repo/'examples/index.js').read_text()
    ids=re.findall(r"\w+\s*:\s*require\(['\"]\./([\w]+)\.js['\"]\)",index)
    assert len(ids)==len(set(ids)) and len(ids)>40,'Incomplete Matter example inventory'
    extra=[]
    for file in sorted((repo/'examples').glob('*.js')):
        if file.stem=='index': continue
        if re.search(r'Example\.\w+\s*=\s*function',file.read_text()) and file.stem not in ids: extra.append(file.stem)
    ids+=extra
    activities=[]
    for sim,title,zone,grades,kind,desc,children in [
      ('area-builder','围栏花园','geometry',[1,2,3,4,5,6],'game','拖动彩色方块，发现面积与周长。',['自由探索','游戏：全部6级与原版随机出题']),
      ('forces-and-motion-basics','搬运挑战','physics',[1,2,3,4,5,6],'simulation','推一推、换个路面，观察力怎样改变运动。',['合力','运动','摩擦力','加速度']),
      ('energy-skate-park-basics','轨道游乐场','physics',[3,4,5,6],'simulation','改变高度和摩擦，观察滑行与能量变化。',['介绍','摩擦力','轨道游乐场']),
      ('vector-addition','箭头导航','vectors',[3,4,5,6],'simulation','组合方向箭头，探索分量与合向量。',['探索一维','探索二维','实验室','方程'])]:
        html=(ROOT/f'vendor/phet/{sim}.html').read_text()
        version=re.search(r'(?:phet\.chipper\.version\s*=\s*[\"\']|"version"\s*:\s*")([^\"\']+)',html)
        activities.append({'id':sim,'title':title,'zone':zone,'grades':grades,'kind':kind,'adapter':'phet','entry':f'vendor/phet/{sim}.html?locale=zh_CN&webgl=false&allowLinks=false','description':desc,'content':children,'license':'CC BY-NC 4.0 (HTML); GPL-3.0 (simulation source)','source':f'https://github.com/phetsims/{sim}','version':version.group(1) if version else 'See embedded About dialog and SHA256 lock','progressMode':'visit-only','completeUpstream':True})
    activities.append({'id':'tangram','title':'七巧板工坊','zone':'geometry','grades':[1,2,3,4,5,6],'kind':'puzzle','adapter':'tangram','entry':'vendor/tangram/index.html','description':'移动和旋转七块拼板，保留原版吸附与轮廓预览。','content':['原仓库1个内置快照','完整拼装与分享快照逻辑；上游更多题目接口未实现'],'license':'GPL-3.0; bundled Three.js MIT','source':'https://github.com/iliagrigorevdev/tangram','progressMode':'visit-only','completeUpstream':True})
    for name in ids:
        text=(repo/f'examples/{name}.js').read_text()
        title=re.search(r"\.title\s*=\s*['\"]([^'\"]+)",text)
        heavy=name.startswith('stress') or name in ['stats','substep','renderResize','events','collisionFiltering','remove','manipulation','compositeManipulation','raycasting','sleeping','sensors','views']
        activities.append({'id':'matter-'+name,'title':TITLES.get(name,title.group(1) if title else name),'zone':'physics','grades':[3,4,5,6] if not heavy else [5,6],'kind':'example','adapter':'matter','entry':f'vendor/matter/demo/mathphysics.html?example={name}','description':('开发参考示例；建议由教师陪同探索。' if heavy else '拖动物体，观察碰撞、运动和结构变化。'),'content':[title.group(1) if title else name],'license':'MIT (code); see bundled asset notices','source':f'https://github.com/liabru/matter-js/blob/0.20.0/examples/{name}.js','progressMode':'visit-only','completeUpstream':True,'teacherRecommended':heavy})
    additions=verified_additions()
    activities+=additions
    all_files={p.relative_to(ROOT).as_posix():{'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())} for p in sorted((ROOT/'vendor').rglob('*')) if p.is_file()}
    output={'schemaVersion':1,'generatedFrom':'Pinned full upstream distribution, not a sampled level list','activities':activities,'counts':{'phetSimulations':4+len(additions),'phetScreens':13+sum(item['screenCount'] for item in additions),'areaBuilderDifficultyLevels':6,'tangramBuiltInSnapshots':1,'matterExamples':len(ids),'launchableActivities':len(activities)},'excluded':[{'repository':'DennisWeiss/linear-transform-visualizer','reason':'No explicit repository license found; source not copied.'},{'repository':'phaserjs/phaser','reason':'Framework only, not a curriculum. Not needed for first-version integration.'},{'repository':'jsxgraph/jsxgraph','reason':'Optional drawing framework; not a selected set of game levels.'}],'files':all_files}
    (ROOT/'config/inventory.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print('INVENTORY',json.dumps(output['counts']),flush=True)
    return output

def main():
    (ROOT/'config').mkdir(exist_ok=True);(ROOT/'docs').mkdir(exist_ok=True)
    repository('liabru/matter-js','vendor/matter','0.20.0','MIT')
    repository('iliagrigorevdev/tangram','vendor/tangram','master','GPL-3.0')
    for sim in SIMS:
        repository('phetsims/'+sim,'vendor/sources/'+sim,'main','GPL-3.0')
        url=f'https://phet.colorado.edu/sims/html/{sim}/latest/{sim}_zh_CN.html'
        data=save_download(f'vendor/phet/{sim}.html',url,'CC BY-NC 4.0 (official current distribution policy; preserve embedded notices)')
        text=data.decode('utf-8')
        if len(data)<100000 or 'phet' not in text.lower() or '<html' not in text.lower(): raise ValueError('Not a complete simulation: '+sim)
    for name,ver in [('poly-decomp','0.3.0'),('matter-wrap','0.2.0'),('pathseg','1.2.1')]: npm_package(name,ver)
    # Retain the pinned compatibility entry; the product now resolves to src/adapters/matter.html.
    # Never import the evolving presentation page into the fixed vendor inventory.
    template=ROOT/'scripts/fixtures/matter-legacy.html'
    compatibility=ROOT/'vendor/matter/demo/mathphysics.html'
    previous=ROOT/'config/inventory.json'
    if previous.exists():
        expected=json.loads(previous.read_text(encoding='utf-8'))['files'].get('vendor/matter/demo/mathphysics.html',{}).get('sha256')
        if expected and digest(template.read_bytes())!=expected:raise ValueError('Pinned Matter compatibility entry changed')
    shutil.copyfile(template,compatibility)
    LOCK_PATH.write_text(json.dumps(LOCK,ensure_ascii=False,indent=2)+'\n')
    output=inventory()
    lines=['# 全量整合清单','', '本文件由导入脚本生成。上游版本及全部文件SHA256见 config/upstream-lock.json 与 config/inventory.json。','', '保留全部已选内容，并不等于执行所有内容：只在进入活动时创建一个运行实例。','', '## 范围','', json.dumps(output['counts'],ensure_ascii=False), '', '## 重要边界','', '- Area Builder 保留全部6个难度等级和完整随机题目生成器；随机题库不是固定有限题目清单。','- PhET 其余项目是多页面实验，不虚构成关卡。全部原始导航保留。','- Tangram 的仓库只有1个内置快照；更多图形服务及上一题/下一题函数在上游未完成，不声称已获得不存在的服务器题库。','- Matter.js 保留完整仓库、全部注册示例和资源；其中性能压力测试默认关闭，但未删除。','- 无许可证的 linear-transform-visualizer 未复制；向量主题由完整 PhET Vector Addition 承担。','- Phaser、JSXGraph 是备选基础库，不是课程关卡库，本版未引入。','- 官方PhET HTML按当前CC BY-NC 4.0政策保守处理；源码快照单独保留其GPL许可证，源码快照不声称是官方成品的完整可复现构建依赖。','', '## 已整合活动','']
    lines += ['- '+a['id']+' / '+a['title']+' / '+a['entry'] for a in output['activities']]
    (ROOT/'docs/import-report.md').write_text('\n'.join(lines)+'\n')

if __name__=='__main__': main()
