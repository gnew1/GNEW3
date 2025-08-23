
###############################################
# GNEW Project - Terraform Network Module
# Prompt N314
# Defines secure VPC, subnets, gateways and security groups
###############################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

resource "aws_vpc" "gnew_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "gnew-vpc"
    Project = "GNEW"
  }
}

resource "aws_internet_gateway" "gnew_igw" {
  vpc_id = aws_vpc.gnew_vpc.id

  tags = {
    Name = "gnew-igw"
    Project = "GNEW"
  }
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.gnew_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  map_public_ip_on_launch = true
  availability_zone       = element(var.azs, count.index)

  tags = {
    Name = "gnew-public-${count.index}"
    Project = "GNEW"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.gnew_vpc.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = element(var.azs, count.index)

  tags = {
    Name = "gnew-private-${count.index}"
    Project = "GNEW"
    Tier = "private"
  }
}

resource "aws_security_group" "gnew_sg" {
  name        = "gnew-sg"
  description = "Default security group for GNEW"
  vpc_id      = aws_vpc.gnew_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.admin_cidrs
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "gnew-sg"
    Project = "GNEW"
  }
}

output "vpc_id" {
  value = aws_vpc.gnew_vpc.id
}

output "public_subnets" {
  value = aws_subnet.public[*].id
}

output "private_subnets" {
  value = aws_subnet.private[*].id
}


