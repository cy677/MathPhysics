/* Original teaching text for the retained PhET screens and legacy Tangram.
 * Classic-script compatible so generated offline HTML can load it without modules.
 * Scientific models, state machines, and vendor distributions stay untouched. */
(() => {
  'use strict';
  const g=(id,title,observe,operate,why,example,principle)=>({id,title,observe,operate,why,example,principle,
    steps:[{id:'predict',title:'先预测',text:observe},{id:'operate',title:'再操作',text:operate},{id:'explain',title:'说说发现',text:'对照预测，说清你改了哪个条件、看见什么变化，再用下面的原理解释：'+why}]});
  const screen=(id,title,observe,operate,why,example,principle)=>g(id,title,observe,operate,why,example,principle);
  const PHET_GUIDES={
    'forces-and-motion-basics':g('phet-forces-and-motion-basics','力与运动','推得更用力，小车就一定立刻向推的方向走吗？先比较力箭头、速度与位置。','选择合力、运动、摩擦力或加速度。一次只改推力、质量或摩擦中的一个条件，比较同样时间内的运动。','力会改变物体的速度；速度告诉我们当前怎样运动。它们可以暂时方向不同。','向前滑的购物车，被向后的推力作用后会先减速。','高年级用合力与a=F合/m分析速度的变化。模型的路面、人物和数值是教学表示，不是日常推车的精确测量。'),
    'energy-skate-park-basics':g('phet-energy-skate-park-basics','滑行与能量','小伙伴从高处出发，在哪里最快？先比较高度与能量图。','把小伙伴拖到轨道高处放开，打开能量图。比较介绍、摩擦力和轨道游乐场；暂停或单步看最低处。','下行时，高度减少，运动通常更快；摩擦会把部分机械能转为热能。','滑梯、过山车和荡秋千都能帮助我们观察高度与速度的关系。','理想无摩擦时，动能与重力势能之和保持不变；有摩擦时要把热能计入总能量。轨道固定且模型忽略空气等现实因素。'),
    'area-builder':g('phet-area-builder','面积与周长','用同样数量的小方格换一种排法，面积与周长都会不变吗？','先在探索页拼图，打开面积和周长读数。摆出两种形状后，再到游戏页选难度按题目要求拼。','面积数图形盖住几格，周长数外边界的长度；共用的内部边不计入周长。','用同样多的地砖铺地，形状不同，需要的外圈围栏可能不同。','高年级可用S=ab、P=2(a+b)核算长方形，并检查凹形边界。有限个例说明现象，概括规律还需要解释内部共用边。'),
    'vector-addition':g('phet-vector-addition','方向箭头相加','先向右走再向上走，与直接朝终点走的箭头有何关系？','从工具箱拖出箭头，改变方向和长度，打开合向量或分量。切换一维、二维、实验室与公式页面。','箭头记录方向和距离；把箭头首尾接起来，就能找到最后的终点。','导航“向东走3步再向北走2步”可用两个箭头表示。','高年级按横、纵分量分别相加；箭头平移不改变向量。箭头表示位移时才使用距离单位，不把所有箭头都叫力。'),
    'fractions-intro':g('phet-fractions-intro','把整体分成相等份','同一块饼分成更多份，每一份会变大还是变小？','在介绍页调分母和分子，比较圆、长条与数轴；再到游戏或实验室，用不同表示拼同一个分数。','分母告诉我们整体等分几份，分子告诉我们取了几份；比较前先确认整体一样大。','把同样大小的披萨分成4份或8份，单份大小不同。','a/b表示a个1/b。等值分数同时扩大或缩小分子、分母；分母不为0，不能仅根据彩色块数比较大小。'),
    'fraction-matcher':g('phet-fraction-matcher','分数配对','数字写法不同、彩色图块不同，会不会表示同样的数？','选择分数或带分数，选一关，把两张认为等值的卡片放到两边，再点检查。比较图形表示和数字。','卡片是否配对取决于表示的量相同，而不只看图形样子。','半杯果汁可以写成1/2杯，也可写成2/4杯。','比较分数可通分或交叉相乘；带分数需先理解整数部分加分数部分。图形必须以相同整体单位解释。'),
    'balancing-act':g('phet-balancing-act','跷跷板平衡','较重的人一定在下面吗？坐的位置远近也要看吗？','把重物拖到横杆两边，先猜哪边下沉，再移走支撑。改变一个质量或距离，尝试找平衡；也可到游戏页挑战。','重物越远离支点，越容易让那一边转下去；重量与距离一起影响平衡。','跷跷板上，较轻的人坐远些也可能与较重的人平衡。','高年级用力矩F×垂直力臂；在此水平横杆与竖直重力条件下，两边m×距离相等可平衡。支撑还在时不能据横杆水平判断平衡。'),
    'circuit-construction-kit-dc':g('phet-circuit-construction-kit-dc','接出完整电路','只把电池的一端接到灯泡，灯会亮吗？','从工具箱拖出电池、灯泡和导线，连接成闭合的一圈。加开关观察通断；选择元件可改参数或测电流、电压。','电流需要完整回路，电池提供能量，灯泡把电能转成光和热。','手电筒的开关闭合后，电池、灯泡之间的回路接通。','高年级区分电流与电压，理想欧姆元件I=V/R；电子移动方向与约定电流方向不同。不能用仿真去猜真实电源接线安全。'),
    'states-of-matter-basics':g('phet-states-of-matter-basics','粒子的冷热变化','固体中的小粒子完全不动吗？加热后粒子的运动和排列会怎样？','选同一种物质，比较固体、液体、气体的粒子排列。拖加热或冷却滑块；到相变页还可改变盖子和粒子数量。','粒子一直在运动。温度变化会改变它们运动的快慢与聚集状态。','冰融成水，水再变成水蒸气，是同一种物质不同状态的例子。','温度与粒子的平均平动动能相关；不同物质的粒子作用与相变温度不同。二维粒子画面是示意，不能把粒子画面距离直接当作现实尺寸。'),
    'build-a-molecule':g('phet-build-a-molecule','原子组成分子','两个氢原子和一个氧原子靠在一起，能搭出什么分子？','把原子从桶中拖出，靠近组成分子；核对名称与化学式，再放入对应收集框。切到多个分子或自由探索换一组原子。','分子由一定种类和数量的原子连接组成；同一分子的原子数不是随意的。','水分子H₂O含两个氢原子与一个氧原子。','高年级读化学式下标与原子计数，区分分子个数和每个分子中原子数。模型按预设规则连接，不模拟真实反应能量与条件。')
  };
  const SCREENS={
    'forces-and-motion-basics':[
      screen('net-force','合力','两边人数相同，就一定平衡吗？看每个人的拉力和合力箭头。','把不同大小的人放到绳两边，再点开始。保持一边不变，只换另一边一个人。','两边拉力大小相同、方向相反时合力为0；比较的是拉力，不是人数。','拔河时人数相同，两队拉力也可能不同。','合力按方向带正负相加。合力为0不等于所有情况下速度为0，此页起始静止时可保持不动。'),
      screen('motion','运动','同样推力下，载物更多的小车会更快变速吗？','把箱子或人物放到车上，调推力，开启速度读数。重置后换质量，用同样推力比较。','同样合力作用下，质量较大的车改变速度更慢。','空购物车通常比装满货物的购物车更容易加速。','用a=F合/m解释；当前速度和加速度是不同量，不把质量改变等同于速度立即改变。'),
      screen('friction','摩擦力','手松开后，小车会一直一样快吗？','给箱子一个推力使它运动，再把推力归零。比较不同摩擦设置下的停止过程。','摩擦方向会阻碍接触面的相对滑动，让运动变慢。','滑行的鞋在粗糙地面比光滑地面更快停下。','静摩擦与滑动摩擦不能混同；摩擦大小由模型规则决定，停止后的静止并不表示此前没有运动。'),
      screen('acceleration','加速度','正在向右运动的箱子受到向左合力，会立即向左运动吗？','开速度、加速度与力箭头。先向右推动，再改成向左推，观察速度减少、停止和反向。','加速度描述速度怎样改变，不是当前速度的方向。','骑车刹车时，车仍向前走一段，速度却越来越小。','a与F合同向；v可以和a反向。对相同质量，一次只改合力比较加速度。')
    ],
    'energy-skate-park-basics':[
      screen('intro','介绍','轨道最低处与最高处，哪一种能量更多？','把小伙伴放到同一轨道不同高度，打开能量柱或饼图，暂停比较最高、最低位置。','高度减少时，重力势能转为动能；最高位置不一定在运动全过程中都静止。','秋千经过最低点时通常最快。','无摩擦条件下K+U保持不变，势能参考零点可选。不要把“高度为0”说成没有任何能量。'),
      screen('friction','摩擦力','加了摩擦后，第二次还能升到原来的高度吗？','保持初始位置不变，比较较小、较大摩擦；打开热能，走完一次往返。','机械能的一部分转为热能，后续上升高度通常降低。','滑板滑行会因接触摩擦逐渐慢下来。','含热能的总能量与只有K+U的机械能要区分；热能增加不意味着能量消失。'),
      screen('playground','轨道游乐场','自己搭的弯道会把小伙伴送到哪里？','拖入轨道片，接好再调整弯曲。先预测最高、最低点与可能离轨处，再从固定位置释放。','轨道改变路径，高度与摩擦影响速度；接触条件也决定能否留在轨道上。','过山车轨道的弯曲、高低与速度相互关联。','固定轨道的支持力可改变运动方向；仿真轨道不是游乐设施设计依据。比较必须固定初始位置与摩擦。')
    ],
    'area-builder':[
      screen('explore','探索','六块方格排成2×3或1×6，周长一样吗？','用六个单位方块拼两种长方形，读面积和周长；沿外圈一条边一条边数。','面积都是6格，外边界长可不同；内部共用边不属于外圈。','同面积菜地采用细长形或较方正形，需要的围栏不同。','2×3的周长10，1×6的周长14。这里单位小格边长1，面积单位和长度单位不同。'),
      screen('game','游戏','本关需要满足面积、周长，还是颜色分数？先读完整目标。','选择难度，先找面积要求，再看周长或颜色比例。用方格拼图，检查后按提示只改未满足的条件。','同一个图形可能需同时满足多个条件，面积正确不代表周长或颜色比例也正确。','设计花坛时面积、边界和不同花色占比都可能有限制。','六种难度由原模型随机出题；具体数值以当前目标为准。颜色比例以图形整体面积为分母。')
    ],
    'vector-addition':[
      screen('explore-1d','探索一维','向右5格再向左2格，终点在原点哪一边？','拖出水平箭头，设一正一负，打开合向量和数值；再交换先后。','相反方向会互相抵消一部分，最后终点看带方向的总和。','直路上先前进再后退，路程与最终离起点的距离不同。','一维向量按正负相加；+5+(-2)=+3，走过的路程为7，位移为+3。'),
      screen('explore-2d','探索二维','横向和纵向箭头接起来，合箭头是否从起点直指终点？','拖出两箭头，首尾相接，打开分量与合向量；固定第一支，改变第二支。','横向、纵向分别累加，终点由两个方向一起确定。','在方格街区走不同路线，可到同一个目的地。','分量和(ax+bx,ay+by)；不能直接把两个箭头长度相加当作合向量长度。'),
      screen('lab','实验室','两组颜色不同的箭头都能得到同样的合箭头吗？','用两个向量组，分别摆出不同箭头组合，显示各组合向量和分量，比较终点。','组合方式可不同，只要各方向总量相同，就能有相同合向量。','送快递选择不同街道，最终位移仍可一样。','向量加法满足交换律、结合律；这些规律比较的是位移向量，不能由此说所有路线用时一样。'),
      screen('equations','公式','改变箭头前的倍数，方向和长度会怎样？','调公式中的系数，打开合向量。一次只改一个系数，比较图上的箭头和分量表达式。','正倍数拉长或缩短箭头，负倍数还让方向反过来。','同一方向连续走两段相同距离，可以用2倍箭头表示。','用线性组合a·u+b·v逐分量计算。系数0使该箭头贡献为0，不是让别的箭头消失。')
    ],
    'fractions-intro':[
      screen('intro','介绍','分母从4变8，同样取1份，覆盖面积怎样变化？','调分子、分母，切换饼、条、杯或数轴表示；保持同一个整体比较。','整体等分更多份，单份更小；相同分数可以有不同表示。','同样大小的蛋糕分4份和8份，每一份不同大。','1/4=2/8。分子与分母不能只改一个就声称分数不变，比较图形前需同单位整体。'),
      screen('game','游戏','目标分数表示要取几份、每份多大？','选关卡，先读目标。拖动拼块到框中，核对分母对应的等分，再检查。','分母对应每份大小，分子对应份数；匹配的是同一个数。','按食谱取3/4杯，需要明确杯子整体与每小份。','等值分数可帮助寻找不同拼法；具体目标以当前游戏卡片为准，不固定成某一个分数。'),
      screen('lab','实验室','把分数拆开或合起来，能保持同样的总量吗？','自由选择分数表示，把相等大小的拼块放进框中，比较图形、数字与数轴。','分成更多小份不会凭空增加整体，合并等量小份也保持总量。','把半块巧克力切成两小块，巧克力总量仍是半块。','分数加合须使用相同单位；不同分母先理解或统一每份大小，不直接相加分母。')
    ],
    'fraction-matcher':[
      screen('fractions','分数','1/2与2/4虽写法不同，图形覆盖的比例相同吗？','把两个候选卡片放在配对位置，检查；把图形卡与数字卡分别按相同整体比较。','等值分数表示同一个数，涂色样子不同也可能相等。','半张纸与同张纸的四分之二一样大。','可通分或约分验证，a/b=c/d时ad=bc；分母正且不为0，不能只数涂色块数。'),
      screen('mixed-numbers','带分数','1又1/2与3/2能成为朋友吗？','先数完整整体，再数剩余分数，把带分数和假分数卡片进行配对并检查。','一个完整整体加半个整体，共有三个半份。','一杯半牛奶也可以量成三个半杯。','n又a/b=(nb+a)/b。不要把整数n当作分子直接与a相加。')
    ],
    'balancing-act':[
      screen('intro','介绍','左右重量不同，怎样摆位置还能让横杆平衡？','在两边放砖块，先用支撑保持横杆，再猜哪边下沉，移走支撑检查。','质量和离支点的距离一起影响转动，支撑拿走后才看得出平衡。','跷跷板上轻的人坐远些可能平衡重的人。','比较两侧m×距离，位置以支点为起点；支撑仍在时横杆水平不能作为检验。'),
      screen('balance-lab','平衡实验室','已知一边的质量与位置，另一边有哪些平衡摆法？','固定左边，换右边一个物体或位置；标出离支点的距离，移支撑检验。','同一侧总转动作用可由多个物体共同组成。','天平和跷跷板都要比较两边对支点的作用。','多物体需加总Σmᵢdᵢ；质量未知时可由平衡关系反推，单位必须一致。'),
      screen('game','游戏','本关要找平衡位置、猜质量，还是判断哪边下降？','读关卡要求，先标出支点两边质量与距离，再计算或移动，最后检查。','平衡题的共同关系是两边对支点的转动作用相抵。','搬动杠杆上的重物位置可以改变两边平衡。','使用本关给出的数据建立Σ左md=Σ右md；别把质量比误当作距离同向比。')
    ],
    'circuit-construction-kit-dc':[
      screen('intro','介绍','开关断开时，电池还在，灯为什么不亮？','接出电池、灯泡、导线回路，加开关。先断开再闭合，观察电流和亮度。','完整回路才能持续通电，开关控制回路的通断。','手电筒关掉后，电池仍在里面但回路不通。','电池提供电势差，导线闭合使电流能通过负载。灯泡两接点要接到回路的不同位置。'),
      screen('lab','实验室','串联两只灯与并联两只灯，电流和亮度一样吗？','搭两条不同连接的回路，用电流表和电压表比较；每次保留电池参数不变。','连接方式改变电流的通路，支路与总回路读数不同。','家中的多只灯可分别控制，因为各有回路支路。','串联同电流、并联同支路电压是理想电路关系。仪表连接与方向影响读数；模型忽略真实电源限制。')
    ],
    'states-of-matter-basics':[
      screen('states','状态','固体的粒子在固定位置附近还会运动吗？','选同一种物质并切换三种状态，观察排列与运动；再缓慢加热和冷却。','固体粒子通常在位置附近振动，液体可移动而较近，气体更分散。','冰、水与水蒸气让我们看到不同物态。','粒子并非静止，温度与平均动能关联；物质种类不同，其相互作用及相变温度也不同。'),
      screen('phase-changes','相变','加热、压盖与加粒子，哪个会改变碰壁的次数和压力？','先只加热，再重置只压盖，再重置只加粒子。比较粒子运动与压力读数。','气体粒子碰容器壁产生压力；温度、体积和数量都可能影响碰壁。','密闭空气被压缩时，容器内压力常增大。','区分温度、体积与粒子数的独立变化；相变中还涉及相互作用，不能把所有状态都直接套理想气体公式。')
    ],
    'build-a-molecule':[
      screen('single-molecule','单个分子','H₂O中的小2是在说两个水分子吗？','从桶中取两个H与一个O组成水，核对标签，再放到收集框。','下标说明一个分子中该元素的原子数，H₂O是一种水分子。','一杯水中有很多水分子，每个有2个H和1个O。','区分2H₂O与H₂O：前者两分子，共4H和2O；连接由模型预设规则确定。'),
      screen('multiple-molecules','多个分子','有6个H和3个O，能搭几个水分子？','先数桶中的原子，按目标化学式逐个搭建，把分子收集并记录用了多少原子。','每个目标分子用固定数量的原子，可搭个数还受较少的那类原子限制。','三套积木小人若每套用2只手和1个身子，需要6只手3个身子。','按化学式作整数原子计数；6H和3O可组3H₂O。模型搭建不等于现实原子在任意条件都自动反应。'),
      screen('playground','自由探索','换一种原子或数目，会得到不同名称的分子吗？','选一组原子，尝试不同连接，观察名称和化学式；可打开立体视图比较结构。','种类、数量与连接方式共同帮助辨认分子。','搭积木时，用相同数量但不同连接也可能得到不同结构。','原子计数相同不必保证同一种分子，部分物质有同分异构。仿真只允许其预设的连接，不穷尽所有分子。')
    ]
  };
  for(const [id,guide] of Object.entries(PHET_GUIDES))guide.screens=SCREENS[id].map(item=>({...item,id:guide.id+'/'+item.id,source:'src/phet/generated/'+id+'.html'}));
  const TANGRAM_GUIDE=g('tangram-legacy','七巧板：观察、移动与旋转','七块拼板的形状不变，转动后能填进目标的哪些角？','先看目标，再开始拼图。拖拼板内部移动，拖住一角转动；也可选拼板后用方向与旋转按钮。先找大三角形，再用小块补空隙。','平移和旋转保留每块的形状与面积。拼满轮廓需要不重叠、没有空隙地用上全部拼板。','把同一套拼板重新摆放，可以拼出不同动物或生活物品。','这是平面拼图以立体画面显示。原版完成判断涉及相邻连接，不保证严格证明与指定目标完全重合；仍需目视核对目标轮廓。');
  const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function markup(guide){return ['observe','operate','why','example'].map((key,i)=>'<section data-guide-field="'+key+'"><h3>'+['观察什么','怎么操作','为什么这样','生活中的例子'][i]+'</h3><p>'+esc(guide[key])+'</p></section>').join('')+'<details><summary>高年级 · 原理</summary><p>'+esc(guide.principle)+'</p></details>';}
  function createPanel(guide){
    const element=document.createElement('details');element.className='mp-learning-panel';element.dataset.guideId=guide.id;
    element.innerHTML='<summary>实验引导 · '+esc(guide.title)+'</summary><div class="mp-learning-body"><div class="mp-learning-steps"></div><p class="mp-learning-step" role="status"></p><div class="mp-learning-fields"></div></div>';
    let current=guide,index=0;
    const update=(next)=>{current=next;index=0;element.dataset.guideId=next.id;element.querySelector(':scope > summary').textContent='实验引导 · '+next.title;element.querySelector('.mp-learning-fields').innerHTML=markup(next);element.querySelector('.mp-learning-steps').innerHTML=next.steps.map((step,i)=>'<button type="button" data-learning-step="'+i+'">'+(i+1)+' '+step.title+'</button>').join('');stepTo(0);};
    const stepTo=(next)=>{index=next;element.querySelector('.mp-learning-step').textContent=current.steps[index].text;element.querySelectorAll('[data-learning-step]').forEach(button=>button.setAttribute('aria-current',Number(button.dataset.learningStep)===index?'step':'false'));element.querySelector('[data-guide-field="why"]').hidden=index!==2;element.querySelector('.mp-learning-fields > details').hidden=index!==2;};
    const controller=new AbortController(),options={capture:true,signal:controller.signal};
    const activate=target=>{const button=target.closest('[data-learning-step]');if(button){stepTo(Number(button.dataset.learningStep));return;}const summary=target.closest('summary');if(summary&&element.contains(summary))summary.parentElement.open=!summary.parentElement.open;};
    // PhET forwards document input into Scenery and suppresses default HTML
    // clicks. Handle this small host panel before that forwarding layer.
    const pointers=new Set(),touches=new Set();let mouseStarted=false;
    window.addEventListener('pointerdown',event=>{if(!element.contains(event.target))return;pointers.add(event.pointerId);event.stopImmediatePropagation();},options);
    window.addEventListener('mousedown',event=>{mouseStarted=element.contains(event.target);if(mouseStarted)event.stopImmediatePropagation();},options);
    window.addEventListener('mouseup',event=>{if(mouseStarted)event.stopImmediatePropagation();mouseStarted=false;},options);
    window.addEventListener('touchstart',event=>{if(!element.contains(event.target))return;for(const touch of event.changedTouches)touches.add(touch.identifier);event.stopImmediatePropagation();},options);
    window.addEventListener('touchend',event=>{let handled=false;for(const touch of event.changedTouches)handled=touches.delete(touch.identifier)||handled;if(handled)event.stopImmediatePropagation();},options);
    window.addEventListener('pointerup',event=>{if(!pointers.delete(event.pointerId))return;event.stopImmediatePropagation();event.preventDefault();if(element.contains(event.target))activate(event.target);},options);
    window.addEventListener('pointercancel',event=>pointers.delete(event.pointerId),options);
    window.addEventListener('click',event=>{if(!element.contains(event.target))return;event.stopImmediatePropagation();event.preventDefault();if(event.detail===0)activate(event.target);},options);
    window.addEventListener('keydown',event=>{if(!element.contains(event.target))return;event.stopImmediatePropagation();if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(event.target);}},options);
    update(guide);
    return {element,update,destroy:()=>controller.abort(),snapshot:()=>({guideId:current.id,step:index,fields:['observe','operate','why','example']})};
  }
  globalThis.MathPhysicsLearning={PHET_GUIDES,TANGRAM_GUIDE,markup,createPanel};
})();
