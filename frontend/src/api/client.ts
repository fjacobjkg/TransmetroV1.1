type ApiOptions = Omit<RequestInit,'body'> & {body?:unknown};
export class ApiError extends Error {
  constructor(public status:number, message:string, public issues: Array<{path:unknown[];message:string}> = []) {super(message);this.name='ApiError';}
}
export async function apiRequest<T>(path:string,options:ApiOptions={}):Promise<T> {
  const {body,...requestOptions}=options;
  const response=await fetch(path,{...requestOptions,credentials:'include',headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...options.headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:options.signal??AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok) {
    if(response.status===401) window.dispatchEvent(new Event('transmetro:session-expired'));
    const details=result.issues?.map((issue:{path:unknown[];message:string})=>`${issue.path.join('.')}: ${issue.message}`).join(' · ');
    throw new ApiError(response.status, `${result.message??'No se pudo completar la solicitud.'}${details?' '+details:''}`,result.issues);
  }
  return result as T;
}
