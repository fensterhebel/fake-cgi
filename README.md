# fake-cgi
Tiny cgi-like server for JS-files

## The Idea
When I switched from PHP to JS development (long time ago) I was missing that one feature where you could just have a bunch of unrelated PHP-files in different directories on the server that would only run when needed.

Now I created a simple server with Node that runs JS-files server-side on demand. The benefit is, I don't need a running Node instance for every script that might only really be used once in a while.

# Example Usage
## GET and a searchquery parameter
```JavaScript
// script.cgi.js

const param = decodeURI(process.argv[2] || '')
if (param === 'action1') {
  // ...
} else {
  // ...
}

console.log('success')

// call with
// $ curl 'http://localhost:1234/script.cgi.js?action1'
```

## POST with JSON data
```JavaScript
// api.cgi.js

function api (json) {
  // ...
  return { success: true, data: '...' }
}

let body = ''
process.stdin.on('data', (data) => {
  body += data.toString()
})
process.stdin.on('end', () => {
  // stderr will be parsed as headers (if possible)
  console.error('Content-Type: application/json')
  try {
    const json = JSON.parse(body)
    console.log(JSON.stringify(api(json)))
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.toString() }))
  }
})

// call with
// $ curl 'http://localhost:1234/api.cgi.js' --data '{"query":"..."}'
```

# Configuration
## Environment Variables
There are some environment variables that can be set:
- `BASEDIR` the base directory that contains the script files
- `PORT` the port

## What you could do / Things you can change
In the main Node script that runs the server you can modify the default extension `.cgi.js` to fit your needs. By default the maximum execution time of scripts is limited to 10 seconds.

You could also tell the script to run bash scripts etc.

## Nginx
To work on the default port that static html files are also served under, I configured nginx like this:
```
server {
  # ...

  index index.cgi.js index.html;

  # ...

  location ~* .*\.cgi\.js {
    proxy_pass http://localhost:8989;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}

map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}
```
