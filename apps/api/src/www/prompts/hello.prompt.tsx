import React from 'react';
import { Injectable } from '@sker/core';
import { Prompt } from '@sker/core';

interface HelloPromptProps {
  name?: string;
}

function HelloPromptComponent({ name = 'World' }: HelloPromptProps) {
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

@Injectable({ providedIn: 'root' })
export class HelloPromptService {
  @Prompt({
    name: 'hello',
    description: 'Generate a hello greeting prompt',
    arguments: [
      {
        name: 'name',
        description: 'Name to greet',
        required: false
      }
    ]
  })
  getHelloPrompt(name?: string): React.ReactElement {
    return <HelloPromptComponent name={name} />;
  }
}
