import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'light' | 'ghost-light';

interface CommonProps {
  variant?: Variant;
  block?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { to?: undefined };
type ButtonAsLink = CommonProps & { to: string };

/** One button style for the whole app. Renders a router Link when `to` is set. */
export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = 'primary', block = false, className, children } = props;
  const classes = ['btn', `btn-${variant}`, block ? 'btn-block' : '', className ?? ''].filter(Boolean).join(' ');

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    );
  }

  // Siblings of a rest element are not reported as unused, so this strips our own props.
  const { variant: _variant, block: _block, className: _className, children: _children, to: _to, ...rest } = props;
  return (
    <button type="button" {...rest} className={classes}>
      {children}
    </button>
  );
}
