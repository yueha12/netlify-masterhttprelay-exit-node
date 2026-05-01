MasterHttpRelay Netlify Functions Exit Node

This version uses regular Netlify Functions instead of Edge Functions.

Files:
- netlify.toml
- netlify/functions/relay.js
- public/index.html

Test endpoints after deploy:
https://YOUR-SITE.netlify.app/relay
https://YOUR-SITE.netlify.app/.netlify/functions/relay

PowerShell POST test:

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
  -Body $body `
  -TimeoutSec 60

Expected result:
s = 200
h = headers object
b = base64 body

Then update config.json:
"relay_url": "https://YOUR-SITE.netlify.app/relay"
