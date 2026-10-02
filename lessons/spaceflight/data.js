/* MathPhysics original teaching content · MIT. Facts checked 2026-10-02.
 * Sources are linked, not copied. Sequences are instructional, not flight telemetry. */
(() => {
'use strict';
const sources = {
  newton:{title:'NASA Glenn · Newton’s Laws of Motion',url:'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/newtons-laws-of-motion/',scope:'推力、惯性和加速度；支持原理实验，不提供真实火箭性能。'},
  thrust:{title:'NASA Glenn · Rocket Thrust',url:'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust/',scope:'火箭喷出物质获得推力，自带推进剂，不需要“蹬空气”。'},
  falcon:{title:'NASA · The Falcon and Dragon',url:'https://blogs.nasa.gov/spacex/2018/06/29/the-falcon-and-dragon/',scope:'猎鹰9两级结构、一级九台发动机、二级单发动机；区分早期货运龙与本课载人龙。'},
  recovery:{title:'NASA · Falcon 9 First Stage Sticks the Landing',url:'https://blogs.nasa.gov/spacex/2020/12/06/falcon-9-first-stage-sticks-the-landing/',scope:'一级回收与二级送飞船入轨是不同的并行任务；并非每次发射都回收。'},
  dragon:{title:'NASA · Commercial Crew Program Press Kit',url:'https://www.nasa.gov/commercial-crew-program-press-kit/',scope:'Crew Dragon 结构、太阳能尾舱、自动交会对接、舱内生命保障及海上回收。'},
  dragonReturn:{title:'SpaceX · Dragon recovery operations update',url:'https://new.spacex.com/updates',scope:'文内“Dragon Design and Current Recovery Operations / Looking Ahead”：西海岸回收方案在离轨点火后分离尾舱；非整页新闻内容。'},
  dragonOld:{title:'NASA · Demo-2 Return，2020-08-02',url:'https://www.nasa.gov/blogs/spacestation/2020/08/02/the-spacex-crew-dragon-is-go-for-deorbit-burn/',scope:'历史对照：Demo-2 先分离尾舱，再离轨点火；不能与后期方案混成固定顺序。'},
  chutes:{title:'NASA · Top 10 Things to Know for Demo-2 Return',url:'https://www.nasa.gov/humans-in-space/top-10-things-to-know-for-nasas-spacex-demo-2-return/',scope:'龙飞船两具减速伞和四具主伞；本课不使用该次任务的时间与高度作为通用控制值。'},
  cz10b:{title:'国家航天局 · 长征十号乙与网系回收（2026-07-10）',url:'https://www.cnsa.gov.cn/n6758823/n6758838/c10761540/content.html',scope:'长征十号乙采用两级串联构型；一级通过领航者号船的井字形缓冲拦阻网与箭上挂索机构捕获。图解不提供真实控制阈值。'},
  cz10bRecovery:{title:'中国航天科技集团 · 长十乙首飞与回收（2026-07-10）',url:'https://www.spacechina.com/n25/n2014789/n2414549/c4647268/content.html',scope:'一级液氧煤油、二级液氧甲烷；一二级分离后，一级垂直返回并经海上平台网系捕获。再入、姿态调整与末段减速的细分画面是原理拆解，不复现实际秒表或点火控制律。'},
  cz2:{title:'国家航天局 · 长征二号F（CZ-2F）',url:'https://www.cnsa.gov.cn/n6758824/n6759008/n6759011/c6794041/content.html',scope:'神舟发射对应长征二号F，两级芯级、四枚助推器和顶部逃逸塔。'},
  szLaunch:{title:'中国载人航天 · 神舟六号飞行程序（历史顺序参考）',url:'https://www.cmse.gov.cn/ztbd/xwzt/qzxzgcllszntbzt/fzlc/200909/t20090925_39619.html',scope:'逃逸塔、助推器、一级、整流罩分离的典型先后；不把旧任务秒表复制给当前神舟。'},
  szReturn:{title:'中国载人航天 · 神舟十七号返回，2024-04-30',url:'https://www.cmse.gov.cn/xwzx/202404/t20240430_55402.html',scope:'轨道舱分离、返回制动、推进舱分离及东风着陆场回收。'},
  szHeat:{title:'国家航天局 · 载人飞船返回舱的防热衣',url:'https://www.cnsa.gov.cn/n6758968/n6758973/c6797015/content.html',scope:'神舟轨道舱、返回舱、推进舱结构；绝热与烧蚀防热。'},
  docking:{title:'国家航天局 · 交会对接系统技术说明',url:'https://www.cnsa.gov.cn/n6758823/n6758838/c6771228/content.html',scope:'交会、接近、捕获、校正和锁紧；游戏容差不取自真实飞船。'},
  station:{title:'NASA · International Space Station Cooperation',url:'https://www.nasa.gov/international-space-station/space-station-international-cooperation/',scope:'国际空间站由国际伙伴合作建设和运行，并不是美国独有空间站，也不是猎鹰9单次发射建成。'},
  tg:{title:'中国载人航天 · 解码梦天：舱段专属座驾',url:'https://www.cmse.gov.cn/xwzx/202210/t20221030_51154.html',scope:'天和、问天、梦天组成三舱T字基本构型；舱段由长征五号B分别送入轨道。'},
  solar:{title:'中国载人航天 · 太空电站与太阳翼',url:'https://www.cmse.gov.cn/xwzx/202211/t20221107_51357.html',scope:'天宫太阳翼、对日定向；本课100 W实验面板是任意教学参数。'},
  life:{title:'NASA · 25 Years of Space Station Technology',url:'https://www.nasa.gov/centers-and-facilities/johnson/25-years-of-space-station-technology-driving-exploration/',scope:'空间站空气净化、制氧及水回收；不将ISS回收率当作两座空间站共有参数。'},
  micro:{title:'NASA · What Is Microgravity? (Grades 5–8)',url:'https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/',scope:'在轨漂浮是共同自由落体，不是地球引力消失。'},
  earth:{title:'NASA NSSDCA · Earth Fact Sheet',url:'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',scope:'球形地球平均半径6371 km、地球引力参数约398600 km³/s²，用于理想二体实验。'},
  heat:{title:'NASA · Entry Systems Modeling',url:'https://www.nasa.gov/entry-systems-modeling-esm-2/',scope:'再入气动减速、能量转化、防热、降落伞；本课不计算真实热流与表面温度。'},
  debris:{title:'ESA · Zero Debris Technologies',url:'https://www.esa.int/Space_Safety/Clean_Space/Zero_Debris_Technologies',scope:'卫星寿命结束、处置轨道、降低轨道及减少在轨爆炸风险；本课不引用动态碎片数量。'},
  shield:{title:'NASA · What Is HEEET?',url:'https://www.nasa.gov/general/what-is-heeet/',scope:'钝头体防热、隔热材料与高温环境；只用于防热原理，不声称龙或神舟使用HEEET。'}
};
// Per-stage question: [prompt, options, correct-index, explanation].
function s(id,title,scene,body,kids,why,mis,refs,extra={}) {return {id,title,scene,body,kids,why,mis,refs,...extra};}
const steps={
 prepare:s('prepare','出发前的检查','pad','火箭、飞船和地面团队一起检查动力、通信、气象与安全系统。载人任务还要检查航天服、舱门气密性和生命保障。','先确认设备和天气都适合，再出发。','载人飞行把安全放在首位；检查不通过可以推迟发射。等待合适的发射时机，也是在为之后的交会创造条件。','倒计时归零不意味着必须发射。',['dragon','cz2'],{concept:'系统与安全',lab:'thrust',quiz:['检查未通过时应当怎样？',['继续发射','暂停并排查','只让火箭飞得更快'],1,'推迟发射是正常的安全决策，不是失败。']}),
 launch:s('launch','点火，离开发射台','launch','发动机将高速气体向后喷出，火箭获得向前的推力。起飞瞬间，向上的推力要足以克服重力等作用。','气体往下喷，火箭被推向上。','火箭推气体，气体也推火箭。这一对力分别作用在气体和火箭上，不在火箭上互相抵消。','火箭不需要靠空气做“蹬板”。真空中也能获得推力。',['thrust','newton'],{concept:'牛顿第三定律',lab:'thrust',quiz:['火箭在真空中为什么还能推进？',['必须推着空气','喷出物质产生反作用','因为真空没有重力'],1,'火箭通过向后喷出物质获得向前的动量。']}),
 turn:s('turn','逐渐转弯，积累水平速度','turn','火箭离开发射台后逐渐改变飞行方向。送入轨道不只需要达到一定高度，更需要足够的横向速度。','不仅向上飞，还要学会“绕着地球飞”。','在轨道上，引力不断改变速度方向。火箭先给飞行器合适的速度，之后可以滑行而不持续点火。','冲得很高，不等于已经进入轨道。',['micro','earth','newton'],{concept:'速度也是箭头',lab:'orbit'}),
 maxq:s('maxq','穿过气动载荷较大区段','turn','上升初段，速度增大而空气逐渐稀薄。火箭要控制飞行姿态与动力，平稳穿过气动载荷较大的阶段。','飞得快时，空气的“推挤”也要小心。','动压与空气密度和速度平方有关。低空空气密、高空速度快，最大动压通常出现在上升中的某个区段。','最大动压不等于最高温度或最大加速度。',['dragon','newton'],{concept:'空气与速度',formula:'q = ½ρv²（动压；不是温度）'}),
 fstage:s('fstage','一、二级分开','stage','一级完成这一段推进，关机并与二级分离；二级继续携带任务载荷飞行。','交接接力棒，轻装继续向前。','分级抛下不再需要的结构，减轻后续推进的负担。分离本身并不会凭空产生很大的前进速度。','被回收的是一级；飞船和卫星仍由上面部分送往轨道。',['falcon','recovery'],{concept:'分级与质量',lab:'staging'}),
 cstage:s('cstage','芯一级分离，二级接力','stage','芯一级完成工作并分离，第二级继续推进载荷。已经分离的部分不再随飞船进入任务轨道。','下面的一级完成任务，上面继续飞。','质量减少后，同样的净作用力能产生更大的加速度。本课只做定性分级演示。','长征二号F不进行本课一级回收；长十乙采用网系捕获，不能套用猎鹰9着陆腿。',['cz2','cz10b','newton'],{concept:'分级与质量',lab:'staging'}),
 boostback:s('recovery','支线：一级返回与着陆','recovery','本演示选择猎鹰9海上平台回收示例。一级调整姿态，通过再入减速与着陆点火减小下降速度，再展开支腿落到平台上。','一级先回家，飞船还在继续旅行。','这是与上面级推进并行的回收支线。返回轨迹和点火安排依任务而异，有的任务不回收一级。','一级通常未进入轨道；它的回收不是载人龙的返航。',['recovery','falcon'],{concept:'减速也需要力',lab:'thrust',branch:true}),
 upper:s('upper','上面级继续加速','upper','上面级继续推进，让载荷接近需要的轨道状态。关闭发动机后，载荷仍然保持运动。','发动机关了，也不会突然停下。','真空中阻力很小，合力主要来自引力。惯性让飞行器继续前进，引力使路径弯曲。','空间中不是“持续踩油门才会移动”。',['newton','earth'],{concept:'惯性与引力',lab:'orbit'}),
 fairing:s('fairing','保护罩分离','fairing','飞出较稠密大气后，原先保护载荷的整流罩分成两瓣离开，载荷暴露出来并继续飞行。','空气很稀薄后，脱下保护外套。','整流罩承担上升时的气动与环境防护；不再需要时分离，可以减轻质量。','载人龙不是藏在这种卫星两瓣式整流罩中。',['cz2','cz10b','falcon'],{concept:'保护与减重',lab:'staging'}),
 deploy:s('deploy','卫星与火箭分离','deploy','火箭完成送入预定轨道的任务后，卫星与上面级分离，开始独立飞行与状态检查。','卫星离开“顺风车”，开始自己的工作。','分离前两者共同运动。分离装置只给出小的相对速度，轨道速度不是在这一瞬间才获得的。','卫星分离不是“从静止掉下去”。',['falcon','cz10b','newton'],{concept:'共同速度与相对速度',lab:'orbit'}),
 commission:s('commission','展开、调姿与在轨测试','satellite','示意卫星展开太阳翼，调整姿态，检查通信和载荷。需要时还会自行变轨，不能把火箭分离时刻等同于业务正式开始。','打开太阳翼，检查“电源”和“电话”。','太阳翼把光能转成电能；姿态控制用于对准太阳、地面或观测目标。不同卫星的结构、用途和变轨方案不同。','这是一颗通用教学卫星，不是某一真实卫星的精确复刻。',['solar','newton'],{concept:'能量与定向',lab:'power'}),
 service:s('service','在轨服务与寿命结束','satellite','卫星进入工作阶段，进行通信、观测或其他任务。任务结束后，应按轨道条件和批准方案处理剩余能量与轨道，减少空间碎片风险。','卫星工作很久，退休也要有计划。','低轨任务可选择降低轨道再入；高轨任务常采用移至处置轨道等方案。不是每颗卫星都带着降落伞回地球。','卫星释放、业务运行、最终处置是不同阶段。',['debris'],{concept:'任务生命周期',quiz:['普通工作卫星是否都像载人舱一样开伞回家？',['是','不是，要按任务处置','会飞回火箭里'],1,'飞船载人返回和卫星寿命结束处置不是同一种任务。']}),
 craftSep:s('craftSep','船箭分离','craftSep','上面级完成这一段推进并关机后，飞船与运载火箭分离。飞船已经有轨道速度，随后接管自己的在轨任务。','飞船离开火箭，独立飞行。','两者原本共同运动。小的分离作用帮助安全拉开距离，而不是在分离时才得到全部轨道速度。','船箭分离不等于空间站对接，也不是立即开始返回。',['dragon','cz2','newton'],{concept:'共同运动与独立飞行',lab:'orbit'}),
 activation:s('activation','飞船独立飞行','activation','飞船与火箭分离，展开或启用能源系统，检查推进、热控、生命保障和导航，为交会做准备。','飞船开始自己照顾电力、空气和方向。','载人飞船同时是交通工具与短期生活舱；空间站不是火箭的一部分。','飞船入轨后还没有与空间站对接。',['dragon','szHeat'],{concept:'飞船的不同分工',lab:'power'}),
 phase:s('phase','变轨与交会','phase','地面与飞船共同确定交会计划，通过合适的变轨逐渐接近空间站的轨道与位置。','先约好见面的位置，再慢慢靠近。','较低圆轨道周期更短，但“减速就能追上”不是任何时刻都成立。实际交会要同时设计速度、轨道和相位。','对接不是瞄准空间站一路直线冲过去。',['dragon','docking','earth'],{concept:'轨道、相位与时间',lab:'orbit'}),
 approach:s('approach','近距离接近','approach','飞船建立相对导航，逐步减小与对接口之间的距离，控制横向偏差、姿态与相对速度。','像停靠码头，但飞船和“码头”都在飞。','两者相对地球都很快，对接时彼此却要非常缓慢。运动要先说明相对于谁。','地面看起来飞得快，不等于两船会高速相撞。',['dragon','docking'],{concept:'相对运动',lab:'dock',quiz:['对接时最应控制哪一种速度？',['与空间站的相对速度','电视画面播放速度','太阳光的速度'],0,'近距离对接需要缓慢且受控的相对运动。']}),
 dock:s('dock','捕获、锁紧、检查后开舱','dock','对接机构接触并捕获，再拉近、锁紧。确认密封与压力条件合适后，才能打开舱门转移人员。','先接牢、检查好，再打开门。','对接既是运动控制，也是机械连接和气密安全过程。动画中的“碰上”并不等于已经可以开门。','不能在开放真空中直接打开两边的舱门。',['dragon','docking'],{concept:'密封与安全',lab:'dock'}),
 stay:s('stay','空间站里的工作与生活','station','航天员进行科学实验、锻炼和维护。太阳翼发电，环境控制系统维持合适的舱内条件，飞船停靠以备返航或应急使用。','在轨道上的家里做实验，也要锻炼身体。','空间站与舱内的人一起绕地球自由下落，于是相对舱壁漂浮；那里仍有很强的地球引力。','国际空间站是国际合作项目；天宫与它是两座不同空间站。',['station','tg','life','micro'],{concept:'微重力与生命保障',lab:'freefall',quiz:['航天员漂浮的主要原因是什么？',['地球引力消失','人与空间站共同自由下落','空气把人托起来'],1,'引力仍在，空间站和航天员一起沿轨道自由运动。']}),
 undock:s('undock','告别空间站，撤离','undock','人员进入返回飞船，检查舱门、航天服和系统，解除对接后缓慢撤离到安全距离。','先关门检查，再和空间站说再见。','分离后的飞船不会立刻坠落。它仍处于轨道飞行，之后还需要改变轨道。','解开对接口不等于马上开始垂直掉落。',['dragon','szReturn'],{concept:'分离后仍有惯性',lab:'orbit'}),
 deorbit:s('deorbit','离轨点火','deorbit','飞船在合适位置进行制动点火，降低运动方向上的速度，使轨道的低点进入大气层。','先减一点速，让回家的轨道靠近地球。','制动力方向与运动方向相反。点火结束后飞船并没有静止，而是沿新的轨道进入再入段。','返回不靠“关闭重力”或直接朝地面猛冲。',['dragonReturn','szReturn','newton'],{concept:'改变速度就改变轨道',lab:'orbit'}),
 trunk:s('trunk','龙飞船尾舱分离','trunk','本课采用西海岸回收方案：先完成离轨点火，再丢弃不返回使用的尾舱，准备让乘员舱独立再入。','尾舱完成工作，只让乘员舱带大家回家。','尾舱为在轨飞行提供太阳能与散热功能。先离轨再分离，也使尾舱处于规划的再入轨迹上。','历史任务如Demo-2曾先分离尾舱再离轨；两种版本不能混用。',['dragonReturn','dragonOld','dragon'],{concept:'任务版本与结构分离'}),
 orbitalSep:s('orbitalSep','神舟轨道舱分离','orbitalSep','神舟先将前部轨道舱与返回舱、推进舱组合体分开，为返回制动做准备。','前面的轨道舱先离开，另外两舱准备返航。','航天员乘坐的是中间的返回舱；推进舱此时仍连接着，后续负责返回制动。','神舟不是三个舱一起着陆。',['szReturn','szHeat'],{concept:'轨道舱 / 返回舱 / 推进舱'}),
 serviceSep:s('serviceSep','推进舱分离','serviceSep','返回制动完成后，推进舱与返回舱分离。只有有防热结构的返回舱继续载人进入稠密大气。','推进舱也完成工作，返回舱独自回家。','飞船分工明确：推进、在轨工作与再入防护不是同一个舱都承担。','不能把神舟推进舱当成载人返回舱。',['szReturn','szHeat'],{concept:'分舱与防热'}),
 entry:s('entry','再入：减速与防热','entry','返回舱以防热面迎向来流，空气被压缩并受热，飞船运动能量逐渐转移到周围气体等系统。防热结构保护舱内。','外面很热，防热层保护里面的人。','空气动力先承担高速减速。热流、姿态和飞行路径需要综合控制；这里只演示能量关系，不预报真实温度。','不能在轨道速度下先打开主降落伞。',['heat','shield','szHeat'],{concept:'能量转化与防护',lab:'entry'}),
 chute:s('chute','降落伞接力减速','chute','进入适合的速度与大气条件后，降落伞系统按程序工作，继续降低下落速度。载人龙有两具减速伞与四具主伞，神舟的伞系统不同。','先减速，再让大伞接力。','降落伞依靠空气阻力。展开更大面积通常有利于低速减速，但不代表能在任意高度、速度下打开。','真空里展开降落伞不能靠空气阻力减速。',['chutes','szLaunch','newton'],{concept:'空气阻力',lab:'chute',quiz:['降落伞在真空中能靠空气减速吗？',['能','不能','只要伞够大就能'],1,'没有空气，就没有这里需要的空气阻力。']}),
 splash:s('splash','海上溅落与回收','splash','载人龙乘员舱在海面溅落，回收团队靠近并进行检查，将飞船与乘员接回。','飞船落在海上，回收船来接大家。','乘员舱靠降落伞和水面着陆方案返回；不是像猎鹰9一级那样用发动机竖着落到平台上。','本课海面示意不表示具体经纬度或某次任务着陆点。',['dragon','chutes'],{concept:'两种不同的回收'}),
 land:s('land','陆地缓冲着陆与搜救','land','神舟返回舱由降落伞继续减速，接近地面时着陆缓冲系统工作，搜救与医监医保人员到达现场。','大伞减速，最后缓冲一下，再由队伍接回。','近地面短时缓冲与整个下降过程中的伞降配合使用；这不同于猎鹰9一级的动力着陆。','神舟常规返回不是海上溅落。',['szLaunch','szReturn'],{concept:'分阶段减速'}),
 finish:s('finish','乘员出舱，任务交接','finish','完成回收、身体状态确认和样品设备转运。地面团队检查飞船与任务数据，为下一次任务积累经验。','安全回家后，还要整理实验和检查设备。','载人任务的全过程包括训练、发射、在轨工作与回收支持，不只是一段发射视频。','本课动画是教学概括，不是工程操作程序或飞行认证。',['dragon','szReturn'],{concept:'任务闭环'})
};
const usCrew=['prepare','launch','turn','maxq','fstage','upper','craftSep','activation','phase','approach','dock','stay','undock','deorbit','trunk','entry','chute','splash','finish'].map(k=>steps[k]);
const usSat=['prepare','launch','turn','maxq','fstage','upper','fairing','deploy','commission','service'].map(k=>steps[k]);
const cnCrew=[steps.prepare,steps.launch,steps.turn,
 s('tower','逃逸塔正常抛离','tower','正常上升到相应阶段后，逃逸塔按程序与火箭顶部保护结构分开。异常情况下的逃逸是另一条安全流程。','正常飞行时，完成这一段保护的逃逸塔离开。','逃逸塔的作用是危险时帮助载人部分尽快远离火箭。正常抛塔不能画成已经发生了一次紧急逃逸。','这里演示正常任务，不是事故。',['cz2','szLaunch'],{concept:'正常分离与应急逃逸'}),
 s('boosters','四枚助推器分离','boosters','四枚侧面助推器完成工作后分离；主芯级仍然继续飞行。图中前后两枚为投影示意。','旁边的助推器先完成接力。','助推器提供起飞初段额外推力，完成工作后分离以减少后续负担。','长征十号乙采用两级串联，不带这里的四枚捆绑助推器。',['cz2','cz10bRecovery'],{concept:'捆绑式助推器',lab:'staging'}),
 steps.cstage,steps.fairing,steps.upper,steps.craftSep,steps.activation,steps.phase,steps.approach,steps.dock,steps.stay,steps.undock,steps.orbitalSep,steps.deorbit,steps.serviceSep,steps.entry,steps.chute,steps.land,steps.finish];
const cnSat=[steps.prepare,steps.launch,steps.turn,steps.maxq,steps.cstage,steps.fairing,steps.upper,
 s('coast','二级关机后继续滑行','coast','二级完成本段加速后，载荷组合保持运动。滑行画面用于解释惯性，不规定实际任务点火次数。','发动机关了，仍会继续向前飞。','引力继续改变运动方向，关机不会让物体停在原地。','这条路线是长十乙两级卫星发射，不再出现第三级。',['cz10b','newton','earth'],{concept:'惯性与滑行',lab:'orbit'}),
 steps.deploy,steps.commission,steps.service,
 s('transfer','拓展：卫星怎样改变轨道？','transfer','这是任务结束后的通用轨道拓展：卫星可按任务需要调整轨道；示意比较原轨道与椭圆转移轨道。它不代表长十乙首飞的实际高轨任务。','卫星有时需要改变自己的工作路线。','推力的方向与施加位置会影响轨道形状；转移轨道和最终工作轨道需要区分。','这张拓展图不是长十乙发射的必经阶段，也不意味着另有第三级。',['orbitBasics','earth'],{concept:'轨道拓展 · 非固定任务步骤',lab:'orbit'})];
const netRecovery=s('recovery','长十乙一级：海上网系捕获','recovery','一、二级分离后，二级继续运送卫星；一级沿独立支线调整姿态、下降减速，靠近回收船。箭上挂索机构与井字形缓冲拦阻网配合，捕获并承托一级。','卫星继续上班，一级减速后由船上的网接住。','网系与挂索机构承担末端捕获和缓冲，不等于整枚火箭撞向一张平铺的网。步骤把连续过程拆开讲解；模型数值不是实际控制指令。','这里没有猎鹰9式着陆腿，也不是神舟或载人龙的伞降返回。',['cz10b','cz10bRecovery'],{concept:'并行任务 · 末端捕获',lab:'thrust',branch:true,recoveryKind:'net',stages:[
 {id:'separate',title:'分离：两条路线',text:'一级与二级分离，保留共同的初始速度；二级继续携带卫星推进。'},
 {id:'orient',title:'调整返回姿态',text:'一级调整方向，以适合后续下降与减速；不是整枚火箭一起返回。'},
 {id:'descend',title:'下降与气动作用',text:'一级向下运动，空气参与减速；箭体需要保持可控姿态。'},
 {id:'brake',title:'点火减小下降速度',text:'发动机产生与下降方向相反的推力；速度减小，但一级不会瞬间停住。'},
 {id:'align',title:'对准网系捕获区',text:'一级接近回收船，挂索机构与捕获网需要相互对准。'},
 {id:'capture',title:'挂索与网系捕获',text:'挂索机构接触井字形缓冲拦阻网，网系承接载荷并缓冲。'},
 {id:'secure',title:'承托与回收检查',text:'一级由网系稳定承托。回收后仍需检查与维护，不能把回收直接当作再次发射。'}
]});
const missions={
 'us-crew':{id:'us-crew',tag:'载人任务',country:'美国发射体系',name:'猎鹰9号 · 载人龙 · ISS',short:'载人龙去空间站',rocket:'f9',craft:'dragon',station:'iss',crew:true,color:'#71ead0',steps:usCrew,branch:steps.boostback,summary:'从发射台到国际空间站，再乘载人龙返回海面。国际空间站属于国际合作项目。',note:'采用西海岸回收返回流程：离轨点火后分离尾舱。步骤按教学拆分；一级回收为并行支线。'},
 'us-sat':{id:'us-sat',tag:'卫星任务',country:'美国发射体系',name:'猎鹰9号 · 卫星入轨',short:'送卫星去工作',rocket:'f9',craft:'sat',station:null,crew:false,color:'#71ead0',steps:usSat,branch:steps.boostback,summary:'发射、分级、整流罩分离、卫星部署与在轨服务；一级回收单独演示。',note:'通用低轨卫星发射示例；实际载荷、部署次数、轨道与回收方案随任务变化。'},
 'cn-crew':{id:'cn-crew',tag:'载人任务',country:'中国发射体系',name:'长征二号F · 神舟 · 天宫',short:'神舟去天宫',rocket:'cz2f',craft:'shenzhou',station:'tiangong',crew:true,color:'#ffbb7d',steps:cnCrew,summary:'从酒泉发射的载人系统，到天宫工作，再由神舟返回舱在陆地着陆。',note:'神舟对应长征二号F；本课不绑定某一乘组或发射日期。'},
 'cn-sat':{id:'cn-sat',tag:'卫星与回收',country:'中国发射体系',name:'长征十号乙 · 卫星入轨与一级回收',short:'长十乙送卫星与回收',rocket:'cz10b',craft:'sat',station:null,crew:false,color:'#ffbb7d',steps:cnSat,branch:netRecovery,summary:'两级接力送卫星；一级通过海上网系回收。对照主线与并行支线，认识捕获、滑行和轨道变化。',note:'长十乙（CZ-10B）为两级串联构型；一级在领航者号船上经井字形网系捕获，区别于猎鹰9着陆腿回收。'}
};
const labs=[
 {id:'thrust',title:'推力够不够？',icon:'↑',question:'改变质量和推力，什么时候会向上加速？',text:'这是任意设定的小模型，不是猎鹰9或长征的真实性能。用推力箭头与重力箭头比较，辨认“力”和“运动方向”。',formula:'a = F/m − g；忽略空气阻力，只看这一瞬间。',refs:['newton','thrust'],controls:[['force','推力 F',0,300,10,150,'N'],['mass','质量 m',2,20,1,10,'kg']]},
 {id:'staging',title:'为什么要分级？',icon:'▱',question:'丢掉空壳，速度会凭空跳高吗？',text:'在真空的瞬时简化模型中，假设推力不变。比较保留空级与分离空级后的加速度；不模拟燃料持续消耗。',formula:'分离前后速度不因“减重”凭空增加；之后 a = F/m。',refs:['newton','falcon','cz2'],controls:[['dry','空级质量',20,100,5,60,'kg'],['discard','分离空级',0,1,1,0,'开关']]},
 {id:'orbit',title:'怎样才算入轨？',icon:'◌',question:'同样从高空水平出发，速度不同会怎样？',text:'球形地球、无空气、只有地球引力的二体模型。轨迹算到半径小于地球半径加120 km时停止，并标注再入区域；这里不计算穿越大气。',formula:'圆轨道 v = √(μ/r)，T = 2π√(r³/μ)。低于圆轨道速度不一定撞地，需看轨道低点。',refs:['orbitBasics','earth','micro','newton'],controls:[['alt','初始高度',250,1000,50,400,'km'],['speed','初始横向速度 / 圆轨道速度',65,160,1,100,'%']]},
 {id:'dock',title:'慢慢靠拢的对接',icon:'⊕',question:'靠近时，还能及时停下来并对准吗？',text:'短距离、二维相对运动小游戏：按钮给出速度增量，松手仍会滑行。先对准再慢慢靠拢。阈值完全为教学设定，不是真实飞船容差。',formula:'忽略轨道相对运动耦合；教学容差：横向 <0.3 m、闭合速度 ≤0.25 m/s、姿态误差 <5°。',refs:['docking','dragon','newton'],controls:[['angle','对接口姿态偏差',-20,20,1,0,'°']]},
 {id:'power',title:'太阳翼转向哪里？',icon:'☀',question:'太阳翼侧着对太阳，还能发同样多的电吗？',text:'100 W是假设的正对光源输出。改变入射角，或让空间站进入地球阴影。太阳翼与电池配合：有光时发电，阴影中由储能支持。',formula:'理想平面光照 P = P₀ max(cosθ,0)；θ 是光线与面板法线夹角。忽略效率、遮挡与反射变化。',refs:['solar','life'],controls:[['angle','与面板法线的夹角',0,90,5,0,'°'],['shadow','进入地球阴影',0,1,1,0,'开关']]},
 {id:'freefall',title:'为什么会漂浮？',icon:'⋆',question:'空间站旁边，地球引力真的消失了吗？',text:'比较地面支撑与在轨共同自由下落。人在舱内漂浮，不等于没有质量，也不等于一推就能立刻停下。',formula:'g(h) = μ / (R+h)²。在400 km高度，约为地表引力的89%；这是球形地球估算。',refs:['micro','earth'],controls:[['orbiting','场景：地面 / 在轨',0,1,1,1,'开关'],['personMass','宇航员质量',30,100,5,60,'kg']]},
 {id:'entry',title:'速度变成了什么？',icon:'≈',question:'速度增加一倍，要处理的动能会如何变化？',text:'按每千克质量计算动能。再入时气动作用让能量转移到周围气体等系统，防热层隔热和烧蚀保护舱内。动能不等于全部被防热盾吸收。',formula:'单位质量动能 E/m = ½v²。只算能量，不算表面温度、烧蚀厚度或真实着陆安全。',refs:['heat','shield','szHeat'],controls:[['velocity','示意速度',3,9,0.5,7.5,'km/s']]},
 {id:'chute',title:'降落伞怎样减速？',icon:'◠',question:'伞面积大一些，理想终端速度会怎样？',text:'比较同一质量模型在稠密空气中的终端速度。实际飞船先经过防热再入和气动减速，再按条件打开伞。不是在轨道上直接开伞。',formula:'vₜ = √(2mg / (ρCᴅA))。设 m=150 kg、ρ=1.225 kg/m³、Cᴅ=1.5、g=9.81 m/s²；均为教学参数。',refs:['chutes','newton'],controls:[['area','降落伞参考面积',5,80,5,30,'m²'],['vacuum','切换真空',0,1,1,0,'开关']]}
];
labs.push({id:'launch',title:'发射、入轨与一级回收',icon:'↗',question:'先猜一猜：关机后会停住吗？一级返回时，飞船能同时继续入轨吗？',text:'按所选任务构型计算上升、分级、入轨与独立一级运动。推力、质量、燃料和触发阈值都是缩小的任意教学数值；不代表具体火箭性能。改变条件会清空旧事件并重新计算，也可能入轨或回收失败。',formula:'a = −μr/|r|³ + 推力/m + 简化阻力；ṁ = −推力/(Isp·g₀)；q = ½ρv²（相对空气）。RK4积分；状态触发，简化姿态控制。',refs:['launchAtlas','orbitBasics','dynamicPressure','falconGuide','szSequence','teachingRecovery','cz10bRecovery'],controls:[['thrustPct','教学推力强度',45,130,5,100,'%'],['payloadKg','模型载荷质量',5,100,5,20,'kg'],['turnAltitudeKm','开始转向高度',.5,12,.5,1.5,'km'],['reservePct','一级回收保留燃料',0,28,1,22,'%'],['qLimitKPa','上升动压调节目标',10,60,5,35,'kPa'],['atmospherePct','教学大气密度',0,120,10,100,'%']]});
sources.launchAtlas={title:'Launch Atlas · MIT计算模块',url:'https://github.com/exiztinz/rocket-launch-simulator/tree/b8b570cd2f25b0531724c776631160c48bba06fd',scope:'复用 Joseph Tascona ©2025 的RK4、轨迹和取样模块，使用本项目任意教学参数。已保留完整MIT许可；无纹理、模型、CDN与真实任务预报。'};
sources.orbitBasics={title:'NASA · How Orbits Work',url:'https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/',scope:'横向速度、重力、圆/椭圆轨道与近地点的原理依据；教学模型不含真实气象、地球非球形或多体扰动。'};
sources.szSequence={title:'中国载人航天 · 长征2F正常分离顺序',url:'https://www.cmse.gov.cn/fxrw/tgyhyszbhrw/kpzsa1/201109/t20110928_41166.html',scope:'正常顺序：逃逸塔、助推器、级间、整流罩、船箭分离；不复制2011年任务秒表。'};
sources.dynamicPressure={title:'NASA Glenn · Dynamic Pressure',url:'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure/',scope:'q=½ρv²；这里使用相对旋转空气的速度。MaxQ由实际模型上升数据观测；不是最高速度，也不等于总结构载荷。'};
sources.falconGuide={title:'SpaceX · Falcon User’s Guide（2025）',url:'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf',scope:'§10.6：关机与目标速度/推进剂、载荷部署与轨道/姿态相关。这里只借鉴条件结构，所有数值为任意教学代理。Crew Dragon无卫星整流罩。'};
sources.fairingProxy={title:'SpaceX · 整流罩条件与教学代理',url:'https://www.spacex.com/assets/media/falcon-users-guide-2025-05-09.pdf',scope:'§5.5涉及气动加热率。本模型没有热流计算，以高度/动压做明确标注的教学代理，不能预测真实整流罩抛离。'};
sources.boostback={title:'NASA APOD · Falcon 9 Return to Launch Site',url:'https://apod.nasa.gov/apod/ap200312.html',scope:'返场回收与下程海上回收不同；仅返场模式启用教学返场点火。不声称复现SpaceX控制律。'};
sources.teachingRecovery={title:'NASA · Crew-12 Launch Milestones',url:'https://www.nasa.gov/blogs/commercialcrew/2026/02/13/nasas-spacex-crew-12-launch-milestones/',scope:'支持一级返回与二级入轨并行、龙船箭分离后开鼻锥的任务类型。具体高度、速度、姿态、燃料、落点走廊及停止距离控制由MathPhysics原创任意教学模型提供；无热流与转动动力学。'};
for(const id of ['tower','boosters','cstage','fairing','craftSep']){const step=cnCrew.find(s=>s.id===id);if(step)step.refs=[...new Set([...step.refs,'szSequence'])];}
const systems=[
 {id:'f9',name:'猎鹰9号',sub:'两级火箭 · 卫星或龙飞船',text:'本课区分卫星整流罩与载人龙构型。一级可以按任务方案回收；一级回收与载荷入轨并行。',refs:['falcon','recovery'],parts:[['一级','初段推进；回收型带栅格舵和着陆腿。'],['二级','单发动机继续把载荷送往轨道。'],['任务顶部','卫星任务是整流罩；载人任务是龙飞船，不混用外形。']]},
 {id:'dragon',name:'载人龙 Crew Dragon',sub:'乘员舱 + 尾舱',text:'载人龙的太阳能电池位于尾舱表面，不画成早期货运龙那样的一对展开翼。用于载人的乘员舱返回海面。',refs:['dragon','dragonReturn'],parts:[['乘员舱','乘员、生命保障、导航、降落伞及防热结构。'],['鼻锥','在轨打开以露出对接机构，再入前关闭。'],['尾舱','在轨供电与散热；不随乘员舱回收再用。']]},
 {id:'iss',name:'国际空间站 ISS',sub:'国际合作建设的在轨实验室',text:'由多个国家和机构合作建设、运行，许多舱段经不同火箭或航天飞机分次运输，在轨组装。猎鹰9 / 龙只是其运输方式之一。',refs:['station','life'],parts:[['实验与生活舱','开展研究、休息与日常维护。'],['桁架与太阳翼','承载大型外部结构并提供电力。'],['对接口与机械臂','连接来访飞船，辅助在轨工作。']]},
 {id:'cz2f',name:'长征二号F',sub:'神舟对应的载人运载火箭',text:'两级芯级，捆绑四枚助推器，载人构型带逃逸塔。神舟仍由它发射；不套用长十乙网系或猎鹰9着陆腿回收。',refs:['cz2','szLaunch'],parts:[['逃逸塔','异常时快速带离危险区域；正常任务按程序抛离。'],['四枚助推器','起飞初段提供额外推力。'],['两级芯级','依次工作，把神舟送到预定轨道。']]},
 {id:'shenzhou',name:'神舟载人飞船',sub:'轨道舱 + 返回舱 + 推进舱',text:'本课顺序为轨道舱分离、制动点火、推进舱分离，最后返回舱再入并在陆地着陆。',refs:['szHeat','szReturn'],parts:[['轨道舱','在轨任务与对接相关结构；不载人着陆。'],['返回舱','航天员往返乘坐，具有再入防护。'],['推进舱','推进和供能等支持；制动后分离。']]},
 {id:'tiangong',name:'天宫空间站',sub:'天和 + 问天 + 梦天，T字基本构型',text:'本课使用三舱基本构型示意，不声称画出每一时期的所有来访飞船和扩展结构。三大舱段由长征五号B分别发射；神舟负责乘员运输。',refs:['tg','solar'],parts:[['天和核心舱','空间站管理、生活与支持功能。'],['问天 / 梦天','扩展空间实验与支持能力。'],['长征五号B','承担大型舱段运输；不与神舟运载火箭混同。']]},
 {id:'cz10b',name:'长征十号乙 CZ-10B',sub:'两级串联 · 一级海上网系回收',text:'一级使用液氧煤油，二级使用液氧甲烷。一级返回时由挂索机构与井字形缓冲拦阻网配合捕获，不带猎鹰9式着陆腿；顶部是卫星整流罩。',refs:['cz10b','cz10bRecovery'],parts:[['可回收一级','负责起飞和初段推进；返回时调整姿态、减速并由网系捕获。'],['二级','继续携带卫星加速，使用液氧甲烷推进剂；不是第三级。'],['整流罩与挂索机构','顶部整流罩保护卫星；一级上部挂索机构与船上网系配合，二者位置和用途不同。']]}
];
globalThis.SpaceData={sources,missions,labs,systems,checked:'2026-10-02',version:'0.5.0',storageKey:'mathphysics.spaceflight.v1'};
})();
