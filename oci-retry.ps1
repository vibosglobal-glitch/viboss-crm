# ============================================================
# Oracle Cloud A1.Flex Auto-Retry Instance Creator
# ============================================================
# This script tries to create an A1.Flex VM every 60 seconds
# across all 3 Availability Domains until one succeeds.
# It stops immediately once an instance is created.
#
# SETUP: You need to fill in the values below before running.
# See instructions in the comments for where to find each value.
# ============================================================

# ── YOUR CONFIGURATION (FILL THESE IN) ──

# 1. Compartment OCID
#    Find it: OCI Console → Identity → Compartments → copy your root compartment OCID
#    Looks like: ocid1.tenancy.oc1..aaaaaaaxxxxxxxxx
$COMPARTMENT_ID = ocid1.tenancy.oc1..aaaaaaaalwxyas3kahdhdgdhwddasximknope5xlmzdfb4kwaoowzacsgpla

# 2. Subnet OCID
#    Find it: OCI Console → Networking → Virtual Cloud Networks → your VCN → Subnets → copy the OCID
#    Looks like: ocid1.subnet.oc1.iad.aaaaaaaxxxxxxxxx
$SUBNET_ID = ocid1.vcn.oc1.iad.amaaaaaaajwifgiawg36rcfeygett674pwuklex2ypx2jyx6z47mk5mc7qsq

# 3. Image OCID (Ubuntu 22.04 ARM for Ashburn)
#    This is the Ubuntu 22.04 ARM image for the us-ashburn-1 region
#    You can verify at: OCI Console → Compute → Custom Images → browse Platform Images
$IMAGE_ID = "PASTE_YOUR_IMAGE_OCID_HERE"

# 4. SSH Public Key
#    Paste the CONTENTS of the .pub key file you downloaded from Oracle
#    Or use your own: Get-Content ~/.ssh/id_rsa.pub
$SSH_PUBLIC_KEY = "PASTE_YOUR_SSH_PUBLIC_KEY_HERE"

# 5. Availability Domains (for Ashburn - usually these, but verify in console)
#    Find them: OCI Console → Compute → Instances → Create Instance → check AD names
$AVAILABILITY_DOMAINS = @(
    "UbKE:US-ASHBURN-AD-1",
    "UbKE:US-ASHBURN-AD-2",
    "UbKE:US-ASHBURN-AD-3"
)

# 6. Instance Configuration
$DISPLAY_NAME = "coolify-server"
$SHAPE = "VM.Standard.A1.Flex"
$OCPUS = 4          # Try 4 first, reduce to 3 or 2 if needed
$MEMORY_GB = 24     # Try 24 first, reduce to 18 or 12 if needed

# ── RETRY SETTINGS ──
$RETRY_INTERVAL_SECONDS = 60   # Wait 60 seconds between attempts
$MAX_ATTEMPTS = 1440           # Stop after 24 hours (1440 * 60s = 24h)

# ============================================================
# SCRIPT LOGIC (Don't edit below unless you know what you're doing)
# ============================================================

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " OCI A1.Flex Auto-Retry Instance Creator" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Shape: $SHAPE ($OCPUS OCPUs, $MEMORY_GB GB RAM)" -ForegroundColor White
Write-Host " Retry interval: ${RETRY_INTERVAL_SECONDS}s" -ForegroundColor White
Write-Host " Max attempts: $MAX_ATTEMPTS" -ForegroundColor White
Write-Host " Press Ctrl+C to stop at any time" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$attempt = 0
$success = $false

while (-not $success -and $attempt -lt $MAX_ATTEMPTS) {
    foreach ($AD in $AVAILABILITY_DOMAINS) {
        $attempt++
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Attempt #$attempt - Trying $AD..." -ForegroundColor Yellow

        try {
            $result = oci compute instance launch `
                --compartment-id $COMPARTMENT_ID `
                --availability-domain $AD `
                --shape $SHAPE `
                --shape-config "{`"ocpus`":$OCPUS, `"memoryInGBs`":$MEMORY_GB}" `
                --subnet-id $SUBNET_ID `
                --image-id $IMAGE_ID `
                --assign-public-ip true `
                --display-name $DISPLAY_NAME `
                --ssh-authorized-keys-file /dev/stdin `
                --metadata "{`"ssh_authorized_keys`":`"$SSH_PUBLIC_KEY`"}" `
                2>&1

            $resultString = $result | Out-String

            if ($resultString -match '"id"' -and $resultString -match '"lifecycle-state"') {
                Write-Host ""
                Write-Host "================================================" -ForegroundColor Green
                Write-Host " SUCCESS! Instance created!" -ForegroundColor Green
                Write-Host "================================================" -ForegroundColor Green
                Write-Host ""
                Write-Host $resultString
                Write-Host ""
                Write-Host " Availability Domain: $AD" -ForegroundColor Green
                Write-Host " Instance Name: $DISPLAY_NAME" -ForegroundColor Green
                Write-Host ""
                Write-Host " Go to OCI Console to see your Public IP:" -ForegroundColor Cyan
                Write-Host " Compute -> Instances -> $DISPLAY_NAME" -ForegroundColor Cyan
                Write-Host ""

                # Play a sound to alert you
                [System.Console]::Beep(800, 500)
                [System.Console]::Beep(1000, 500)
                [System.Console]::Beep(1200, 500)

                $success = $true
                break
            }
            elseif ($resultString -match "Out of capacity") {
                Write-Host "[$timestamp]   -> Out of capacity in $AD" -ForegroundColor DarkGray
            }
            elseif ($resultString -match "LimitExceeded") {
                Write-Host "[$timestamp]   -> Limit exceeded (you may already have an instance)" -ForegroundColor Red
                Write-Host "[$timestamp]   -> Check OCI Console for existing instances" -ForegroundColor Red
                $success = $true  # Stop retrying
                break
            }
            else {
                Write-Host "[$timestamp]   -> Failed: $resultString" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "[$timestamp]   -> Error: $($_.Exception.Message)" -ForegroundColor Red
        }

        if ($success) { break }
    }

    if (-not $success) {
        Write-Host "[$timestamp] Waiting ${RETRY_INTERVAL_SECONDS}s before next round..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $RETRY_INTERVAL_SECONDS
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "Max attempts reached. Try again later or try a different config." -ForegroundColor Red
}

Write-Host ""
Write-Host "Script finished." -ForegroundColor Cyan
