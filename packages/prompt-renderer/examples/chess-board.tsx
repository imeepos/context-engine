import React from 'react';
import { renderToMarkdown } from '../src/reconciler/renderer';
import { createElement, createTextNode } from '../src/reconciler/dom';

// 象棋棋盘示例 - 演示表格布局功能
function createChessBoard() {
  const pieces = {
    black: ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    blackPawn: '♟',
    white: ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
    whitePawn: '♙',
    empty: '·'
  };

  const rows = [];

  // 第一行：黑方主力
  const row1 = createElement('tr', {},
    pieces.black.map(piece => createElement('td', {}, [createTextNode(piece)]))
  );
  rows.push(row1);

  // 第二行：黑方兵
  const row2 = createElement('tr', {},
    Array(8).fill(null).map(() => createElement('td', {}, [createTextNode(pieces.blackPawn)]))
  );
  rows.push(row2);

  // 中间四行：空格
  for (let i = 0; i < 4; i++) {
    const emptyRow = createElement('tr', {},
      Array(8).fill(null).map(() => createElement('td', {}, [createTextNode(pieces.empty)]))
    );
    rows.push(emptyRow);
  }

  // 第七行：白方兵
  const row7 = createElement('tr', {},
    Array(8).fill(null).map(() => createElement('td', {}, [createTextNode(pieces.whitePawn)]))
  );
  rows.push(row7);

  // 第八行：白方主力
  const row8 = createElement('tr', {},
    pieces.white.map(piece => createElement('td', {}, [createTextNode(piece)]))
  );
  rows.push(row8);

  return createElement('table', {}, rows);
}

// 生成并输出 Markdown
const chessBoard = createChessBoard();
const markdown = renderToMarkdown(chessBoard);

console.log('国际象棋棋盘 (Markdown 表格渲染):\n');
console.log(markdown);
