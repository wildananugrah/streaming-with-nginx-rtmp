https://www.digitalocean.com/community/tutorials/how-to-set-up-a-video-streaming-server-using-nginx-rtmp-on-ubuntu-20-04

https://obsproject.com/forum/resources/how-to-set-up-your-own-private-rtmp-server-using-nginx.50/

https://github.com/illuspas/Node-Media-Server


ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000 \
    -c:v libx264 -preset ultrafast -b:v 1500k \
    -c:a aac -b:a 128k \
    -f flv rtmp://54.179.134.123/stream/test

ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 \
    -f lavfi -i sine=frequency=1000 \
    -c:v libx264 -preset ultrafast -b:v 1500k \
    -c:a aac -b:a 128k \
    -f flv rtmp://54.179.134.123/stream/test2


Alternative: Use Cloudflare Origin Certificate
In Cloudflare → SSL/TLS → Origin Server → Create Certificate
Download the certificate and key
Save them on EC2:
sudo mkdir -p /etc/ssl/cloudflare
sudo vi /etc/ssl/cloudflare/stream.mhamzah.id.pem   # paste certificate
sudo vi /etc/ssl/cloudflare/stream.mhamzah.id.key  # paste key
Update your host nginx config (/etc/nginx/sites-available/stream.mhamzah.id) to use these paths

