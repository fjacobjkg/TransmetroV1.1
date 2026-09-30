import type { ReactNode } from 'react';
export function PageHeader({eyebrow,title,description,actions}:{eyebrow?:string;title:string;description:string;actions?:ReactNode}) {
  return <header className="page-heading"><div>{eyebrow&&<span className="eyebrow-text">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions&&<div className="heading-actions">{actions}</div>}</header>;
}
export function Notice({error,message}:{error?:string;message?:string}) {
  return <>{error&&<div className="notice notice-error" role="alert">{error}</div>}{message&&<div className="notice notice-success" role="status">{message}</div>}</>;
}
