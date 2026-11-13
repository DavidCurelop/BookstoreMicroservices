# Amazon EKS & Infrastructure Deployment and Teardown Guide

This document contains all reproducible steps and PowerShell commands to deploy the BookStore architecture from scratch into AWS (using EKS, EFS, RDS PostgreSQL, and VPC), and teardown instructions to clean up all billed resources.

---

## 1. Prerequisites & Environment Setup

Run this in your PowerShell terminal before running AWS or `kubectl` commands:

```powershell
# Set credentials file and region
$env:AWS_SHARED_CREDENTIALS_FILE = "$PWD\.aws\credential"
$env:AWS_REGION = "us-east-1"
$env:AWS_DEFAULT_REGION = "us-east-1"

# Verify caller identity
aws sts get-caller-identity
```

---

## 2. Full Deployment Runbook

### Step 2.1: Create VPC & Networking
```powershell
# 1. Create VPC
$vpcId = (aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=bookstore-vpc}]" --query Vpc.VpcId --output text)
aws ec2 modify-vpc-attribute --vpc-id $vpcId --enable-dns-support
aws ec2 modify-vpc-attribute --vpc-id $vpcId --enable-dns-hostnames

# 2. Subnets (2 Public, 2 Private across us-east-1a and us-east-1b)
$pubSubA = (aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.128.0/20 --availability-zone us-east-1a --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=bookstore-public-1a},{Key=kubernetes.io/role/elb,Value=1}]" --query Subnet.SubnetId --output text)
$pubSubB = (aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.144.0/20 --availability-zone us-east-1b --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=bookstore-public-1b},{Key=kubernetes.io/role/elb,Value=1}]" --query Subnet.SubnetId --output text)

$privSubA = (aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.0.0/19 --availability-zone us-east-1a --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=bookstore-private-1a},{Key=kubernetes.io/role/internal-elb,Value=1}]" --query Subnet.SubnetId --output text)
$privSubB = (aws ec2 create-subnet --vpc-id $vpcId --cidr-block 10.0.32.0/19 --availability-zone us-east-1b --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=bookstore-private-1b},{Key=kubernetes.io/role/internal-elb,Value=1}]" --query Subnet.SubnetId --output text)

aws ec2 modify-subnet-attribute --subnet-id $pubSubA --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $pubSubB --map-public-ip-on-launch

# 3. Internet Gateway
$igwId = (aws ec2 create-internet-gateway --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=bookstore-igw}]" --query InternetGateway.InternetGatewayId --output text)
aws ec2 attach-internet-gateway --vpc-id $vpcId --internet-gateway-id $igwId

# 4. Public Route Table
$pubRtb = (aws ec2 create-route-table --vpc-id $vpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=bookstore-public-rtb}]" --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $pubRtb --destination-cidr-block 0.0.0.0/0 --gateway-id $igwId
aws ec2 associate-route-table --route-table-id $pubRtb --subnet-id $pubSubA
aws ec2 associate-route-table --route-table-id $pubRtb --subnet-id $pubSubB

# 5. NAT Gateway (for private pods to reach ECR, RDS, EFS & external services)
$eipAlloc = (aws ec2 allocate-address --domain vpc --query AllocationId --output text)
$natGw = (aws ec2 create-nat-gateway --subnet-id $pubSubA --allocation-id $eipAlloc --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=bookstore-nat}]" --query NatGateway.NatGatewayId --output text)

Write-Host "Waiting for NAT Gateway to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $natGw

# 6. Private Route Table
$privRtb = (aws ec2 create-route-table --vpc-id $vpcId --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=bookstore-private-rtb}]" --query RouteTable.RouteTableId --output text)
aws ec2 create-route --route-table-id $privRtb --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $natGw
aws ec2 associate-route-table --route-table-id $privRtb --subnet-id $privSubA
aws ec2 associate-route-table --route-table-id $privRtb --subnet-id $privSubB
```

---

