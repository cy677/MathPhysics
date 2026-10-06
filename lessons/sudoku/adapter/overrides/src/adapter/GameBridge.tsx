import React,{useEffect,useRef} from 'react';
import {useGame} from 'src/context/GameContext';
import {useSudoku} from 'src/context/SudokuContext';
import {cellsToSimpleSudoku} from 'src/lib/engine/utility';
import {solve} from 'src/lib/engine/solverAC3';

/** Host messages restart the active puzzle through the same reducers as the UI. */
export function GameBridge(){
 const game=useGame(),sudoku=useSudoku();const current=useRef({game,sudoku});current.current={game,sudoku};
 useEffect(()=>{const reset=(event:MessageEvent)=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='mp-reset')return;const {game,sudoku}=current.current;const givens=cellsToSimpleSudoku(sudoku.state.current);const result=solve(givens);if(!result.sudoku)return;sudoku.setSudoku(givens,result.sudoku);game.resetGame();game.deactivateNotesMode();game.hideMenu();};window.addEventListener('message',reset);return()=>window.removeEventListener('message',reset);},[]);
 useEffect(()=>{const snapshot=()=>JSON.stringify({collection:game.state.sudokuCollectionName,index:game.state.sudokuIndex,status:game.state.state,won:game.state.won,seconds:game.state.secondsPlayed,notesMode:game.state.notesMode,activeCell:game.state.activeCellCoordinates,historyIndex:sudoku.state.historyIndex,historyLength:sudoku.state.history.length,cells:sudoku.state.current});(window as any).render_game_to_text=snapshot;return()=>{if((window as any).render_game_to_text===snapshot)delete (window as any).render_game_to_text;};},[game.state,sudoku.state]);
 return null;
}
