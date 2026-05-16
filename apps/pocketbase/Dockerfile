FROM alpine:3.20

ARG POCKETBASE_VERSION=0.31.0

RUN apk add --no-cache ca-certificates unzip wget \
    && wget -O /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pocketbase.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/pocketbase \
    && rm /tmp/pocketbase.zip

WORKDIR /pb

COPY apps/pocketbase/pb_migrations ./pb_migrations
COPY apps/pocketbase/pb_hooks ./pb_hooks

EXPOSE 8090

CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--encryptionEnv=PB_ENCRYPTION_KEY", "--dir=/data", "--migrationsDir=./pb_migrations", "--hooksDir=./pb_hooks", "--hooksWatch=false"]
