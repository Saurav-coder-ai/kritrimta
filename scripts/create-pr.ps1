param (
    [Parameter(Mandatory=$true)][string]$Slug,
    [Parameter(Mandatory=$true)][string]$Title,
    [switch]$NeedsImageReview,
    [switch]$NeedsFactCheck,
    [switch]$NoPush
)

# Refresh system path to ensure gh and git are detected
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$postFile = "src/content/blog/$Slug.md"
if (-not (Test-Path $postFile)) {
    Write-Error "PIPELINE FAILED: Post source file '$postFile' does not exist."
    exit 1
}

# ============================================================
# PIPELINE STEP 1: Mandatory Feature Image Validation
# ============================================================
Write-Host "Validating feature image in $postFile..."
$content = Get-Content $postFile -Raw

# Match YAML frontmatter block
if ($content -match "(?s)^---\r?\n(.*?)\r?\n---") {
    $frontmatter = $matches[1]
} else {
    Write-Error "PIPELINE FAILED: Missing or malformed YAML frontmatter in $postFile."
    exit 1
}

$imagePath = $null
if ($frontmatter -match "(?m)^(?:heroImage|image|og:image):\s*[`"']?([^`"'\r\n]+)[`"']?") {
    $imagePath = $matches[1].Trim()
}

if ([string]::IsNullOrWhiteSpace($imagePath)) {
    Write-Error "PIPELINE FAILED: Feature image is mandatory. 'heroImage', 'image', or 'og:image' in frontmatter is missing or empty in $postFile."
    exit 1
}

# Resolve local file path
$resolvedPath = $null
if ($imagePath.StartsWith("http://") -or $imagePath.StartsWith("https://")) {
    Write-Host "Feature image points to remote URL: $imagePath"
} else {
    $cleanPath = $imagePath.TrimStart("/").Replace("/", "\")
    $candidate1 = Join-Path "public" $cleanPath
    $candidate2 = $cleanPath
    if (Test-Path $candidate1) {
        $resolvedPath = $candidate1
    } elseif (Test-Path $candidate2) {
        $resolvedPath = $candidate2
    } else {
        Write-Error "PIPELINE FAILED: Feature image '$imagePath' does not exist on disk (checked '$candidate1' and '$candidate2')."
        exit 1
    }

    $fileSize = (Get-Item $resolvedPath).Length
    if ($fileSize -le 0) {
        Write-Error "PIPELINE FAILED: Feature image file '$resolvedPath' is 0 bytes (empty file)."
        exit 1
    }
    Write-Host "Feature image validated successfully: $resolvedPath ($fileSize bytes)."
}

# ============================================================
# PIPELINE STEP 2: Review Labels Resolution
# ============================================================
$prLabels = @()
if ($NeedsImageReview) {
    $prLabels += "needs-image-review"
    Write-Warning "Flagged with needs-image-review label: image requires editorial verification."
}
if ($NeedsFactCheck) {
    $prLabels += "needs-fact-check"
    Write-Warning "Flagged with needs-fact-check label: facts require source verification."
}

# ============================================================
# PIPELINE STEP 3: Git Branch, Staging, and Commit
# ============================================================
Write-Host "Creating branch publish/$Slug..."
git checkout -B "publish/$Slug"

Write-Host "Staging blog post and associated media assets..."
git add $postFile

# Stage resolved hero image if local
if ($resolvedPath -and (Test-Path $resolvedPath)) {
    git add $resolvedPath
}

# Stage any matched images under public/images/blog/ with the slug
Get-ChildItem -Path "public/images/blog" -Filter "*$Slug*" -File -ErrorAction SilentlyContinue | ForEach-Object {
    git add $_.FullName
}

Write-Host "Committing changes..."
git commit -m "feat(blog): $Title"

# ============================================================
# PIPELINE STEP 4: Push and Pull Request Creation
# ============================================================
if ($NoPush) {
    Write-Host "NoPush flag specified. Holding branch publish/$Slug locally without pushing to origin."
    exit 0
}

Write-Host "Pushing branch to GitHub origin..."
git push -u origin "publish/$Slug" --force

Write-Host "Creating Pull Request via GitHub CLI..."
$labelArgs = @()
foreach ($lbl in $prLabels) {
    $labelArgs += @("--label", $lbl)
}

$prBody = "### New Automated Article for Kritrimta%0A%0A- **Title**: $Title%0A- **Slug**: $Slug%0A- **Feature Image**: $imagePath"
if ($prLabels.Count -gt 0) {
    $prBody += "%0A- **Review Flags**: " + ($prLabels -join ", ")
}
$prBody += "%0A%0A*Review and merge to publish.*"

gh pr create --base main --head "publish/$Slug" --title "🚀 Publish: $Title" --body "$prBody" @labelArgs
