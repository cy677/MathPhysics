// Chinese learning notes are original summaries. Grade boundaries follow the
// MOE 2021 syllabus (Oct 2025); learning tiers are this site's teaching choices.
import {guideUnit} from './unit-guides.mjs';
export const CURRICULUM_VERSION = 'sg-2025-10-v1';
export const SYLLABUS = Object.freeze({
  title: '2021 Primary Mathematics Syllabus · Updated October 2025',
  url: 'https://www.moe.gov.sg/-/media/files/primary/2021-primary-mathematics-syllabus-p1-to-p6-updated-october-2025.pdf',
  reviewed: '2026-10-01',
  note: '一年级至四年级为共同课程；五、六年级另设 Standard 与 Foundation。本站的基础、巩固、拔高是学习层次。'
});
export const STRANDS = Object.freeze({number:'数与代数 · Number and Algebra',measurement:'度量与几何 · Measurement and Geometry',statistics:'统计 · Statistics'});
export const LEVELS = Object.freeze([
  {id:1,title:'基础',description:'认识概念，用图和实物完成直接练习。'},
  {id:2,title:'巩固',description:'联系不同表示，熟练计算和解决生活问题。'},
  {id:3,title:'拔高',description:'增加逆向思考和条件联系，解释并检验方法。'}
]);
export const GRADES = Object.freeze([
  {grade:1,title:'一年级 · Primary 1',intro:'从数小棒、排队和买东西出发，认识100以内的数，把实物、图画和算式联系起来。',prerequisite:'会配对、分类、数物体，能描述简单规律。',targets:['读写和比较100以内的数，理解加减和平均分。','用位值和数量关系解释计算，读懂长度、时间与图表。','在本年级范围内倒推未知量，解释规律和选择理由。']},
  {grade:2,title:'二年级 · Primary 2',intro:'把数的范围扩大到1000，建立乘除关系，开始用分数表示整体的一部分。',prerequisite:'100以内加减，十位与个位，基本图形和5分钟刻度。',targets:['掌握三位数与2、3、4、5、10乘法表，认识简单分数。','联系乘除、时分、钱币和有刻度图表，解决直接应用。','通过未知量、图表反推和多种表示说明关系。']},
  {grade:3,title:'三年级 · Primary 3',intro:'认识10000以内的数、等值分数和余数，在测量、周长、面积与条形图中使用数学。',prerequisite:'三位数加减、基础乘法表、同分母分数和时分换算。',targets:['完成四位数加减、三位数乘除一位数，认识等值分数。','用单位、图表与长方形模型连接计算和生活问题。','逆向寻找条件，说明分数、单位与余数的合理性。']},
  {grade:4,title:'四年级 · Primary 4',intro:'把整数、分数和小数联系起来，用测角、对称、展开图和统计图解决更丰富的问题。',prerequisite:'等值分数、长方形面积与周长、单位换算和条形图。',targets:['认识100000以内的数、因数倍数、带分数和三位小数。','熟练分数加减、小数运算，读取折线图与饼图。','利用逆向关系、组合图形和空间推理解释结论。']},
  {grade:5,title:'五年级 · Primary 5',intro:'用分数乘法、百分数和单位率描述生活，认识三角形面积、长方体体积和角的关系。',prerequisite:'分数加减、小数位值与运算、面积周长和测角。',targets:['认识千万以内的数，掌握运算顺序、分数乘法与百分数。','在折扣、单位率、面积和体积问题中连接已知量。','倒推缺少的条件，检验模型、单位和百分数的整体。']},
  {grade:6,title:'六年级 · Primary 6',intro:'用比、字母和百分数表达关系，综合分数除法、圆、体积和平均数，解释解题过程。',prerequisite:'分数乘法、百分数、单位率、三角形面积和长方体体积。',targets:['掌握分数除法、整数比、简单代数、圆和平均数。','在多种表示之间转换，计算百分数变化和未知量。','综合条件逆向求解，用代入、估算和不同方法检验。']}
]);
function unit(grade,key,title,en,strand,scope,prerequisite,knowledge,example,templates,questionIds=[]){
  return guideUnit({id:`p${grade}-${key}`,grade,title,en,strand,scope,prerequisite,knowledge,example,templateIds:templates,questionIds});
}
export const UNITS = Object.freeze([
  unit(1,'numbers','数数与位值','Numbers up to 100','number','100以内；十位、个位、比较、数列和第1至第10的序数。','能按顺序数物体。',['10个一可以换成1个十。','数的位置决定它表示的数量；排第几与一共有几个不同。'],'4捆各10根，加7根散棒，就是47根。',['number.place','number.compare','number.sequence'],['pm-02','pm-03','pm-04','pm-07']),
  unit(1,'add','加减与数量关系','Addition and Subtraction','number','100以内加减；20以内心算；理解加减互逆。','十位、个位和整体的一部分。',['合起来求和，拿走或比较求差。','整体减去已知部分，可以找到缺少的部分。'],'10个位置已有6粒种子，空位是10−6=4。',['integer.add','integer.subtract','integer.missing'],['pm-01','pm-05','pm-06','pm-08']),
  unit(1,'groups','相同小组与平均分','Multiplication and Division','number','乘法概念，积在40以内；平均分，被除数在20以内。','会重复相加和一一配对。',['几个相同的数相加，可以用乘法表示。','平均分要求每组一样多。'],'3盘各4粒种子，一共有3×4=12粒。',['integer.multiply','integer.divide','word.groups']),
  unit(1,'money','认识钱币','Money','number','以分计数到1新元；以新元计数到100新元。','100以内数数。',['1新元等于100分。','先确认是在数新元还是分，再合并同单位的钱币。'],'20分、20分、10分合起来是50分。',['sg.money-count']),
  unit(1,'length','用厘米量长度','Length in centimetres','measurement','厘米cm；读尺、比较、画整厘米线段。','比较长短，会读数。',['测量从尺子的0开始。','末端刻度与起点刻度之差才是长度。'],'从2厘米刻度到7厘米刻度，长5厘米。',['sg.length']),
  unit(1,'time','认识钟面','Time to 5 minutes','measurement','读时刻到5分钟；上午下午；1小时与半小时。','会按5递增数数。',['分针转一圈是60分钟，时针走1小时。','钟面每个大格表示5分钟。'],'分针指向3，表示这一小时已经过15分钟。',['sg.clock']),
  unit(1,'shapes','认识与拼合平面图形','2D Shapes','measurement','长方形、正方形、三角形、圆、半圆、四分之一圆；网格临摹。','能观察边和曲线。',['图形可以通过边和角来辨认。','拼合图形时，先找出其中的小图形。'],'正方形有4条一样长的边和4个直角。',['sg.shape2d']),
  unit(1,'data','读懂象形统计图','Picture Graphs','statistics','一幅图代表一个对象的象形图。','会数数和比较。',['先看图例，再数每一行的图标。','比较数量时，要比较代表的实际人数。'],'苹果一行有6个图标，每个代表1个苹果，共6个。',['sg.picture']),

  unit(2,'numbers','三位数与奇偶','Numbers up to 1000','number','1000以内；百十个位、比较、数列、奇数和偶数。','十位、个位和100以内数。',['10个十是1个百。','可以两两配对且没有剩余的整数是偶数。'],'305表示3个百、0个十和5个一。',['number.place','number.compare','number.sequence','sg.parity']),
  unit(2,'add','三位数加减','Addition and Subtraction','number','最多三位数的加减算法及加减一、十、百的心算。','会按数位计算两位数。',['满十进一，不够减时向前一位换十。','相同数位上的数量才能相加减。'],'36+7可以把36换成3个十和6个一，再合并。',['integer.add','integer.subtract','integer.missing'],['pm-09','pm-10']),
  unit(2,'tables','乘法表与除法','Tables of 2, 3, 4, 5 and 10','number','2、3、4、5、10乘法表及相应除法。','相同小组和平均分。',['乘法与除法互逆。','总数÷组数得到每组的数量。'],'4×5=20，所以20÷5=4。',['integer.multiply','integer.divide','word.groups'],['pm-11','pm-12']),
  unit(2,'fractions','整体的一部分','Fractions of a Whole','number','分母不超过12；单位分数、同分母比较与一个整体内的同分母加减。','理解平均分。',['分母说明整体被平均分成几份。','同分母相加减时，只改变取的份数。'],'同一条纸带的2/7加3/7，合起来是5/7。',['sg.fraction-read','fraction.compare','fraction.add-like','fraction.subtract']),
  unit(2,'money','新元与分的表示','Dollars and Cents','number','钱币小数表示、比较、转换为分；不提前引入一般小数运算。','认识钱币与百以内数。',['钱币的小数点后两位表示分。','比较钱数时，把单位统一。'],'2新元35分可以写成2.35新元，也就是235分。',['sg.money-cents']),
  unit(2,'measure','米、质量与液体量','Length, Mass and Liquid Volume','measurement','米m、千克kg、克g、升ℓ；选单位、读测量值和比较。','厘米与长短比较。',['选单位要与测量的对象相配。','长度、质量、液体量描述不同的性质。'],'饮用水可以用升表示，书包的质量可以用千克表示。',['sg.measure-unit']),
  unit(2,'time','分钟与经过的时间','Time in hours and minutes','measurement','时刻精确到分钟；时分长度及双向换算。','认识钟面和60分钟。',['1小时等于60分钟。','时刻说明什么时候，时长说明经过多久。'],'1小时25分钟等于60+25=85分钟。',['sg.clock','measure.duration'],['pm-15']),
  unit(2,'shapes','图形规律与立体形状','Shape Patterns and 3D Shapes','measurement','平面图形的大小、方向、颜色规律；立方体、长方体、圆锥、圆柱、球。','认识基本平面图形。',['立体形状可以从面和曲面辨认。','描述规律时，说清哪些特征改变、哪些保持。'],'球表面是曲面；立方体有6个正方形面。',['sg.shape3d']),
  unit(2,'data','带图例的象形图','Picture Graphs with Scales','statistics','读图例比例并解释象形图。','认识一图一物的统计图。',['一个图标可以表示多个对象。','把图标数乘图例中的数量，得到实际总数。'],'每颗星代表5人，4颗星代表20人。',['sg.picture'],['pm-16']),

  unit(3,'numbers','四位数与乘除','Numbers up to 10000 and Operations','number','四位数加减；6—9乘法表；三位数乘除一位数和余数。','三位数和基础乘法表。',['除法的余数一定小于除数。','用商×除数+余数检验被除数。'],'29÷4商7余1，因为4×7+1=29。',['number.place','integer.add','integer.subtract','integer.multiply','integer.divide','integer.remainder'],['pm-13','pm-24']),
  unit(3,'fractions','等值、约分与相关分母','Equivalent and Related Fractions','number','等值与最简分数；分母≤12；比较；一个整体内相关分母的加减。','整体的等分和同分母分数。',['同时改变分子和分母的倍数，大小可以不变。','相关分母中，一个分母是另一个的倍数。'],'1/3=2/6，所以1/3+1/6=3/6=1/2。',['fraction.simplify','fraction.equivalent','fraction.compare','fraction.add','fraction.subtract'],['pm-17','pm-34']),
  unit(3,'money','购物与找零','Money in Decimal Notation','number','以钱币小数表示进行加减。','新元、分及对应的小数表示。',['新元与新元相减，分与分相减。','找零等于付款减去花费。'],'付10新元，花3.45新元，找回6.55新元。',['word.change','decimal.add','decimal.subtract'],['pm-14','pm-21']),
  unit(3,'measure','复合单位与换算','Compound Units','measurement','km/m、m/cm、kg/g、ℓ/ml；复合单位与较小单位互换。','常用测量单位。',['先把较大单位换成较小单位，再合并。','1米是100厘米；1升是1000毫升。'],'2米35厘米等于235厘米。',['measure.length','measure.mass','sg.liquid'],['pm-20']),
  unit(3,'time','时间线与24小时制','Time and the 24-hour Clock','measurement','秒；由起点、终点、时长中的两个求第三个；24小时制。','时分换算。',['把起止时刻画在同一条时间线上。','经过整点时，可以分成两段计算。'],'14:40到15:10，经过20+10=30分钟。',['measure.elapsed','measure.duration'],['pm-18','pm-19']),
  unit(3,'area','周长与面积','Area and Perimeter','measurement','直线边图形周长；长方形、正方形面积；cm²与m²，不做二者换算。','长度和乘法。',['周长是边界总长，面积是覆盖的大小。','长方形面积等于每行格数乘行数。'],'长6厘米宽4厘米，周长20厘米、面积24平方厘米。',['geometry.perimeter','geometry.rectangle']),
  unit(3,'geometry','直角、垂直与平行','Angles, Perpendicular and Parallel Lines','measurement','辨认直角及较大、较小角；垂直与平行；画对应线。','平面图形和直线。',['直角可用直角模板比较。','垂直相交成直角；平行线在同一平面内不会相交。'],'长方形相邻的两条边互相垂直。',['sg.lines']),
  unit(3,'data','条形图与刻度','Bar Graphs','statistics','读取条形图，使用不同纵轴刻度。','有比例图例的象形图。',['先确定每格代表多少。','柱子的高度按刻度读，不能只数格子。'],'每格表示4本书，5格高的柱子表示20本。',['sg.bar'],['pm-29']),

  unit(4,'whole','大数、因数与运算','Whole Numbers and Factors','number','100000以内；取近似值；因数倍数；四位×一位、三位×两位、四位÷一位。','四位数及三位数乘除。',['因数可以把一个数整除。','近似数与精确数有不同用途。'],'24的因数有1、2、3、4、6、8、12、24。',['number.place','number.round','integer.multiply','integer.divide','sg.factors'],['pm-26','pm-31','pm-35','pm-36']),
  unit(4,'fractions','带分数与分数加减','Mixed Numbers and Fraction Operations','number','带分数与假分数；一组物品的分数；分母≤12、最多两种分母的加减。','等值分数和通分。',['假分数可以表示一个或更多整体。','找一组物品的几分之几，先平均分，再取若干份。'],'1又1/4等于5/4；1/4+1/6=5/12。',['sg.mixed-fraction','fraction.add','fraction.subtract','fraction.quantity'],['pm-33']),
  unit(4,'decimals','小数位值与运算','Decimals up to 3 Decimal Places','number','认识三位小数；加减和乘除一位整数使用最多两位小数；指定精度。','十进位和分数表示。',['十分位、百分位、千分位表示越来越小的单位。','计算加减时按小数点对齐。'],'3.75+2.60=6.35；0.375有375个千分之一。',['sg.decimal-place','decimal.add','decimal.subtract','decimal.multiply','decimal.divide'],['pm-25','pm-28']),
  unit(4,'area','组合面积与未知边','Composite Rectangles and Squares','measurement','由面积、周长倒推边长；组合长方形和正方形的面积与周长。','长方形面积与周长。',['组合图形可以分块，也可以补成大图后减去缺块。','求周长时只数外边界。'],'长方形面积36平方厘米、宽4厘米，长是9厘米。',['geometry.rectangle','geometry.perimeter','sg.composite-area']),
  unit(4,'angles','量角与图形性质','Measuring Angles, Rectangles and Squares','measurement','角的命名、测量和作图；长方形与正方形性质，不含对角线性质。','直角、垂直和平行。',['角的大小由两边张开程度决定。','量角器的0线对齐一边，顶点对齐中心。'],'正方形的每个内角都是90°。',['sg.measure-angle']),
  unit(4,'symmetry','轴对称','Line Symmetry','measurement','辨认对称图形与对称轴，在方格纸上补全图形。','图形、网格和直线。',['对应点到对称轴的距离相等。','对折后重合的两部分互为镜像。'],'一点在竖直对称轴左边3格，对应点在右边3格。',['sg.symmetry']),
  unit(4,'nets','立体表示与展开图','Nets and 2D Representations','measurement','立方体、长方体、圆锥、圆柱、棱柱、棱锥的二维表示；立方体、长方体、棱柱、棱锥的展开图。','辨认平面和立体形状。',['展开图保留各个面之间的连接关系。','判断能否折成形状时，要留意重叠和缺少的面。'],'立方体由6个正方形面围成。',['sg.nets']),
  unit(4,'data','表格、折线图与饼图','Tables, Line Graphs and Pie Charts','statistics','补全表格，读取折线图和饼图；不提前要求用扇形角计算百分比。','条形图和分数。',['折线图展示数据随时间的变化。','饼图用整体中的部分表示分类数量。'],'一个饼图四等份中有一份表示步行，步行人数占1/4。',['sg.charts'],['pm-40']),

  unit(5,'whole','大数与运算顺序','Whole Numbers up to 10 Million','number','千万以内读写；乘除10、100、1000及其倍数；四则顺序和括号。','整数四则与位值。',['括号改变计算的先后。','没有括号时，先乘除再加减。'],'6+4×3=18，而(6+4)×3=30。',['number.place','integer.mixed','integer.parentheses'],['pm-27']),
  unit(5,'fractions','分数、除法与乘法','Fractions and Multiplication','number','分数作为除法商；转小数；带分数加减；真、假分数与整数或分数相乘。','分数加减和整体。',['a÷b可以写成a/b。','一个量的几分之几，可以用分数乘法表示。'],'3/4的2/3是3/4×2/3=1/2。',['fraction.multiply','fraction.quantity','fraction.add','fraction.subtract']),
  unit(5,'decimals','小数缩放与单位换算','Decimals and Powers of Ten','number','最多三位小数乘除10、100、1000及其倍数；测量单位的小数表示。','小数位值和单位换算。',['乘10改变每个数字的位值。','换单位改变数值的写法，不改变实际大小。'],'1.25米等于125厘米。',['decimal.scale','measure.length','measure.mass','sg.liquid']),
  unit(5,'percent','百分数与购物','Percentage','number','部分与整体百分比；百分数部分；折扣、消费税和年利息。','分数、小数和整体。',['百分数说明每100份中的份数。','折扣额和折后价是两个不同的量。'],'原价80新元，优惠25%，省20新元，现价60新元。',['percent.convert','percent.quantity','percent.discount']),
  unit(5,'rate','每一单位有多少','Rate','number','单位率、总量、单位数，已知其中两个求第三个。','乘除、小数和单位。',['单位率是每一单位对应的数量。','计算前同时看清两个量的单位。'],'每千克4新元，2.5千克需要10新元。',['sg.rate'],['pm-37','pm-39']),
  unit(5,'area','三角形与组合面积','Area of Triangle','measurement','对应底与高；三角形面积；长方形、正方形与三角形的组合面积。','长方形面积和垂直。',['高与所选的底垂直。','三角形面积是同底同高长方形面积的一半。'],'底8厘米、高5厘米，面积8×5÷2=20平方厘米。',['geometry.triangle']),
  unit(5,'volume','立方体与长方体体积','Volume of Cube and Cuboid','measurement','单位立方体、cm³/m³、等角网格；容器液体；1ml=1cm³，不做cm³/m³换算。','面积和长度单位。',['体积可以用每层块数乘层数。','1毫升液体的体积等于1立方厘米。'],'长5、宽4、高3厘米，体积是60立方厘米。',['geometry.volume']),
  unit(5,'geometry','角与特殊图形','Angles and Special Shapes','measurement','直线角、周角、对顶角；三角形内角和；平行四边形、菱形、梯形性质。','测角和长方形性质。',['直线上的角合起来是180°，一点周围是360°。','三角形三个内角的和是180°。'],'三角形已有50°和60°，第三个角是70°。',['geometry.angle','sg.angle-relations']),

  unit(6,'fractions','分数除法','Division of Fractions','number','真分数除整数；整数或真分数除真分数，不使用计算器。','分数乘法和平均分。',['除以分数可以理解为数出包含多少份。','用除数乘商检查结果。'],'3/4中有3个1/4，所以3/4÷1/4=3。',['fraction.divide'],['pm-41']),
  unit(6,'percent','找整体与百分数变化','Percentage Change','number','已知部分和百分比求整体；增加、减少百分比。','百分数部分和整体。',['先确认百分数对应的整体。','增加或减少的百分比以原数量为基准。'],'完成量24是计划的40%，原计划为24÷40%=60。',['sg.percent-whole','sg.percent-change'],['pm-44','pm-45']),
  unit(6,'ratio','按比表示与分配','Ratio','number','整数a:b和a:b:c；等值与最简比；按比分配；比与分数，不含小数、分数比。','分数、因数与平均分。',['比说明几个量之间的相对份数。','总份数决定每一份有多少。'],'红蓝之比2:3，共20枚；每份4枚，红8枚。',['sg.ratio'],['pm-42','pm-43']),
  unit(6,'algebra','用字母表示关系','Algebra','number','简单无括号一次表达式、代入求值、整数系数一次方程。','未知数、四则顺序。',['字母可以表示一个未知量。','代入后，按运算顺序计算；解方程保持等号两边相等。'],'3a+5=20，所以a=5；代回得到20。',['sg.algebra'],['pm-38']),
  unit(6,'circle','圆与组合图形','Circle Area and Circumference','measurement','圆周长与面积；半圆、四分之一圆；组合面积与周长。','面积周长、分数和乘法。',['直径是半径的2倍。','半圆的周长还包括一条直径。'],'取π=3.14，半径5厘米的圆面积是78.5平方厘米。',['sg.circle']),
  unit(6,'volume','由体积倒推尺寸','Unknown Dimensions of Cuboids','measurement','由体积求长宽高、底面积或立方体棱长；平方、立方记号。','长方体体积。',['体积等于底面积乘高。','总量与部分量反推时，要保持单位一致。'],'体积120立方厘米，底面积20平方厘米，高6厘米。',['sg.volume-unknown']),
  unit(6,'geometry','组合图形的角','Angles in Composite Figures','measurement','组合三角形与特殊四边形求未知角，不额外作辅助线。','三角形内角和、平行和对顶角。',['先找出已知的直角、直线角和图形关系。','把大图分成能直接使用性质的小图形。'],'长方形的直角被分成35°和一个未知角，未知角是55°。',['sg.angle-relations']),
  unit(6,'average','平均数与总量','Average of a Set of Data','statistics','平均数=总和÷个数；三者的相互关系。','加法和除法。',['平均数说明把总量平均分后的大小。','合并数据时，要先合并总量与个数。'],'4次平均8分，总分32分；已知3次共22分，另一次10分。',['data.mean'],['pm-30','pm-47'])
]);
export function getUnit(grade,id){return UNITS.find(u=>u.grade===grade&&u.id===id);}
export function unitsForGrade(grade){return UNITS.filter(u=>u.grade===grade);}
export function practiceLimit(unit,templateId='all'){
  const pools={'sg.shape2d':6,'sg.measure-unit':4,'sg.shape3d':4,'sg.lines':2,'sg.nets':4};
  const ids=templateId==='all'?unit.templateIds:[templateId];
  return ids.every(id=>pools[id])?ids.reduce((sum,id)=>sum+pools[id],0):500;
}
export function curriculumContext(value){
  if(!value||value.version!==CURRICULUM_VERSION||!Number.isInteger(value.grade)||!getUnit(value.grade,value.unitId))throw Error('年级、知识点或课程版本无效');
  return {version:CURRICULUM_VERSION,grade:value.grade,unitId:value.unitId};
}
const extraRows=[
  ['money-count','数钱币','word'],['length','量厘米线段','measurement'],['clock','读钟面','measurement'],['shape2d','辨认平面图形','geometry'],['picture','象形统计图','data'],['parity','奇数与偶数','numbers'],['fraction-read','读整体的分数','fractions'],['money-cents','新元与分','word'],['measure-unit','选择测量单位','measurement'],['shape3d','辨认立体形状','geometry'],['liquid','升与毫升','measurement'],['lines','垂直与平行','geometry'],['bar','读取条形图','data'],['factors','因数与倍数','numbers'],['mixed-fraction','带分数与假分数','fractions'],['decimal-place','小数位值','decimals'],['composite-area','组合面积与未知边','geometry'],['measure-angle','角的大小','geometry'],['symmetry','方格纸上的对称','geometry'],['nets','立体图形的面','geometry'],['charts','折线图与饼图','data'],['rate','单位率','word'],['angle-relations','角之间的关系','geometry'],['percent-whole','百分数求整体','percent'],['percent-change','百分数变化','percent'],['ratio','按比分配','percent'],['algebra','字母与方程','arithmetic'],['circle','圆周长与面积','geometry'],['volume-unknown','体积反求尺寸','geometry']
];
export const CURRICULUM_TEMPLATES=Object.freeze(extraRows.map(([id,title,topic])=>({id:`sg.${id}`,title,topic,reference:'sg-syllabus',difficulties:[1,2,3]})));
export const FOUNDATION = Object.freeze({
  5: ['整数与运算顺序、因数倍数','等值分数、带分数、分数加减和乘法','三位小数与10、100、1000的缩放，测量换算','单位率、时分与24小时制','长方形组合面积周长，单位立方体与立体表示','垂直平行、角的关系、长方形正方形；表格、条形图、折线图'],
  6: ['分数作为除法商、分数除法及小数乘除','百分数、折扣、消费税及部分与整体','三角形面积与组合面积，长方体体积、容量和未知高','三角形、长方形和正方形的角；饼图与平均数']
});
