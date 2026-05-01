MasterHttpRelay Netlify Exit Node

Files:
- netlify.toml
- netlify/edge-functions/relay.ts
- public/index.html

Endpoint after deploy:
https://YOUR-SITE.netlify.app/relay

PowerShell test:

$body = @{
  k = "MRAMIRVAHEDI"
  u = "https://httpbin.org/get"
  m = "GET"
  h = @{}
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri "https://YOUR-SITE.netlify.app/relay" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

Expected result:
s = 200
h = headers object
b = base64 body

Then update config.json:
"relay_url": "https://YOUR-SITE.netlify.app/relay"
