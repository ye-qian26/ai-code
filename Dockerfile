FROM eclipse-temurin:21-jre

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium chromium-driver fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Inject runtime configuration with: docker run --env-file .env ...
ENV SPRING_PROFILES_ACTIVE=prod \
    TZ=Asia/Shanghai \
    JAVA_OPTS=""

# Place the built jar next to this Dockerfile before docker build.
# If the jar name changes, update this path.
COPY yu-ai-code-mother-0.0.1-SNAPSHOT.jar /app/app.jar

RUN mkdir -p /app/tmp/code_output /app/tmp/code_deploy /app/tmp/screenshots

EXPOSE 8081

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
