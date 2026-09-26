export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  className,
  children,
}: {
  etiqueta: string;
  htmlFor?: string;
  error?: string[] | string;
  ayuda?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const msg = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="etiqueta">
        {etiqueta}
      </label>
      {children}
      {msg ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {msg}
        </p>
      ) : ayuda ? (
        <p className="mt-1 text-xs text-slate-500">{ayuda}</p>
      ) : null}
    </div>
  );
}
