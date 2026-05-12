# مسیر پروژه و فایل خروجی
$rootPath = "C:\Users\Saeed\Documents\langapp\angular\new\arena-workspace"
$outputPath = "C:\Users\Saeed\Documents\langapp\angular\new\arena-workspace\codes.txt"

# تنظیم کدگذاری کنسول
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# تعریف فرمت‌های مورد نظر
$extensions = "*.ts", "*.html", "*.css", "*.scss", "*.js"

Write-Host "Searching for files..." -ForegroundColor Cyan

# استفاده از -Include برای جستجوی چند فرمت هم‌زمان
Get-ChildItem -Path $rootPath -Recurse -Include $extensions | 
    Where-Object { 
        # حذف فایل‌های تست
        $_.Name -notlike "*.spec.ts" -and 
        # حذف پوشه‌های سیستمی و غیرضروری (RegEx)
        $_.FullName -notmatch "\\node_modules\\|\\.git\\|\\.angular\\|\\dist\\|\\\.vscode\\"
    } | 
    ForEach-Object { 
        $path = $_.FullName
        
        # خواندن محتوا با انکودینگ UTF8
        try {
            $content = Get-Content $path -Raw -Encoding UTF8
            # ساختار نهایی متن: نام فایل + محتوا + جداکننده
            "Relative Path: $($path.Replace($rootPath, ''))`n$content`n$('-'*30)" 
        } catch {
            Write-Host "Warning: Could not read $path" -ForegroundColor Yellow
        }
    } | Out-File -FilePath $outputPath -Encoding utf8

Write-Host "Done! All files (TS, HTML, CSS, SCSS) exported to $outputPath" -ForegroundColor Green
Pause