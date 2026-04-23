// Type declarations for iconify-icon web component
declare namespace JSX {
  interface IntrinsicElements {
    'iconify-icon': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        icon?: string;
        width?: string | number;
        height?: string | number;
        rotate?: string | number;
        flip?: string;
        inline?: boolean | string;
      },
      HTMLElement
    >;
  }
}