### Step 2.2: Data Security Group & Amazon EFS
```powershell
# 1. Create Security Group for EFS & RDS
$dataSg = (aws ec2 create-security-group --group-name bookstore-data-sg --description "Allow RDS and EFS traffic from VPC" --vpc-id $vpcId --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $dataSg --protocol tcp --port 5432 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $dataSg --protocol tcp --port 2049 --cidr 10.0.0.0/16

# 2. Create EFS File System & Mount Targets
$efsId = (aws efs create-file-system --performance-mode generalPurpose --throughput-mode bursting --encrypted --tags Key=Name,Value=bookstore-efs --query FileSystemId --output text)
Start-Sleep -Seconds 10

$efsMtA = (aws efs create-mount-target --file-system-id $efsId --subnet-id $privSubA --security-groups $dataSg --query MountTargetId --output text)
$efsMtB = (aws efs create-mount-target --file-system-id $efsId --subnet-id $privSubB --security-groups $dataSg --query MountTargetId --output text)

# 3. Create EFS Access Point (posix user 1000:1000 for container non-root 'node' user)
$efsAp = (aws efs create-access-point --file-system-id $efsId --posix-user Uid=1000,Gid=1000 --root-directory "Path=/logs,CreationInfo={OwnerUid=1000,OwnerGid=1000,Permissions=775}" --tags Key=Name,Value=bookstore-logs-ap --query AccessPointId --output text)
```

---

### Step 2.3: Amazon RDS PostgreSQL
```powershell
# 1. DB Subnet Group
aws rds create-db-subnet-group --db-subnet-group-name bookstore-eks-db-subnets --db-subnet-group-description "Subnets for bookstore RDS" --subnet-ids $privSubA $privSubB

# 2. Create RDS PostgreSQL instance
aws rds create-db-instance `
  --db-instance-identifier bookstore-db `
  --db-instance-class db.t4g.micro `
  --engine postgres `
  --engine-version 18.3 `
  --master-username postgres `
  --master-user-password "BookStoreSecure2026!" `
  --allocated-storage 20 `
  --db-subnet-group-name bookstore-eks-db-subnets `
  --vpc-security-group-ids $dataSg `
  --no-publicly-accessible `
  --backup-retention-period 0

Write-Host "Waiting for RDS instance to become available (this takes ~5-8 mins)..."
aws rds wait db-instance-available --db-instance-identifier bookstore-db
$rdsEndpoint = (aws rds describe-db-instances --db-instance-identifier bookstore-db --query "DBInstances[0].Endpoint.Address" --output text)
```

---

### Step 2.4: Build and Push Docker Images to Amazon ECR
```powershell
$accountId = (aws sts get-caller-identity --query Account --output text)
$ecrRegistry = "$accountId.dkr.ecr.us-east-1.amazonaws.com"

# Ensure repositories exist
aws ecr create-repository --repository-name bookstore-backend 2>$null
aws ecr create-repository --repository-name bookstore-frontend 2>$null

# Authenticate Docker
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ecrRegistry

# Build and Push
docker tag bookstore-backend:8.1.0 "$ecrRegistry/bookstore-backend:8.1.0"
docker tag bookstore-frontend:8.1.0 "$ecrRegistry/bookstore-frontend:8.1.0"
docker push "$ecrRegistry/bookstore-backend:8.1.0"
docker push "$ecrRegistry/bookstore-frontend:8.1.0"
```

---

### Step 2.5: Amazon EKS Cluster & Node Group
```powershell
# Retrieve Lab IAM Roles (AWS Academy pre-created roles)
$clusterRoleArn = (aws iam list-roles --query "Roles[?contains(RoleName, 'LabEksClusterRole')].Arn | [0]" --output text)
$nodeRoleArn = (aws iam list-roles --query "Roles[?contains(RoleName, 'LabRole')].Arn | [0]" --output text)

