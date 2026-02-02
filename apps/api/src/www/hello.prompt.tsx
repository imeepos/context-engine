import React from 'react';

interface HelloPromptProps {
  name?: string;
}

export function HelloPrompt({ name = 'World' }: HelloPromptProps) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>This is a prompt rendered from React component.</p>
      <ul>
        <li>Parameter received: {name}</li>
        <li>Rendered at: {new Date().toISOString()}</li>
      </ul>
    </div>
  );
}
