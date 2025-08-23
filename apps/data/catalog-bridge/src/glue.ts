
import {
  GlueClient,
  GetDatabasesCommand,
  GetTablesCommand,
  GetPartitionsCommand,
  type Database,
  type Table,
  type Partition
} from "@aws-sdk/client-glue";

export function makeGlue(): GlueClient {
  return new GlueClient({});
}

export async function* listDatabases(glue: GlueClient, namePrefix?: string) {
  let token: string | undefined = undefined;
  do {
    const out = await glue.send(new GetDatabasesCommand({ NextToken: token, MaxResults: 100 }));
    const items = (out.DatabaseList ?? []).filter(d => !namePrefix || d.Name?.startsWith(namePrefix));
    for (const d of items) yield d as Database;
    token = out.NextToken;
  } while (token);
}

export async function* listTables(glue: GlueClient, dbName: string) {
  let token: string | undefined = undefined;
  do {
    const out = await glue.send(new GetTablesCommand({ DatabaseName: dbName, NextToken: token, MaxResults: 100 }));
    for (const t of (out.TableList ?? [])) yield t as Table;
    token = out.NextToken;
  } while (token);
}

export async function* listPartitions(glue: GlueClient, dbName: string, tableName: string) {
  let token: string | undefined = undefined;
  do {
    const out = await glue.send(new GetPartitionsCommand({ DatabaseName: dbName, TableName: tableName, NextToken: token, MaxResults: 200 }));
    for (const p of (out.Partitions ?? [])) yield p as Partition;
    token = out.NextToken;
  } while (token);
}


