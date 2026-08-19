from pathlib import Path
import sys

try:
    import yaml
except ModuleNotFoundError as error:
    raise SystemExit("PyYAML is required: sudo pip3 install pyyaml") from error


ROOT = Path(__file__).resolve().parents[1]
COMPOSE_PATH = ROOT / "docker-compose.yml"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def main() -> int:
    config = yaml.safe_load(COMPOSE_PATH.read_text(encoding="utf-8"))
    require(isinstance(config, dict), "Compose document must be a mapping")
    services = config.get("services")
    require(isinstance(services, dict), "Compose document must define services")

    required_services = {"postgres", "redis", "migrate", "control-plane", "worker"}
    missing = required_services.difference(services)
    require(not missing, f"Missing required services: {', '.join(sorted(missing))}")

    for service_name in ("postgres", "redis"):
        service = services[service_name]
        require(bool(service.get("healthcheck")), f"{service_name} requires a healthcheck")

    migrate = services["migrate"]
    require(migrate.get("command") == ["pnpm", "db:migrate"], "migrate must run pnpm db:migrate")
    require(migrate.get("depends_on", {}).get("postgres", {}).get("condition") == "service_healthy", "migrate must await healthy PostgreSQL")

    for service_name, command in (("control-plane", ["pnpm", "start"]), ("worker", ["pnpm", "worker"])):
        service = services[service_name]
        require(service.get("command") == command, f"{service_name} has an unexpected command")
        depends_on = service.get("depends_on", {})
        require(depends_on.get("migrate", {}).get("condition") == "service_completed_successfully", f"{service_name} must await migration completion")
        require(depends_on.get("redis", {}).get("condition") == "service_healthy", f"{service_name} must await healthy Redis")
        environment = service.get("environment", {})
        require("SYNTHIA_POSTGRES_URL" in environment, f"{service_name} must configure PostgreSQL")
        require("REDIS_URL" in environment, f"{service_name} must configure Redis")

    require("synthia-postgres" in config.get("volumes", {}), "PostgreSQL volume is missing")
    require("synthia-redis" in config.get("volumes", {}), "Redis volume is missing")
    print("Compose topology validation passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, yaml.YAMLError) as error:
        print(f"Compose topology validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
