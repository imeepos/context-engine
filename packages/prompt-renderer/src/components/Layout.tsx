import React from 'react';

export interface SpaceProps {
  count?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TabProps {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BrProps {}

export function Space(props: SpaceProps): React.ReactElement {
  return React.createElement('Space', props);
}

export function Tab(props: TabProps): React.ReactElement {
  return React.createElement('Tab', props);
}

export function Br(props: BrProps): React.ReactElement {
  return React.createElement('Br', props);
}
