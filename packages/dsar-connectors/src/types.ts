export type DSARContext = { subjectId: string; scope?: any; region: 
string }; 
export type ExportResult = { label: string; files: Array<{ path: 
string; sha256: string }> }; 
export type ErasureResult = { label: string; affected: number; 
details?: any }; 
 
export interface DataSourceConnector { 
  id: string;                         // ej. "postgres:core.users" 
  kind: "export" | "erasure" | "both"; 
  describe(): Promise<{ label: string }>; 
  exportData(ctx: DSARContext): Promise<ExportResult>; 
  eraseData(ctx: DSARContext): Promise<ErasureResult>; // 
delete/anonymize according to config 
} 
 
Conector Prisma (Postgres) 
