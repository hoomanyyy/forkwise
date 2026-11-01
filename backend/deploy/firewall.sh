#!/usr/bin/env bash
docker network inspect forkwise-net >/dev/null 2>&1 || docker network create --driver bridge --subnet 172.30.0.0/16 -o com.docker.network.bridge.name=fwbr0 -o com.docker.network.bridge.enable_icc=false forkwise-net
iptables -C INPUT -i fwbr0 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -I INPUT -i fwbr0 -m conntrack --ctstate NEW -j DROP
for net in 169.254.0.0/16 10.0.0.0/8 192.168.0.0/16 172.16.0.0/12 100.64.0.0/10; do
    iptables -C DOCKER-USER -i fwbr0 -d "$net" -j DROP 2>/dev/null || iptables -I DOCKER-USER -i fwbr0 -d "$net" -j DROP
done
