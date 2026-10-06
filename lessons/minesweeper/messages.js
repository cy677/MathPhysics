/* Translate user-visible upstream messages as complete phrases, preserving numbers. MIT. */
const exact = new Map([
  ['Welcome to minesweeper solver dedicated to Annie','欢迎来到逻辑乐园。'],
  ["The solver is not running. Press the 'Analyse' button to see the solver's suggested move.",'可以自己继续推理；需要帮助时，展开“高级玩法与求解”，点“分析当前局面”。'],
  ["Press the 'Analyse' button to see the solver's suggested move.",'需要帮助时，展开“高级玩法与求解”，点“分析当前局面”。'],
  ["Press 'Analyse' for advanced guessing",'需要比较猜测时，点“高级玩法与求解”中的“分析当前局面”。'],
  ['Analysing...','正在分析局面…'],['Thinking...','正在推理…'],
  ['Replay game requested','正在重玩同一盘，雷的位置保持不变。'],['No game to replay','先翻开第一格，再重玩同一盘。'],
  ['No mines left to find, all the remaining tiles are safe','雷都找到了，剩下的格子全部安全。'],
  ['No safe tiles left to find, all the remaining tiles are mines','安全格都找到了，剩下的格子全部是雷。'],
  ['Only mines remain.','剩下的格子全部是雷。'],
  ['The probability engine is unable to run.','当前局面无法计算概率，请检查数字与雷数。'],
  ['The board is in an invalid state','局面的数字、旗帜或总雷数互相矛盾，请检查后再分析。'],
  ['The probability engine has found some safe tiles.','概率分析找到了确定安全的格子。'],
  ['Found the safest guess using the probability engine.','概率分析找到了最安全的猜测，仍不能保证安全。'],
  ['The best guess is off the edge.','建议在数字线索边缘以外的隐藏格中选择；这仍是猜测。'],
  ["Can't reduce mines to find to below zero when the mine count is locked",'总雷数已锁定，剩余雷数不能小于零。'],
  ['Mines left must be zero in order to download the board from Analysis mode.','分析模式导出完整雷区前，需把所有雷的位置标出，使剩余雷数为零。'],
  ['No game data available to convert to an MBF file','还没有完整雷区可导出，请先翻开第一格。'],
  ['Switch to analysis mode before loading the replay','导入复盘前，请先切换到“局面分析”。'],
  ['Unable to continue','无法继续当前步骤，请检查局面或开始新局。'],
  ['Hard Core: Game is lost because you guessed (by chording) when there were safe tiles!','严格推理挑战结束：已有确定安全格时，用连开进行了猜测。'],
  ['Hard Core: Game is lost because you guessed when there were safe tiles!','严格推理挑战结束：已有确定安全格时进行了猜测。']
]);
const coordinate = String.raw`\((\d+),(\d+)\)`;
const patterns = [
  [/^New game requested with width (\d+), height (\d+) and (\d+) mines\.$/,'新棋盘：$1 × $2，$3 颗雷。'],
  [/^The game has been (won|lost)\. 3BV: (.+),  Actions: (.+),  Efficiency: (.+)$/,(m,result,bv,actions,efficiency)=>`${result==='won'?'成功通关':'碰到雷了'}。3BV：${bv}，操作 ${actions} 次，效率 ${efficiency}。`],
  [/^Found (\d+) trivial safe moves$/,'找到了 $1 个确定安全的简单步骤。'],
  [/^Found (\d+) safe tiles\.$/,'找到了 $1 个确定安全的格子。'],
  [/^Found (\d+) 3BV safe tiles$/,'找到了 $1 个 3BV 安全格。'],
  [/^The board is valid\. (\d+) Mines placed\. There are (no safe tiles|safe tile\(s\))\. $/,(m,count,kind)=>`局面有效，已插旗 ${count} 面。${kind==='no safe tiles'?'目前没有确定安全格。':'存在确定安全格。'}`],
  [/^The board is in an invalid state\. Tile (.+) is invalid\.$/,'局面有矛盾，请检查格 $1 的数字。'],
  [/^The board is in an invalid state\. (.+)$/,'局面有矛盾：$1'],
  [/^Not enough mines left to complete the board\.$/,'剩余雷数不足，无法满足所有数字。'],
  [/^(\d+) mines left is not enough (?:mines left )?to complete the board[.?]$/,'剩余 $1 颗雷不足以满足当前局面。'],
  [/^(\d+) mines left is too many to place on the board\?$/,'剩余 $1 颗雷多于可放置的隐藏格。'],
  [/^Too many floating tiles to calculate the Binomial Coefficient, max permitted is (\d+)$/,'未约束的格子过多，当前计算上限是 $1 格。'],
  [/^Tiles (.+) and (.+) are contradictory\.$/,'格 $1 与格 $2 的数字互相矛盾。'],
  [/^Tile (.+) value '(\d+)' is too small\? Or a neighbour too large\?$/,'格 $1 的数字 $2 偏小，或相邻数字偏大。'],
  [/^Tile (.+) value '(\d+)' is too large\? Or a neighbour too small\?$/,'格 $1 的数字 $2 偏大，或相邻数字偏小。'],
  [/^Problem near (.+)\?$/,'请检查格 $1 附近的数字。'],
  [/^(?:Tile )?(.+) is an unavoidable 50\/50 guess(, or safe)?\.$/,(m,tile,safe)=>`格 ${tile} ${safe?'可能安全，也可能属于无法区分的 50/50 局面。':'属于无法区分的 50/50 局面，只能猜测。'}`],
  [/^Guessing heuristic suggests clearing tile (.+)\.$/,'猜测算法建议翻开格 $1；这仍有碰雷的风险。'],
  [/^Best follow up move is (.+) with ([\d.]+)% win rate\.$/,'后续建议选择格 $1，计算胜率为 $2%。'],
  [/^Tile (.+) has a ([\d.]+)% chance to win the game\.$/,'选择格 $1 的计算通关概率为 $2%。'],
  [/^Tile (.+) has a ([\d.]+)% chance to solve the isolated edge\.$/,'选择格 $1 的计算局部解出概率为 $2%。'],
  [/^All (?:the remaining tiles|tiles|the tiles on an isolated edge) are dead, try tile (.+)[.?]$/,'其余候选格都无法提供新线索，可尝试格 $1；这仍是猜测。'],
  [/^Determining the (\d+) solutions so they can be brute forced\.$/,'正在整理 $1 种布局，供完整搜索比较。'],
  [/^Brute force step (\d+) of (\d+)  considering tile (.+)\.(.*)$/,'完整搜索第 $1 / $2 步，正在比较格 $3。$4'],
  [/^ Current best is (.+) with ([\d.]+)% solve rate\.$/,' 当前最佳为格 $1，计算解出概率 $2%。'],
  [/^Advancing to step (\d+) of (\d+)$/,'复盘前进到第 $1 / $2 步。'],
  [/^Backwards to step (\d+) of (\d+)$/,'复盘退回到第 $1 / $2 步。'],
  [/^Total time: (.+), Next move thinking time: (.+)$/,'累计用时：$1，下一步思考时间：$2'],
  [/^Position loaded from file (.+)$/,'已载入局面文件：$1'],
  [/^File (.+) doesn't contain data for a whole board$/,'文件 $1 未包含完整雷区，请用“局面分析”导入已知数字。'],
  [/^(?:Game|Board) (\d+)x(\d+)\/(\d+) created from MBF file (.+)$/,'已从文件 $4 载入 $1 × $2 棋盘，共 $3 颗雷。'],
  [/^Game (\d+)x(\d+)\/(\d+) created from mine positions extracted from file (.+)$/,'已从文件 $4 的雷位置建立 $1 × $2 棋盘，共 $3 颗雷。'],
  [/^Replay for (\d+)x(\d+)\/(\d+) loaded from (.+)$/,'已从文件 $4 载入 $1 × $2 / $3 雷的复盘。']
];
function translatePhrase(text) {
  if (exact.has(text)) return exact.get(text);
  for (const [pattern,replacement] of patterns) if (pattern.test(text)) {
    const translated = text.replace(pattern,replacement);
    // Some upstream validation/search messages append a second complete phrase.
    return translated.replace(/(Not enough mines[^。]+\.|Tile [^。]+\?|Tiles [^。]+\.| Current best[^。]+\.)/g,phrase=>translatePhrase(phrase));
  }
  return text;
}
export function localizeMessage(input) {
  let text = String(input), tail = '';
  text = text.replace(/ Approximately (.+?) possible solutions remain\.$/,(_,count)=>{tail=` 仍有约 ${count} 种可能布局。`;return '';})
    .replace(/ ([\d,]+) possible solutions remain\.$/,(_,count)=>{tail=` 仍有 ${count} 种可能布局。`;return '';});
  return (translatePhrase(text)+tail).replace(new RegExp(coordinate,'g'),(_,x,y)=>`第 ${Number(y)+1} 行、第 ${Number(x)+1} 列`);
}