# 1. Create EKS Cluster
aws eks create-cluster `
  --name bookstore-eks `
  --role-arn $clusterRoleArn `
  --resources-vpc-config "subnetIds=$pubSubA,$pubSubB,$privSubA,$privSubB,endpointPublicAccess=true,endpointPrivateAccess=true" `
  --kubernetes-version 1.37

Write-Host "Waiting for EKS Cluster to become ACTIVE (takes ~8-10 mins)..."
aws eks wait cluster-active --name bookstore-eks

# 2. Update local kubeconfig
aws eks update-kubeconfig --name bookstore-eks --region us-east-1

# 3. Create Managed Node Group
aws eks create-nodegroup `
  --cluster-name bookstore-eks `
  --nodegroup-name bookstore-nodes `
  --subnets $privSubA $privSubB `
  --node-role $nodeRoleArn `
  --instance-types t3.medium `
  --scaling-config minSize=2,maxSize=3,desiredSize=2

Write-Host "Waiting for NodeGroup to become ACTIVE..."
aws eks wait nodegroup-active --cluster-name bookstore-eks --nodegroup-name bookstore-nodes

# 4. Install EFS CSI Driver add-on
aws eks create-addon --cluster-name bookstore-eks --addon-name aws-efs-csi-driver
```

---

### Step 2.6: Bootstrap Database & Deploy Kubernetes Manifests
```powershell
# 1. Update kubernetes/logs-pvc.yaml with the created EFS ID & Access Point:
# volumeHandle: <efsId>::<efsAp>

# 2. Create the Database Secret
kubectl create secret generic bookstore-db `
  --from-literal=DB_HOST="$rdsEndpoint" `
  --from-literal=DB_PORT="5432" `
  --from-literal=DB_NAME="postgres" `
  --from-literal=DB_USER="postgres" `
  --from-literal=DB_PASSWORD="BookStoreSecure2026!" `
  --from-literal=PORT="5001" `
  --from-literal=NODE_ENV="production" `
  --from-literal=CLICKSTREAM_LOG_DIR="/usr/src/app/logs" `
  --from-literal=CLICKSTREAM_LOG_FILE="/usr/src/app/logs/clickstream.log" `
  --from-literal=CORS_ORIGINS="*"

# 3. Run the Database Schema & Seed Bootstrap Job
# Apply database bootstrap job from repository or inline bootstrap:
# (Seeds canonical tables: books, customers, orders, users)

# 4. Apply Kubernetes Manifests
kubectl apply -f kubernetes/logs-pvc.yaml
kubectl apply -f kubernetes/backend-service.yaml
kubectl apply -f kubernetes/backend-deployment.yaml
kubectl apply -f kubernetes/nginx-service.yaml
kubectl apply -f kubernetes/nginx-deployment.yaml

# 5. Get the Service LoadBalancer URL
$elbUrl = ""
while (-not $elbUrl) {
    Start-Sleep -Seconds 5
    $elbUrl = (kubectl get svc bookstore-frontend-service -o jsonpath="{.status.loadBalancer.ingress[0].hostname}")
}
Write-Host "Webpage is accessible at: http://$elbUrl"
```

---

## 3. Teardown / Destruction Instructions (Avoid Charges)

Execute these steps in sequence to terminate and delete all resources in reverse dependency order:

```powershell
$env:AWS_SHARED_CREDENTIALS_FILE = "$PWD\.aws\credential"
$env:AWS_REGION = "us-east-1"

# Step 1: Delete Kubernetes LoadBalancer & PVCs first (releases AWS ELB)
kubectl delete -f kubernetes/nginx-service.yaml --ignore-not-found
kubectl delete -f kubernetes/backend-service.yaml --ignore-not-found
kubectl delete -f kubernetes/nginx-deployment.yaml --ignore-not-found
kubectl delete -f kubernetes/backend-deployment.yaml --ignore-not-found
kubectl delete -f kubernetes/logs-pvc.yaml --ignore-not-found
kubectl delete secret bookstore-db --ignore-not-found

