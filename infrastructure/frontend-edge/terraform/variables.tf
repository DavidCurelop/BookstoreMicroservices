variable "aws_region" {
  description = "AWS region containing the frontend bucket and ALB."
  type        = string
  default     = "us-east-1"
}

variable "frontend_bucket_name" {
  description = "Globally unique S3 bucket name without periods for HTTPS virtual-hosted access."
  type        = string
  default     = "bookstore-frontend"

  validation {
    condition     = !strcontains(var.frontend_bucket_name, ".")
    error_message = "frontend_bucket_name must not contain periods."
  }
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the public storefront domain."
  type        = string
}

variable "storefront_domain" {
  description = "Public hostname served by Cloudflare, for example bookstore.example.com."
  type        = string
}

variable "api_origin_domain" {
  description = "DNS-only hostname for the ALB, with a matching HTTPS certificate."
  type        = string
}

variable "alb_dns_name" {
  description = "Public AWS ALB DNS name created for the EKS ingress."
  type        = string
}

variable "login_requests_per_minute" {
  description = "Maximum POST /api/auth/login requests per source IP in 60 seconds."
  type        = number
  default     = 10

  validation {
    condition     = var.login_requests_per_minute >= 1 && var.login_requests_per_minute <= 1000
    error_message = "login_requests_per_minute must be between 1 and 1000."
  }
}

variable "orders_requests_per_minute" {
  description = "Maximum /api/orders requests per source IP in 60 seconds."
  type        = number
  default     = 60

  validation {
    condition     = var.orders_requests_per_minute >= 1 && var.orders_requests_per_minute <= 10000
    error_message = "orders_requests_per_minute must be between 1 and 10000."
  }
}
