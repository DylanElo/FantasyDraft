export interface ToastProps {
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

export function Toast(props: ToastProps): JSX.Element;
