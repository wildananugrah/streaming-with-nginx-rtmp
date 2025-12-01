---
marp: true
theme: gaia
class: lead
paginate: true
size: 4:3
style: |
  section {
    font-size: 12pt;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 25px;
  }
  h1 {
    font-size: 20pt;
    color: #1a5f2a;
    border-bottom: 2px solid #1a5f2a;
    padding-bottom: 5px;
  }
  h2 {
    font-size: 16pt;
    color: #2d7a3e;
  }
  h3 {
    font-size: 13pt;
    color: #444;
  }
  table {
    font-size: 10pt;
    width: 100%;
  }
  th {
    background: #f0f7f1;
  }
  code {
    font-size: 10pt;
    color: black;
    background: #f0f0f0;
    padding: 1px 4px;
    border-radius: 2px;
  }
  pre {
    font-size: 9pt;
    line-height: 1.3;
    background: #f5f5f5;
    padding: 10px;
  }
  ul, ol {
    font-size: 11pt;
  }
---

# nginx-rtmp Streaming Server Guide

A comprehensive guide to setting up a live streaming server using nginx with the RTMP module.

**Table of Contents**
1. Overview & Architecture
2. Installation
3. Basic Configuration
4. Testing the Stream
5. HLS Player Setup
6. Authentication
7. Recording Streams
8. Multiple Bitrates
9. Monitoring & Troubleshooting
10. Quick Reference

---

## 1. Overview & Architecture

**nginx-rtmp** is an nginx module that adds RTMP support for live video streaming.

| Protocol | Use Case | Latency | Browser Support |
|----------|----------|---------|-----------------|
| RTMP | Ingest (broadcaster → server) | Low (~2-5s) | Flash only |
| HLS | Playback (server → viewer) | Medium (~10-30s) | All browsers |
| DASH | Playback (server → viewer) | Medium (~10-30s) | Most browsers |

**Architecture Flow:**
```
┌─────────────┐     RTMP      ┌─────────────┐      HLS       ┌─────────────┐
│ Broadcaster │ ────────────▶ │ nginx-rtmp  │ ─────────────▶ │   Viewers   │
│ (OBS Studio)│   port 1935   │   Server    │   port 8080    │  (Browser)  │
└─────────────┘               └─────────────┘                └─────────────┘
```

---

## 2. Installation

### Option A: Ubuntu/Debian
```bash
sudo apt update
sudo apt install nginx libnginx-mod-rtmp
nginx -V 2>&1 | grep rtmp   # Verify installation
```

### Option B: macOS (Homebrew)
```bash
brew tap denji/nginx
brew install nginx-full --with-rtmp-module
```

### Option C: Docker (Easiest)
```yaml
# docker-compose.yml
version: "3.8"
services:
  nginx-rtmp:
    image: alfg/nginx-rtmp
    ports:
      - "1935:1935"   # RTMP ingest
      - "8080:80"     # HLS playback
    # volumes:        # Optional: uncomment to persist data
    #   - ./hls:/tmp/hls
    #   - ./recordings:/var/recordings
```
```bash
docker-compose up -d   # Start
docker-compose down    # Stop
```
> **Note:** Docker handles directories automatically. Skip "Directory Setup" if using Docker.

### Directory Setup (Non-Docker only)
```bash
sudo mkdir -p /tmp/hls && sudo chmod 755 /tmp/hls
sudo mkdir -p /var/recordings && sudo chown www-data:www-data /var/recordings
```

---

## 3. Basic Configuration

Edit `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;
events { worker_connections 1024; }

rtmp {
    server {
        listen 1935;
        chunk_size 4096;

        application live {
            live on;
            record off;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3;
            hls_playlist_length 60;
            deny play all;
        }
    }
}
```

---

## 3. Basic Configuration (cont.)

```nginx
http {
    sendfile off;
    tcp_nopush on;
    directio 512;
    default_type application/octet-stream;

    server {
        listen 8080;

        location / {
            root /var/www/html;
            index index.html;
        }

        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }
    }
}
```

**Start nginx:**
```bash
sudo nginx -t          # Test configuration
sudo nginx             # Start
sudo nginx -s reload   # Reload if running
```

---

## 4. Testing the Stream

### OBS Studio Settings

| Setting | Value |
|---------|-------|
| Service | Custom... |
| Server | `rtmp://localhost/live` |
| Stream Key | `test` (or any name) |

### Verify & Watch
```bash
# Check HLS files are created
ls -la /tmp/hls/

# Watch with VLC
vlc http://localhost:8080/hls/test.m3u8

# Test with FFmpeg (no OBS needed)
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000 \
    -c:v libx264 -preset ultrafast -b:v 1500k \
    -c:a aac -b:a 128k -f flv rtmp://localhost/live/test

# or

ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000 \
    -c:v libx264 -preset ultrafast -b:v 1500k \
    -c:a aac -b:a 128k \
    -f flv rtmp://54.179.134.123/stream/test

ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:sample_rate=44100 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -pix_fmt yuv420p \
  -c:a aac -ar 44100 -b:a 128k \
  -f flv rtmp://54.179.134.123/stream/test2
```

---

## 5. HLS Player Setup

Create `/var/www/html/player.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Live Stream</title>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <style>video { width: 100%; max-width: 800px; }</style>
</head>
<body>
    <video id="video" controls></video>
    <script>
        const video = document.getElementById('video');
        const url = '/hls/test.m3u8';
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
        }
    </script>
</body>
</html>
```

---

## 6. Authentication

