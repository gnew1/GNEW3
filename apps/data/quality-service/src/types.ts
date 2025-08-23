
export type RuleType =
  | "not_null" | "unique"
  | "min_value" | "max_value" | "between"
  | "regex" | "allowed_set"
  | "max_null_ratio" | "min_distinct" | "max_distinct"
  | "foreign_key";

export type Severity = "warn" | "error";

export type ColumnMetric = {
  nulls?: number;
  distinct?: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  stddev?: number | null;
};

export type Profile = {
  rowCount: number;
  columns: Array<{ name: string } & ColumnMetric>;
};


