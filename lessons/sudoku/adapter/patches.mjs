/* Strict source adaptations run only on the temporary build checkout. */
import fs from 'node:fs';
import path from 'node:path';
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
function replace(code,before,after,name){if(!code.includes(before))throw new Error('Upstream adaptation no longer matches '+name);return code.replace(before,after);}
export function adapt(stage){
 const storageKeys={
  'super_sudoku_1_4_use_this_file_if_you_want_to_cheat':'mathphysics.sudoku.legacy1_4',
  'super_sudoku_1_5_use_this_file_if_you_want_to_cheat':'mathphysics.sudoku.legacy1_5',
  'super_sudoku_1_6_':'mathphysics.sudoku.played.',
  'super_sudoku_currently_playing_sudoku':'mathphysics.sudoku.current',
  'super_sudoku_collections_sudokus_':'mathphysics.sudoku.collections.sudokus.',
  'super_sudoku_collections_names_':'mathphysics.sudoku.collections.names.',
  'super-sudoku-user-preferences':'mathphysics.sudoku.preferences',
 };
 for(const file of files(path.join(stage,'src')).filter(file=>/\.(?:ts|tsx)$/.test(file))){
  let code=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
  for(const [before,after] of Object.entries(storageKeys))code=code.replaceAll(before,after);
  code=code.replaceAll('getItem("language")','getItem("mathphysics.sudoku.language")').replaceAll('setItem("language",','setItem("mathphysics.sudoku.language",');
  code=code.replaceAll('getItem("darkMode")','getItem("mathphysics.sudoku.darkMode")').replaceAll('setItem("darkMode",','setItem("mathphysics.sudoku.darkMode",');
  if(/\blocalStorage\b/.test(code))code='import {sudokuStorage as localStorage} from "src/adapter/storage";\n'+code;
  code=code.replaceAll('from "lodash"','from "lodash-es"');
  if(file.endsWith(path.join('src','i18n.ts'))){
   code=replace(code,'const browserLang = navigator.language.split("-")[0].toLowerCase();\n  const supportedLang = Object.values(Language).find((lang) => lang === browserLang);\n  return supportedLang || Language.EN;', 'return Language.ZH;','default classroom language');
  }
  if(file.endsWith(path.join('lib','game','sudokus.ts'))){
   code=replace(code,'const rawLines = collection.sudokusRaw.split("\\n");','const rawLines = collection.sudokusRaw.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);','Windows puzzle bank lines');
  }
  if(file.endsWith(path.join('src','index.tsx'))){
   code='import "./adapter/sessionStorage";\n'+code;
   code=replace(code,'import Root from "./Root";','import Root from "./Root";\nimport {ClassroomShell} from "./adapter/ClassroomShell";','root shell');
   code=replace(code,'root.render(<Root />);','root.render(<ClassroomShell><Root /></ClassroomShell>);','root render');
  }
  if(file.endsWith(path.join('components','sudoku','SudokuMenuNumbers.tsx'))){
   code=replace(code,'grid w-full overflow-hidden justify-center gap-2 md:grid-cols-3 grid-cols-9','sudoku-number-pad','number pad');
   code=replace(code,'  notesMode: boolean;','  disabled?: boolean;\n  notesMode: boolean;','number pad disabled prop');
   code=replace(code,'  notesMode,','  disabled = false,\n  notesMode,','number pad disabled');
   code=replace(code,'if (!activeCell) {','if (!activeCell || disabled) {','number pad guard');
   code=replace(code,'aria-label={`Set ${n}`}','aria-label={`${notesMode ? "笔记" : "填写"} ${n}`}\n            disabled={disabled || !activeCell}','number pad target');
   code=replace(code,'[...userNotes, n]','[...startingNotes, n]','preserve automatic note candidates');
  }
  if(file.endsWith(path.join('components','sudoku','SudokuGrid.tsx'))){
   code=replace(code,'aria-label={ariaLabel}','role="button"\n        tabIndex={active ? 0 : -1}\n        onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onClick();}}}\n        aria-label={ariaLabel}','accessible grid selection');
  }
  if(file.endsWith(path.join('components','sudoku','Sudoku.tsx'))){
   code=replace(code,'import {useElementWidth} from "src/utils/hooks";','','square board without first-frame collapse');
   code=replace(code,'const containerWidth = useElementWidth(sudokuContainerRef);','','board aspect ratio');
   code=replace(code,'style={{height: containerWidth}}','style={{aspectRatio: "1 / 1"}}','stable square board');
  }
  if(file.endsWith(path.join('context','SudokuContext.tsx'))){
   code=replace(code,'const {x, y} = action.cellCoordinates;','const {x, y} = action.cellCoordinates;\n      if (state.current.find(cell => cell.x === x && cell.y === y)?.initial) return state;','given-number history guard');
   code=replace(code,'const newHistory = [newGrid, ...state.history];','const newHistory = [newGrid, ...state.history.slice(state.historyIndex)];','discard redo branch after editing');
  }
  if(file.endsWith(path.join('lib','database','userPreferences.ts')))code=replace(code,'showCircleMenu: true','showCircleMenu: false','default touch menu');
  if(file.endsWith(path.join('pages','Game.tsx'))){
   code=replace(code,'import SudokuMenuControls from "src/components/sudoku/SudokuMenuControls";','import SudokuMenuControls, {ModePicker} from "src/components/sudoku/SudokuMenuControls";\nimport {GameBridge} from "src/adapter/GameBridge";','touch controls imports');
   code=replace(code,'        <Shortcuts','        <GameBridge />\n        <Shortcuts','host reset bridge');
   const headerStart=code.indexOf('        <header className="flex justify-between sm:items-center mt-4">'),headerEnd=code.indexOf('        </header>',headerStart);
   if(headerStart<0||headerEnd<0)throw new Error('Upstream game header changed');
   code=code.slice(0,headerStart)+`        <header className="sudoku-game-header">
          <div className="sudoku-heading"><h1>{t("super_sudoku")}</h1><div className="sudoku-game-meta"><DifficultyShow data-testid="current-game-label">{collectionName} #{game.sudokuIndex + 1}</DifficultyShow><GameTimer /></div></div>
          <div className="sudoku-toolbar"><LanguageSelector /><DarkModeButton /><ShareButton gameState={game} sudokuState={sudokuState} /><PauseButton disabled={game.won} paused={pausedGame} continueGame={continueGame} pauseGame={pauseGame} /><NewGameButton /><ClearGameButton pauseGame={pauseGame} continueGame={continueGame} disabled={false} clearGame={()=>{const givens=cellsToSimpleSudoku(sudokuState.current);const solved=solve(givens);if(solved.sudoku)setSudoku(givens,solved.sudoku);resetGame();deactivateNotesMode();hideMenu();}} /></div>
        </header>`+code.slice(headerEnd+'        </header>'.length);
   code=replace(code,'<div className="flex gap-4 flex-col md:flex-row">','<div className="sudoku-play-layout">','game layout');
   code=replace(code,'<main className="mt-4 flex-grow md:min-w-96 w-full">','<main className="sudoku-board-panel">','board panel');
   code=replace(code,'<div className="grid gap-4 mt-4">\n            <SudokuMenuNumbers','<div className="sudoku-control-panel">\n            <ModePicker notesMode={game.notesMode} activateNotesMode={activateNotesMode} deactivateNotesMode={deactivateNotesMode} />\n            <p className="sudoku-selection" role="status">{activeCell ? activeCell.initial ? t("mp_locked") : t("mp_selected",{row:activeCell.y+1,column:activeCell.x+1}) : t("mp_select")}</p>\n            <SudokuMenuNumbers\n              disabled={pausedGame || game.won || !!activeCell?.initial}','control panel');
   code=replace(code,'activeCellCoordinates={game.activeCellCoordinates ?? {x: 0, y: 0}}','activeCellCoordinates={game.activeCellCoordinates}\n              disabled={pausedGame || game.won}\n              locked={!!activeCell?.initial}\n              canRedo={sudokuState.historyIndex > 0}\n              redo={redo}','undo redo input guards');
   code=replace(code,'<SettingsAndInformation />','<details className="sudoku-settings"><summary>{t("settings")} · {t("shortcuts")}</summary><SettingsAndInformation /></details>','fold settings');
   code=replace(code,'history: [currentSudoku.sudoku],','history: currentSudoku.history || [currentSudoku.sudoku],','restore persisted undo history');
   code=replace(code,'historyIndex: 0,\n        current: currentSudoku.sudoku,','historyIndex: currentSudoku.historyIndex || 0,\n        current: currentSudoku.sudoku,','restore undo position');
   code=replace(code,'history: [storedSudoku.sudoku],','history: storedSudoku.history || [storedSudoku.sudoku],','restore chosen puzzle history');
   code=replace(code,'historyIndex: 0,\n      });','historyIndex: storedSudoku.historyIndex || 0,\n      });','restore chosen puzzle undo position');
   code=replace(code,'if (stringifySudoku(currentSudoku) === sudoku) {','if (stringifySudoku(currentSudoku) === sudoku) {\n      if (gameState.sudokuCollectionName !== sudokuCollectionName || gameState.sudokuIndex !== sudokuIndex - 1) setGameState({...gameState, sudokuCollectionName, sudokuIndex:sudokuIndex - 1});','same puzzle in a different collection');
   code=replace(code,'...storedSudoku.game,','...storedSudoku.game,\n        sudokuCollectionName, sudokuIndex:sudokuIndex - 1,','retain selected collection when restoring a duplicate puzzle');
   code=replace(code,'const [disableAutoSync, setDisableAutoSync] = React.useState(false);','const [disableAutoSync, setDisableAutoSync] = React.useState(false);\n  const latest = React.useRef({gameState,sudokuState}); latest.current={gameState,sudokuState};\n  React.useEffect(()=>{const flush=()=>{throttledSave.cancel();localStoragePlayedSudokuRepository.saveSudokuState(latest.current.gameState,latest.current.sudokuState);};window.addEventListener("pagehide",flush);return()=>{flush();window.removeEventListener("pagehide",flush);};},[]);','save final action when leaving');
  }
  if(file.endsWith(path.join('lib','database','playedSudokus.ts'))){
   code=replace(code,'import {GameState}','import {validateStoredPuzzle} from "src/adapter/validateStorage";\nimport {GameState}','stored state validation');
   code=replace(code,'  sudoku: Cell[];','  sudoku: Cell[];\n  history?: Cell[][];\n  historyIndex?: number;','stored undo history');
   code=replace(code,'const sudoku = JSON.parse(sudokuFromStorage) as StoredPlayedSudokuState;','let sudoku: StoredPlayedSudokuState;\n    try { sudoku = JSON.parse(sudokuFromStorage); } catch { return undefined; }\n    if (!validateStoredPuzzle(sudoku)) return undefined;','corrupted save guard');
   code=replace(code,'JSON.stringify({game, sudoku: sudoku.current})','JSON.stringify({game, sudoku: sudoku.current, history: sudoku.history.slice(0, Math.max(40, sudoku.historyIndex + 1)), historyIndex: sudoku.historyIndex})','persist bounded undo history');
  }
  if(file.endsWith(path.join('context','GameContext.tsx')))code=replace(code,'state: GameStateMachine.paused,\n  sudokuIndex: START_SUDOKU_INDEX,','state: GameStateMachine.running,\n  sudokuIndex: START_SUDOKU_INDEX,','start first puzzle immediately');
  if(file.endsWith(path.join('pages','Game','NewSudoku.tsx'))){
   code=replace(code,'import {EraseButton, UndoButton}','import {EraseButton, UndoButton, RedoButton}','creator redo import');
   code=replace(code,'import hotkeys from "hotkeys-js";','import hotkeys from "hotkeys-js";\nimport {useTranslation} from "react-i18next";','creator translations');
   code=replace(code,'const canUndo = sudokuState.history.length > 1;','const {t}=useTranslation();\n  const canUndo = sudokuState.historyIndex < sudokuState.history.length - 1;','creator undo state');
   code=replace(code,'<UndoButton canUndo={canUndo} undo={undo} />','<UndoButton canUndo={canUndo} undo={undo} /><RedoButton canRedo={sudokuState.historyIndex > 0} redo={redo} />','creator redo control');
   code=replace(code,'"This sudoku is not solvable."','t("mp_no_solution")','creator no solution');
   code=replace(code,'`Error checking uniqueness: ${error}`','t("mp_check_error")','creator worker error');
   code=replace(code,'"This sudoku is not unique. It has multiple solutions."','t("mp_multiple")','creator multiple solutions');
   code=replace(code,'isSaving ? "Saving..." : isChecking ? "Checking uniqueness..." : "Save sudoku"','isSaving ? t("mp_saving") : isChecking ? t("mp_checking") : t("mp_save")','creator save label');
  }
  fs.writeFileSync(file,code);
 }
 // The original public manifest also stays inside the local Sudoku directory.
 const publicManifest=path.join(stage,'public/site.webmanifest');
 const manifest=JSON.parse(fs.readFileSync(publicManifest,'utf8'));
 manifest.scope='./';manifest.start_url='./';
 for(const icon of manifest.icons||[])icon.src='./'+icon.src.replace(/^\//,'');
 fs.writeFileSync(publicManifest,JSON.stringify(manifest));
}