### nginx Configuration
```nginx
application live {
    live on;
    on_publish http://localhost:3000/api/stream/auth;
    on_publish_done http://localhost:3000/api/stream/end;
    on_play http://localhost:3000/api/stream/play;  # Optional
    hls on;
    hls_path /tmp/hls;
}
```

### What nginx Sends (POST form data)

| Field | Description | Example |
|-------|-------------|---------|
| app | Application name | live |
| name | Stream key | abc123xyz |
| addr | Client IP | 192.168.1.100 |
| tcurl | Full RTMP URL | rtmp://server/live |

**Response:** Return `2xx` to allow, `4xx/5xx` to deny.

---

## 6. Authentication (cont.)

### Node.js Auth Server

```javascript
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const streamKeys = new Map([
    ['sk_abc123', { userId: 1, username: 'streamer1' }],
]);
const activeStreams = new Map();

app.post('/api/stream/auth', (req, res) => {
    const { name: streamKey, addr: clientIp } = req.body;
    const keyData = streamKeys.get(streamKey);
    if (!keyData) return res.status(403).send('Invalid stream key');
    activeStreams.set(streamKey, { ...keyData, startedAt: new Date(), clientIp });
    console.log(`Approved: ${keyData.username} started streaming`);
    res.status(200).send('OK');
});

app.post('/api/stream/end', (req, res) => {
    activeStreams.delete(req.body.name);
    res.status(200).send('OK');
});

app.listen(3000, () => console.log('Auth server on port 3000'));
```

---

## 7. Recording Streams

```nginx
application live {
    live on;

    record all;                              # Record audio + video
    record_path /var/recordings;             # Save location
    record_suffix -%Y%m%d-%H%M%S.flv;       # Filename format
    record_unique on;                        # Prevent overwrite
    record_max_size 1000M;                   # Max file size

    # Post-processing hook
    exec_record_done ffmpeg -i $path -c copy /var/recordings/$basename.mp4;
}
```

| Directive | Description |
|-----------|-------------|
| `record off/all/audio/video` | What to record |
| `record_path` | Directory for recordings |
| `record_suffix` | Filename suffix (strftime supported) |
| `record_max_size` | Max size before new file |
| `record_interval` | Create new file after interval |

---

## 8. Multiple Bitrates (Adaptive Streaming)

```nginx
application live {
    live on;
    exec_push ffmpeg -i rtmp://localhost/live/$name
      -c:v libx264 -preset veryfast -b:v 3000k -s 1920x1080
        -c:a aac -b:a 128k -f flv rtmp://localhost/show/${name}_1080p
      -c:v libx264 -preset veryfast -b:v 1500k -s 1280x720
        -c:a aac -b:a 128k -f flv rtmp://localhost/show/${name}_720p
      -c:v libx264 -preset veryfast -b:v 800k -s 854x480
        -c:a aac -b:a 96k -f flv rtmp://localhost/show/${name}_480p;
}

application show {
    live on;
    hls on;
    hls_path /tmp/hls/show;
    hls_fragment 3s;
    hls_nested on;
    hls_variant _1080p BANDWIDTH=3128000,RESOLUTION=1920x1080;
    hls_variant _720p BANDWIDTH=1628000,RESOLUTION=1280x720;
    hls_variant _480p BANDWIDTH=896000,RESOLUTION=854x480;
}
```

---

## 9. Monitoring & Statistics

```nginx
http {
    server {
        listen 8080;

        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }

        location /control {
            rtmp_control all;
            allow 127.0.0.1;
            deny all;
        }
    }
}
```

**View stats:** `http://localhost:8080/stat`

**Control commands:**
```bash
curl "http://localhost:8080/control/drop/client?app=live&name=streamkey"
curl "http://localhost:8080/control/drop/publisher?app=live&name=streamkey"
```

---

## 9. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Connection refused :1935 | nginx not running | `nginx -t` and `ps aux \| grep nginx` |
| No .m3u8 file | Stream not publishing | Check /tmp/hls permissions, wait 10s |
| CORS errors | Missing headers | Add `Access-Control-Allow-Origin *` |
| No audio | Codec issue | Ensure OBS outputs AAC audio |
| High latency (>30s) | Large HLS segments | Reduce `hls_fragment` to 2-3s |

**Debug commands:**
```bash
nginx -t                              # Test config
tail -f /var/log/nginx/error.log      # View logs
netstat -tlnp | grep 1935             # Check port
ffprobe rtmp://localhost/live/test    # Test RTMP
watch -n 1 "ls -la /tmp/hls/"         # Monitor HLS files
```

---

## 10. Production Checklist

### Security
- Enable publisher authentication
- Restrict control API to localhost
- Use HTTPS for HLS (reverse proxy)
- Implement rate limiting
- Set up firewall rules

### Performance
- Set `worker_processes auto`
- Use SSD for HLS segments
- Configure appropriate fragment size
- Use CDN for HLS delivery
- Enable `sendfile off`

---

## 10. Quick Reference

| Purpose | URL |
|---------|-----|
| RTMP Ingest | `rtmp://server:1935/live/streamkey` |
| HLS Playback | `http://server:8080/hls/streamkey.m3u8` |
| DASH Playback | `http://server:8080/dash/streamkey.mpd` |
| Statistics | `http://server:8080/stat` |

| Path | Purpose |
|------|---------|
| /etc/nginx/nginx.conf | Main configuration |
| /tmp/hls | HLS segments |
| /var/recordings | Recorded streams |
| /var/log/nginx/ | Log files |

**Resources:**
- [nginx-rtmp GitHub](https://github.com/arut/nginx-rtmp-module)
- [HLS.js](https://github.com/video-dev/hls.js)
- [OBS Studio](https://obsproject.com/)
