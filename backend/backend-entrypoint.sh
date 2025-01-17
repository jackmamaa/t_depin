#!/bin/sh

# wait for yagna app-key file generation
echo "Waiting for yagna configure..."
while [ ! -f /app/yagna/config ] || [ ! -s /app/yagna/config ]
do
    sleep 2
done

echo -n -e "$(cat /app/yagna/config)" > /app/.env
echo "yagna configure loaded."
sleep 15

# start server
exec npm run dev 