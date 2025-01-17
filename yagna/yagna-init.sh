#!/bin/sh

# start yagna service
nohup yagna service run --api-allow-origin=* >/dev/null 2>&1 &

echo 'Waiting 15 seconds for Yagna service to start...'
sleep 15

echo 'Funding Yagna ID...'
yagna payment fund && yagna payment init --sender

# check if app-key file exists
if [ ! -f "/app/yagna/config" ]; then
    # create app key and write to shared volume
    mkdir -p /app/yagna
    APP_KEY=$(yagna app-key create requestor)
    SPENDER_ADDRESS=$(yagna id show|grep nodeId|awk -F ' ' '{print $2}')
    echo "YAGNA_APP_KEY=$APP_KEY" >> /app/yagna/config
    echo "VITE_DEPOSIT_SPENDER_ADDRESS=$SPENDER_ADDRESS" >> /app/yagna/config    
    echo 'Yagna configure Create.'
fi

# keep container running
tail -f /dev/null
