FROM node:22-slim

RUN groupadd --system synthia && useradd --system --gid synthia --create-home synthia
WORKDIR /workspace
USER synthia
CMD ["sleep", "infinity"]
