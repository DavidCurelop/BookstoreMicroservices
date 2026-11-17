output "frontend_bucket_name" {
  description = "S3 bucket receiving the compiled frontend."
  value       = aws_s3_bucket.frontend.id
}

output "frontend_origin_iam_user" {
  description = "IAM user to issue restricted read credentials for the Worker."
  value       = aws_iam_user.frontend_origin.name
}

output "storefront_domain" {
  description = "Cloudflare-proxied public storefront hostname."
  value       = cloudflare_dns_record.storefront.name
}

output "api_origin_domain" {
  description = "DNS-only ALB origin hostname; attach a matching ACM certificate."
  value       = cloudflare_dns_record.api_origin.name
}
