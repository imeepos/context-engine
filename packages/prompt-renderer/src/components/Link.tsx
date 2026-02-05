import React from 'react';

export interface LinkProps {
  to?: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  navigate?: (url: string) => void;
  children?: React.ReactNode;
}

export function Link(props: LinkProps): React.ReactElement {
  return React.createElement('Link', props, props.children);
}
