FROM python:3.12-slim

WORKDIR /app

COPY plantctl.py /usr/local/bin/plantctl
COPY scenario.json /app/plant_state.json

RUN chmod +x /usr/local/bin/plantctl

CMD ["sleep", "infinity"]