Write-Host "Waiting 30 seconds for AWS Classic/Network Load Balancer to clean up..."
Start-Sleep -Seconds 30

# Step 2: Delete EKS Node Group & Cluster
aws eks delete-nodegroup --cluster-name bookstore-eks --nodegroup-name bookstore-nodes
Write-Host "Waiting for NodeGroup deletion..."
aws eks wait nodegroup-deleted --cluster-name bookstore-eks --nodegroup-name bookstore-nodes

aws eks delete-cluster --name bookstore-eks
Write-Host "Waiting for EKS Cluster deletion..."
aws eks wait cluster-deleted --name bookstore-eks

# Step 3: Delete RDS PostgreSQL Database & Subnet Group
aws rds delete-db-instance --db-instance-identifier bookstore-db --skip-final-snapshot --delete-automated-backups
Write-Host "Waiting for RDS instance deletion..."
aws rds wait db-instance-deleted --db-instance-identifier bookstore-db
aws rds delete-db-subnet-group --db-subnet-group-name bookstore-eks-db-subnets

# Step 4: Delete EFS Mount Targets, Access Point, and File System
$efsId = (aws efs describe-file-systems --query "FileSystems[?Name=='bookstore-efs'].FileSystemId" --output text)
if ($efsId) {
    # Delete access points
    $apIds = (aws efs describe-access-points --file-system-id $efsId --query "AccessPoints[].AccessPointId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($ap in $apIds) {
        aws efs delete-access-point --access-point-id $ap
    }

    # Delete mount targets
    $mtIds = (aws efs describe-mount-targets --file-system-id $efsId --query "MountTargets[].MountTargetId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($mt in $mtIds) {
        aws efs delete-mount-target --mount-target-id $mt
    }

    Write-Host "Waiting for mount targets to be deleted..."
    Start-Sleep -Seconds 30
    aws efs delete-file-system --file-system-id $efsId
}

# Step 5: Delete NAT Gateway & Release Elastic IP
$vpcId = (aws ec2 describe-vpcs --filters "Name=tag:Name,Values=bookstore-vpc" --query "Vpcs[0].VpcId" --output text)
$natGws = (aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpcId" "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
foreach ($nat in $natGws) {
    $allocId = (aws ec2 describe-nat-gateways --nat-gateway-ids $nat --query "NatGateways[0].NatGatewayAddresses[0].AllocationId" --output text)
    aws ec2 delete-nat-gateway --nat-gateway-id $nat
    Write-Host "Waiting for NAT Gateway $nat to delete..."
    aws ec2 wait nat-gateway-deleted --nat-gateway-ids $nat
    if ($allocId) {
        aws ec2 release-address --allocation-id $allocId
    }
}

# Step 6: Delete VPC Networking (Security Groups, Subnets, Route Tables, IGW, VPC)
if ($vpcId) {
    # Detach & Delete IGW
    $igws = (aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpcId" --query "InternetGateways[].InternetGatewayId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($igw in $igws) {
        aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpcId
        aws ec2 delete-internet-gateway --internet-gateway-id $igw
    }

    # Delete Subnets
    $subnets = (aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --query "Subnets[].SubnetId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($sub in $subnets) {
        aws ec2 delete-subnet --subnet-id $sub
    }

    # Delete Route Tables (custom non-main)
    $rtbs = (aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpcId" --query "RouteTables[?Associations[0].Main!=`true`].RouteTableId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($rtb in $rtbs) {
        aws ec2 delete-route-table --route-table-id $rtb
    }

    # Delete Security Groups
    $sgs = (aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpcId" --query "SecurityGroups[?GroupName!='default'].GroupId" --output text).Split(" `t`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($sg in $sgs) {
        aws ec2 delete-security-group --group-id $sg
    }

    # Delete VPC
    aws ec2 delete-vpc --vpc-id $vpcId
    Write-Host "VPC $vpcId deleted successfully."
}
```

