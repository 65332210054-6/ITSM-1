$path = "public/borrows.html"
$content = Get-Content $path -Raw -Encoding UTF8
# The content is currently mojibake'd because it was written with UTF8 (with BOM) but maybe read as ANSI or similar.
# Actually, if I write it back with WriteAllText it might fix it if I can recover the strings.
# But it's easier to just provide the correct content for the affected parts.

# Let's just use write_to_file to overwrite the whole file.
