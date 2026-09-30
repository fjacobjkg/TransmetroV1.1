import { useEffect, useRef, type ReactNode } from 'react';
export function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
  return <dialog ref={ref} className="dialog" aria-label={title} onCancel={event=>{event.preventDefault();onClose();}}><div className="dialog-title"><h2>{title}</h2><button className="button quiet" onClick={onClose} aria-label="Cerrar formulario">✕</button></div>{children}</dialog>;
}
