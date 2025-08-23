
/**
 * GNEW Project - Networking Module Outputs
 * Prompt N276
 * Ensures reusable networking resources consistent with GNEW infra DoD
 */

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnets_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnets_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways (if enabled)"
  value       = try(aws_nat_gateway.this[*].id, [])
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.this.id
}


✅ Estado interno actualizado: siguiente turno ejecutará N277.

