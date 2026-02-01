import React from 'react';
import { useState } from '../src/hooks/useState';
import { ReactiveBrowser } from '../src/browser/reactive-browser';
import { createInjector } from '@sker/core';

function Counter() {
  const [count, setCount] = useState(0);

  return React.createElement('div', {}, [
    React.createElement('text', { key: 'label' }, `Count: ${count}`),
    React.createElement('button', {
      key: 'btn',
      id: 'Increment',
      onClick: () => setCount(count + 1)
    }, 'Increment')
  ]);
}

// Create browser and page
const injector = createInjector([]);
const browser = new ReactiveBrowser(injector);
const page = browser.createReactivePage('/', Counter);

// Subscribe to render updates
page.onRender((result) => {
  console.log('Rendered:', result.prompt);
});

// Initial render
const result = page.render();
console.log('Initial:', result.prompt);

// Keep the event loop alive
page.keepAlive();

// Store the latest result
let latestResult = result;
page.onRender((newResult) => {
  latestResult = newResult;
});

// Simulate button click after 1 second
setTimeout(() => {
  const executor = latestResult.executors.get('Increment');
  if (executor) {
    console.log('Clicking button...');
    executor();
  }
}, 1000);

// Simulate another click after 2 seconds
setTimeout(() => {
  const executor = latestResult.executors.get('Increment');
  if (executor) {
    console.log('Clicking button again...');
    executor();
  }
}, 2000);

// Clean up after 5 seconds
setTimeout(() => {
  console.log('Disposing...');
  page.dispose();
  process.exit(0);
}, 5000);
