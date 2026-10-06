#!/usr/bin/env python3
"""Reproducible presentation-only derivatives of the pinned, untouched PhET distributions.

All changes are allowlisted image expressions, presentation literals or the local view hook.
The exact ordered edit ledger allows tests to reverse every edit and recover upstream bytes.
No calculations, challenge generators, state machines or scientific constants are rewritten.
The legacy area model constructs display buckets; only their explicit fill color changes.
"""
import base64, hashlib, json, re
from pathlib import Path
from phet_registry import register_expansion
from phet_expansion_art import apply_art
from phet_workbench_theme import apply_workbench_theme

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'src/phet/assets'
OUTPUT=ROOT/'src/phet/generated'
SIMS=('forces-and-motion-basics','energy-skate-park-basics','area-builder','vector-addition')

EXPANSIONS=('fractions-intro','fraction-matcher','balancing-act',
            'circuit-construction-kit-dc','states-of-matter-basics','build-a-molecule')
def sha(data):return hashlib.sha256(data).hexdigest()

def build(sim):
    source=(ROOT/f'vendor/phet/{sim}.html').read_bytes()
    expected=json.loads((ROOT/'config/inventory.json').read_text(encoding='utf8'))['files'][f'vendor/phet/{sim}.html']['sha256']
    if sha(source)!=expected:raise ValueError(f'{sim}: upstream hash changed; review the display patch before rebuilding')
    text=source.decode('utf8');edits=[]
    def patch(old,new,expected_count=None,kind='presentation'):
        nonlocal text
        count=text.count(old)
        if not count or expected_count is not None and count!=expected_count:
            raise ValueError(f'{sim}: patch count {count}, expected {expected_count}: {old[:120]}')
        # Store offsets into the previous state; reversing offsets in reverse edit order is exact.
        positions=[m.start() for m in re.finditer(re.escape(old),text)]
        edits.append({'kind':kind,'old':old,'new':new,'positions':positions})
        text=text.replace(old,new)
    def image(variable,file):
        pattern=re.escape(variable)+r'''\.src=("data:image/[^"\n]*"(?:\+(?:encodeURIComponent|btoa)\('(?:[^'\\]|\\.)*'\))?)'''
        matches=list(re.finditer(pattern,text))
        if len(matches)!=1:raise ValueError(f'{sim}: image {variable}: {len(matches)} matches')
        data=(ASSETS/file).read_bytes()
        patch(matches[0].group(1),'"data:image/png;base64,'+base64.b64encode(data).decode()+'"',1,'image')
    def png_asset(original,replacement):
        old='data:image/png;base64,'+base64.b64encode((ROOT/'vendor/sources'/sim/'images'/original).read_bytes()).decode()
        new='data:image/png;base64,'+base64.b64encode((ASSETS/'sprites'/replacement).read_bytes()).decode()
        patch(old,new,1,'image')

    if sim in ('area-builder','fractions-intro','fraction-matcher'):
        # These old SceneryStyle modules append an inline style in HEAD, then
        # take the last sheet in the document. A theme LINK later in BODY can
        # be last instead, and file:// correctly forbids CSSOM writes to it.
        # Bind rules to the style element they actually created; no model or
        # browser security settings change. The exact edit is reversible.
        patch('var n=document.styleSheets[document.styleSheets.length-1]',
              'var n=i.sheet',1,'view-layout')

    if sim=='forces-and-motion-basics':
        # Locate the byte-identical upstream character images, independent of minifier variable names.
        for asset in sorted((ROOT/'vendor/sources/forces-and-motion-basics/images/pushPullFigures').glob('*.png'),key=lambda path:path.name):
            if asset.name.startswith('pusher_'):
                stem=asset.stem.removeprefix('pusher_')
                new='pusher-standing.png' if stem=='straight_on' else 'pusher-fallen.png' if stem=='fall_down' else f'pusher-{stem}.png'
            elif asset.name.startswith('pull_'):new=asset.name
            else:continue
            old='data:image/png;base64,'+base64.b64encode(asset.read_bytes()).decode()
            replacement='data:image/png;base64,'+base64.b64encode((ASSETS/'sprites'/new).read_bytes()).decode()
            patch(old,replacement,1,'image')
        image('mL','sprites/meadow.png')
        for original,replacement in [('tugIconBlueRed.png','icon-tug.png'),('tugIconPurpleOrange.png','icon-tug.png'),('usa/usaMotionIcon.png','icon-motion.png'),('frictionIcon.png','icon-friction.png'),('accelerationIcon.png','icon-acceleration.png')]:png_asset(original,replacement)
        patch('this.baseColor=e?"#ff5500":"#94b830"','this.baseColor=e?"#efbb5b":"#b3d39c"',1)
        for person in ('Girl','Man'):
            for pose in ('Standing','Sitting','Holding'):
                name=person+pose
                module=(ROOT/f'vendor/sources/forces-and-motion-basics/images/usa/usa{name}_svg.ts').read_text(encoding='utf8')
                svg=re.search(r"btoa\('(.*?)'\)",module,re.S).group(1)
                expression='"data:image/svg+xml;base64,"+btoa(\''+svg+'\')'
                png=base64.b64encode((ASSETS/f'sprites/item-{name}.png').read_bytes()).decode()
                patch(expression,'"data:image/png;base64,'+png+'"',1,'image')
        anchors=json.loads((ASSETS/'puller-anchors.json').read_text())
        anchor_json=json.dumps(anchors,separators=(',',':'))
        patch('this.image=l?this.pullImage:this.standImage;',
              'this.image=l?this.pullImage:this.standImage;this.setScaleMagnitude(i.isHome()||i.isPointerGrabbed()||i.isKeyboardGrabbedOverHome()?{large:.62,medium:.55,small:.78}[t.size]:.86);',1,'view-layout')
        patch('this.setTranslation(t.positionProperty.initialValue);else if(i.isPointerGrabbed())',
              'this.setTranslation(t.positionProperty.initialValue.x,594-this.height);else if(i.isPointerGrabbed())',1,'view-layout')
        patch('if(i.isKeyboardGrabbedOverHome())this.setTranslation(t.positionProperty.initialValue.plusXY(0,-20))',
              'if(i.isKeyboardGrabbedOverHome())this.setTranslation(t.positionProperty.initialValue.x,574-this.height)',1,'view-layout')
        patch('const s="blue"===this.puller.type?-50:0;this.setTranslation(e.positionProperty.value+t+s,e.y-this.height+90-i)',
              'const s='+anchor_json+';const k=this.puller.type+"-"+this.puller.size+"-"+(this.image===this.pullImage?"pull":"stand");this.setTranslation(e.positionProperty.value-.86*s[k],e.y-this.height+90-i)',1,'view-layout')
        patch('stopwatch)(en\\\\Stopwatch*','stopwatch)(en\\\\Stopwatch(zh`_CN\\\\秒表*',1,'translation')
        patch('(zh`_CN\\\\{0} Newtons','(zh`_CN\\\\{0} 牛顿',1,'translation')
        patch('"#02ace4"','"#e8f2e9"',2)
        patch('"#cfecfc"','"#f5f3e9"',2)
        patch('"#c59a5b"','"#e7ddbf"',2)
        patch('fill:"#e3e980"','fill:"#fffdf4",stroke:"#a6b89b",cornerRadius:14',2)
        patch('"#e7e8e9"','"#fffdf4"')
        # Two raster meadow accents are part of the scene graph, behind the rope and characters.
        patch('this.addChild(new Th(jq,{x:13,y:368}))','this.addChild(new Th(yL,{x:20,y:310,scale:1,pickable:!1})),this.addChild(new Th(yL,{x:i-300,y:324,scale:.78,pickable:!1})),this.addChild(new Th(jq,{x:13,y:368}))',1)
        patch('tw=Rn.BLACK','tw=new Rn("#315d4b")',1)
    elif sim=='energy-skate-park-basics':
        # The USA set is the distribution default. Six choices, both directions and portraits stay intact.
        # Regional/animal portrayals remain available in Preferences, without changing their meanings.
        variables=[('aF','hF','uF'),('wF','PF','GF'),('bF','xF','IF'),('TF','HF','RF'),('UF','JF','WF'),('$F','Aq','rq')]
        for n,(head,left,right) in enumerate(variables,1):
            for variable,part in [(head,'head'),(left,'left'),(right,'right')]:image(variable,f'sprites/skater-{n}-{part}.png')
        image('ST','sprites/meadow.png')
        for n,name in enumerate(('intro','friction','playground'),1):png_asset(name+'ScreenIcon.png',f'icon-skate-{n}.png')
        patch('"#02ace4"','"#e8f2e9"',1)
        patch('"#cfecfc"','"#f5f3e9"',1)
        patch('fill:"#93774c"','fill:"#e7ddbf"',1)
        patch('"panelFill",{default:"#F0F0F0"}','"panelFill",{default:"#fffdf4"}',1)
        patch('"panelStroke",{default:"#ababab"}','"panelStroke",{default:"#a6b89b"}',1)
        patch('const Ag={cornerRadius:5,','const Ag={cornerRadius:12,',1)
        patch('ig.PANEL_CORNER_RADIUS=5','ig.PANEL_CORNER_RADIUS=12',1)
        patch('xb=_A.BLACK','xb=new _A("#315d4b")',1)
    elif sim=='area-builder':
        patch('BACKGROUND_COLOR:"rgb( 225, 255, 255 )"','BACKGROUND_COLOR:"#edf2e6"',1)
        patch('CONTROL_PANEL_BACKGROUND_COLOR:"rgb( 254, 241, 233 )"','CONTROL_PANEL_BACKGROUND_COLOR:"#fffdf4"',1)
        for old,new in [('#33E16E','#70ad82'),('#1A7137','#315d4b'),('#9D87C9','#b4a2cf'),('#FFA64D','#efb553'),('#5DB9E7','#83b3c8'),('#E88DC9','#dd91a0')]:patch('"'+old+'"','"'+new+'"')
        patch('family:"Arial"','family:"Microsoft YaHei, Arial"',2)
        patch('baseColor:"#000080"','baseColor:"#315d4b"',3)
        patch('backgroundColor:"black"','backgroundColor:"#315d4b"',2)
        patch('return e?"white":"black"','return e?"white":"#315d4b"',1)
        patch('return"black"===t?"white":"black"','return"#315d4b"===t?"#fffdf4":"#263d33"',1)
    elif sim=='vector-addition':
        patch('"screenBackgroundColor",{default:"#e5f7fe"}','"screenBackgroundColor",{default:"#edf2e6"}',1)
        patch('"panelFill",{default:Jo.grayColor(240)}','"panelFill",{default:"#fffdf4"}',1)
        patch('"panelStroke",{default:Jo.grayColor(139)}','"panelStroke",{default:"#a6b89b"}',1)
        patch('GO.PANEL_OPTIONS={cornerRadius:5,','GO.PANEL_OPTIONS={cornerRadius:12,',1)
        patch('sS=Jo.BLACK','sS=new Jo("#315d4b")',1)

    elif sim in EXPANSIONS:
        theme_expansion(sim, text, patch)
        expansion_hook=apply_art(sim, source.decode('utf8'), patch)

    if sim in ('vector-addition','states-of-matter-basics','build-a-molecule'):
        apply_workbench_theme(sim, text, patch)

    if sim not in EXPANSIONS and sim!='area-builder':
        color={'forces-and-motion-basics':'Rn','energy-skate-park-basics':'_A','vector-addition':'Jo'}[sim]
        patch(f'e=>e?{color}.WHITE:{color}.BLACK',f'e=>new {color}("#315d4b")',1)
        patch(f'e=>e.equals({color}.BLACK)?{color}.WHITE:{color}.BLACK',f'e=>new {color}("#fffdf4")',2)
        # Upstream chrome tests strictly for black to choose white icons/text. Forest green is dark too.
        for old in sorted(set(re.findall(r'[\w$]+\.equals\('+re.escape(color)+r'\.BLACK\)',text))):
            receiver=old.split('.')[0]
            patch(old,f'({old}||{receiver}.equals(new {color}("#315d4b")))')
        patch('fontFamily:{type:"string",defaultValue:"Arial"}','fontFamily:{type:"string",defaultValue:"Microsoft YaHei, Arial"}',1)
        # Flatten button rendering while leaving its hit regions, focus, keyboard and listeners intact.
        for old in sorted(set(re.findall(r'buttonAppearanceStrategy:[\w$]+\.ThreeDAppearanceStrategy',text))):
            patch(old,old.replace('ThreeD','Flat'))
    color={'forces-and-motion-basics':'Rn','energy-skate-park-basics':'_A','area-builder':'e','vector-addition':'Jo',
           'fractions-intro':'t','fraction-matcher':'e','balancing-act':'F.Ilk',
           'circuit-construction-kit-dc':'ma','states-of-matter-basics':'ol','build-a-molecule':'to'}[sim]
    patch(f'RESET_ALL_BUTTON_BASE_COLOR:new {color}(247,151,34)',f'RESET_ALL_BUTTON_BASE_COLOR:new {color}(219,155,61)',1)
    hook='\n<!-- Science Island display adaptation; upstream credits and all simulation logic retained. -->\n<link rel="stylesheet" href="../../theme.css">\n<script src="../../sync-client.js" defer></script><script src="../../sync-ui.js" defer></script><script src="../sync.js" defer></script>\n<script src="../view.js" defer></script>\n'
    if sim in EXPANSIONS:
        hook+=expansion_hook
    if sim in ('vector-addition','states-of-matter-basics','build-a-molecule'):
        revision=sha((ROOT/'src/phet/workbench.js').read_bytes()+(ROOT/'src/phet/workbench.css').read_bytes())[:12]
        hook += f'<script src="../workbench.js?v={revision}" defer></script>\n'
    if sim=='area-builder':
        hook += '<script src="../../progress.js" defer></script>\n<script src="../progress.js" defer></script>\n'
    ending=text[text.rfind('</body>'):]
    patch(ending,hook+ending,1,'view-hook')
    OUTPUT.mkdir(parents=True,exist_ok=True)
    (OUTPUT/f'{sim}.html').write_bytes(text.encode('utf8'))
    return {'sim':sim,'upstreamSHA256':sha(source),'outputSHA256':sha(text.encode('utf8')),'edits':edits}


