import { CatalogWorkspace } from '../features/catalog/CatalogWorkspace';
import { ReportsWorkspace } from '../features/reports/ReportsWorkspace';
import { OperationsWorkspace } from './OperationsWorkspace';
export function ModuleWorkbench({section}:{section:string}) {
  if(section==='operations')return <OperationsWorkspace/>;
  if(section==='reports')return <ReportsWorkspace/>;
  return <CatalogWorkspace section={section} key={section}/>;
}
