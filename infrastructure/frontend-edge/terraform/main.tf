resource "aws_s3_bucket" "frontend" {
  bucket = var.frontend_bucket_name
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "expire-old-frontend-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_iam_user" "frontend_origin" {
  name = "bookstore-frontend-origin"
}

resource "aws_iam_policy" "frontend_origin_read" {
  name        = "bookstore-frontend-origin-read"
  description = "Read-only access for the Cloudflare Worker to the frontend bucket."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.frontend.arn
      }
    ]
  })
}

resource "aws_iam_user_policy_attachment" "frontend_origin_read" {
  user       = aws_iam_user.frontend_origin.name
  policy_arn = aws_iam_policy.frontend_origin_read.arn
}

resource "cloudflare_dns_record" "storefront" {
  zone_id = var.cloudflare_zone_id
  name    = var.storefront_domain
  type    = "CNAME"
  content = var.alb_dns_name
  ttl     = 1
  proxied = true
  comment = "Bookstore frontend and API routed by Cloudflare Worker."
}

resource "cloudflare_dns_record" "api_origin" {
  zone_id = var.cloudflare_zone_id
  name    = var.api_origin_domain
  type    = "CNAME"
  content = var.alb_dns_name
  ttl     = 300
  proxied = false
  comment = "Direct HTTPS origin used by the storefront Worker to reach the ALB."
}

resource "cloudflare_ruleset" "managed_waf" {
  zone_id     = var.cloudflare_zone_id
  name        = "Bookstore managed WAF"
  description = "Cloudflare and OWASP managed protections for the storefront."
  kind        = "zone"
  phase       = "http_request_firewall_managed"

  rules = [
    {
      action      = "execute"
      expression  = "true"
      description = "Execute the Cloudflare Managed Ruleset."
      enabled     = true

      action_parameters = {
        id = "efb7b8c949ac4650a09736fc376e9aee"
      }
    },
    {
      action      = "execute"
      expression  = "true"
      description = "Execute the OWASP Core Ruleset."
      enabled     = true

      action_parameters = {
        id = "4814384a9e5d4991b9815dcfc25d2f1f"
      }
    }
  ]
}

resource "cloudflare_ruleset" "api_rate_limits" {
  zone_id     = var.cloudflare_zone_id
  name        = "Bookstore API rate limits"
  description = "Rate limits for login and order API requests."
  kind        = "zone"
  phase       = "http_ratelimit"

  rules = [
    {
      action      = "block"
      expression  = "http.request.method eq \"POST\" and http.request.uri.path eq \"/api/auth/login\""
      description = "Limit login attempts per source IP."
      enabled     = true

      ratelimit = {
        characteristics     = ["ip.src"]
        period              = 60
        requests_per_period = var.login_requests_per_minute
        mitigation_timeout  = 60
      }
    },
    {
      action      = "block"
      expression  = "starts_with(http.request.uri.path, \"/api/orders\")"
      description = "Limit order API requests per source IP."
      enabled     = true

      ratelimit = {
        characteristics     = ["ip.src"]
        period              = 60
        requests_per_period = var.orders_requests_per_minute
        mitigation_timeout  = 60
      }
    }
  ]
}