def theme_expansion(sim, text, patch):
    """Only display literals and view defaults; semantic scientific colors stay intact."""
    if sim in ('fractions-intro','fraction-matcher'):
        color='t' if sim=='fractions-intro' else 'e'
        patch(f'introScreenBackground:{{default:{color}.WHITE}}',
              f'introScreenBackground:{{default:new {color}("#edf2e6")}}',1)
        patch(f'otherScreenBackground:{{default:new {color}(235,251,251)}}',
              f'otherScreenBackground:{{default:new {color}("#edf2e6")}}',1)
        patch(f'introPanelBackground:{{default:new {color}(237,237,237)}}',
              f'introPanelBackground:{{default:new {color}("#fffdf4")}}',1)
        patch(f'introBucketBackground:{{default:new {color}("#8eb7f2")}}',
              f'introBucketBackground:{{default:new {color}("#e7eddf")}}',1)
        if sim=='fraction-matcher':
            patch('backgroundColorProperty:new l("white")',
                  'backgroundColorProperty:new l("#edf2e6")',1)
        else:
            # Scope this missing translation to the Simplified Chinese game entry.
            old='"VEGAS/chooseYourLevel":"\u202aChoose Your Level!\u202c","FRACTIONS_INTRO/screen.game":"\u202a游戏\u202c"'
            patch(old,old.replace('Choose Your Level!','选择一个挑战！'),1,'translation')
        home='a' if sim=='fractions-intro' else 'o'
        patch(f'{home}="black";return r.register("HomeScreen"',
              f'{home}="#315d4b";return r.register("HomeScreen"',1)
    elif sim=='balancing-act':
        patch('topColor:new F.Ilk(1,172,228),bottomColor:new F.Ilk(208,236,251)',
              'topColor:new F.Ilk("#e8f2e9"),bottomColor:new F.Ilk("#f5f3e9")',1)
        patch('topColor:new F.Ilk(144,199,86),bottomColor:new F.Ilk(103,162,87)',
              'topColor:new F.Ilk("#b0c3a2"),bottomColor:new F.Ilk("#789b7c")',1)
        patch('_r=F.Ilk.BLACK;class Or', '_r=new F.Ilk("#315d4b");class Or',1)
    elif sim=='circuit-construction-kit-dc':
        for name,old,new in [('screenBackgroundColor','#99c1ff','#edf2e6'),
                             ('panelFill','#f1f1f2','#fffdf4'),
                             ('panelStroke','black','#a6b89b')]:
            patch(f'"{name}",{{default:"{old}"}}',f'"{name}",{{default:"{new}"}}',1)
        patch('H.CORNER_RADIUS=6','H.CORNER_RADIUS=12',1)
        patch('uC=ma.BLACK;let dC','uC=new ma("#315d4b");let dC',1)
    elif sim=='states-of-matter-basics':
        for name,old,new in [('background','black','#edf2e6'),
                             ('controlPanelBackground','black','#fffdf4'),
                             ('controlPanelStroke','white','#a6b89b'),
                             ('navigationBarIconBackground','black','#edf2e6'),
                             ('particleStroke','white','#263d33')]:
            patch(f'{name}:{{default:"{old}",projector:',
                  f'{name}:{{default:"{new}",projector:',1)
        for name in ['controlPanelText','ljGraphAxesAndGridColor']:
            patch(f'{name}:{{default:$b,projector:',f'{name}:{{default:"#263d33",projector:',1)
        patch('Up.BACKGROUND_COLOR="black"','Up.BACKGROUND_COLOR="#315d4b"',1)
        patch('backgroundColorProperty:new Dt("black"),name:Qp',
              'backgroundColorProperty:new Dt("#315d4b"),name:Qp',1)
        # Retain species/element main colors and radii; flatten only the view's material shading.
        patch('e.fill=new ZE(r,s,0,r,s,t).addColorStop(0,e.highlightColor).addColorStop(e.highlightDiameter/t,e.mainColor).addColorStop(1,e.shadowColor),fv.call(this,i,e)',
              'e.fill=e.mainColor,fv.call(this,i,e)',1)
    elif sim=='build-a-molecule':
        for name,old,new in [('PLAY_AREA_BACKGROUND_COLOR','new to(198,226,246)','new to("#edf2e6")'),
                             ('MOLECULE_COLLECTION_BACKGROUND','new to(238,238,238)','new to("#fffdf4")'),
                             ('KIT_BACKGROUND','to.WHITE','new to("#fffdf4")'),
                             ('KIT_BORDER','to.BLACK','new to("#a6b89b")'),
                             ('COMPLETE_BACKGROUND_COLOR','new to(238,238,238)','new to("#faf0d5")')]:
            patch(f'{name}:{old}',f'{name}:{new}',1)
        patch('CORNER_RADIUS:4,PLAY_AREA_BACKGROUND_COLOR:',
              'CORNER_RADIUS:12,PLAY_AREA_BACKGROUND_COLOR:',1)
        patch('Cd.BACKGROUND_COLOR="black"','Cd.BACKGROUND_COLOR="#315d4b"',1)
        patch('backgroundColorProperty:new SH("black"),name:Hd',
              'backgroundColorProperty:new SH("#315d4b"),name:Hd',1)
        patch('C.fill=new Of(i,N,0,i,N,H).addColorStop(0,C.highlightColor).addColorStop(C.highlightDiameter/H,C.mainColor).addColorStop(1,C.shadowColor),gp.call(this,e,C)',
              'C.fill=C.mainColor,gp.call(this,e,C)',1)
        patch('this.addChild(new Lo(N,{fill:O})),this.labelNode=e.labelNode',
              'this.addChild(new Lo(N,{fill:"#e7eddf"})),this.labelNode=e.labelNode',1)
        patch('N.addColorStop(0,"black"),N.addColorStop(1,"#c0c0c0"),this.addChild(new Lo(i,{fill:N,stroke:"#777",lineWidth:1}))',
              'N.addColorStop(0,"#789b7c"),N.addColorStop(1,"#d6e4c7"),this.addChild(new Lo(i,{fill:N,stroke:"#789b7c",lineWidth:1}))',1)

    # Legacy releases use string fills; current releases use Color objects.
    if sim in ('balancing-act','circuit-construction-kit-dc'):
        color='F.Ilk' if sim=='balancing-act' else 'ma'
        arg='t' if sim=='balancing-act' else 'e'
        patch(f'{arg}=>{arg}?{color}.WHITE:{color}.BLACK',
              f'{arg}=>new {color}("#315d4b")',1)
        patch(f'{arg}=>{arg}.equals({color}.BLACK)?{color}.WHITE:{color}.BLACK',
              f'{arg}=>new {color}("#fffdf4")',2)
        patch('fontFamily:{type:"string",defaultValue:"Arial"}',
              'fontFamily:{type:"string",defaultValue:"Microsoft YaHei, Arial"}',1)
    else:
        arg='e' if sim=='fractions-intro' else 'H' if sim=='build-a-molecule' else 't'
        patch(f'return {arg}?"white":"black"','return"#315d4b"',1)
        patch(f'return"black"==={arg}?"white":"black"','return"#fffdf4"',1)
        patch('family:"Arial"','family:"Microsoft YaHei, Arial"',1)
        color='i' if sim in ('fractions-intro','fraction-matcher') else 'ol' if sim=='states-of-matter-basics' else 'to'
    # Keep light menu/icons on the new dark navigation, including old HomeScreen logic.
    for old in sorted(set(re.findall(r'[\w$]+\.equals\('+re.escape(color)+r'\.BLACK\)',text))):
        receiver=old.split('.')[0]
        patch(old,f'({old}||{receiver}.equals(new {color}("#315d4b")))')
    if sim in ('fractions-intro','fraction-matcher'):
        # Legacy menu/logo logic compares raw string colors, separately from LookAndFeel.
        for old in sorted(set(re.findall(r'"black"===[\w$]+',text))):
            receiver=old.split('===')[1]
            patch(old,f'({old}||"#315d4b"==={receiver})')
    if sim not in ('balancing-act','circuit-construction-kit-dc'):
        for old in sorted(set(re.findall(r'"black"!==[\w$]+',text))):
            receiver=old.split('!==')[1]
            patch(old,f'({old}&&"#315d4b"!=={receiver})')
    # Inactive home-screen labels remain selectable; keep them legible on forest green.
    patch('?"white":"gray"','?"white":"#d8e2cd"',1)
    for old in sorted(set(re.findall(r'buttonAppearanceStrategy:[\w$]+\.ThreeDAppearanceStrategy',text))):
        patch(old,old.replace('ThreeD','Flat'))
    # The published files include an external Cloudflare beacon; it is not part of the sim.
    for beacon in re.findall(r'<script\b[^>]*\bsrc="https://static\.cloudflareinsights\.com/[^>]*>\s*</script>',text):
        patch(beacon,'',1,'view-hook')

if __name__=='__main__':
    additions=register_expansion()
    if tuple(item['id'] for item in additions)!=EXPANSIONS:
        raise ValueError('PhET expansion manifest must match the reviewed display patches')
    results=[build(sim) for sim in SIMS+EXPANSIONS]
    (OUTPUT/'edit-ledger.json').write_text(json.dumps({'schemaVersion':1,'simulations':results},ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(json.dumps({r['sim']:len(r['edits']) for r in results},indent=2))
