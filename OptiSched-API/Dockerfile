# ---------- Estágio de build ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# ---------- Estágio de execução ----------
FROM eclipse-temurin:21-jre

WORKDIR /app

# Fixed uid (not just a name) so it's reproducible across rebuilds — matters
# because app.key/app.pub are bind-mounted from the host (see
# docker-compose.yml/docker-compose.prod.yml) and keep their host ownership;
# the host files must be readable by this uid (e.g. `chmod 644 app.key
# app.pub`, since exactly matching a given uid on every host isn't
# practical). 1001, not 1000: this Ubuntu-based image already ships a
# built-in "ubuntu" user at uid 1000.
RUN useradd --uid 1001 --create-home --shell /usr/sbin/nologin appuser

COPY --from=build /app/target/*.jar app.jar

USER appuser

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]