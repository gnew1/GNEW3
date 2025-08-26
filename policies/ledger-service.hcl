path "kv/data/apps/ledger-service/*" {
  capabilities = ["read"]
}

path "kv/metadata/apps/ledger-service/*" {
  capabilities = ["read"]
}

path "*" {
  capabilities = []
}
