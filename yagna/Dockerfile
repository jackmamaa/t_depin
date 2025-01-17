FROM python:latest

WORKDIR /app

ENV GOLEM_ACCEPT_TOS=yes
ENV BATCH_MODE=yes
ENV PATH="/root/.local/bin:${PATH}"

RUN curl -L https://join.golem.network/as-requestor --output as-requestor.sh
RUN chmod +x as-requestor.sh && ./as-requestor.sh
