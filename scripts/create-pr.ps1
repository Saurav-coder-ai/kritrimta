param (
    [Parameter(Mandatory=$true)][string]$Slug,
    [Parameter(Mandatory=$true)][string]$Title
)

# Refresh system path to ensure gh is detected
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Creating branch publish/$Slug..."
git checkout -B "publish/$Slug"

Write-Host "Staging blog post and image assets..."
git add "src/content/blog/$Slug.md"

if (Test-Path "public/images/blog/$Slug.jpg") {
    git add "public/images/blog/$Slug.jpg"
}
if (Test-Path "public/images/blog/$Slug.png") {
    git add "public/images/blog/$Slug.png"
}
if (Test-Path "public/images/blog/$Slug.svg") {
    git add "public/images/blog/$Slug.svg"
}

Write-Host "Committing changes..."
git commit -m "feat(blog): $Title"

Write-Host "Pushing branch to GitHub origin..."
git push -u origin "publish/$Slug" --force

Write-Host "Creating Pull Request via GitHub CLI..."
gh pr create --base main --head "publish/$Slug" --title "🚀 Publish: $Title" --body "### New Automated Article for Kritrimta%0A%0A- **Title**: $Title%0A- **Slug**: $Slug%0A%0A*Tap 'Merge' on GitHub Mobile to publish this post live.*"
