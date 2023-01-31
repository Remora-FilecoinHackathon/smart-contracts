FROM node:16.17
COPY . /opt/remora 
WORKDIR /opt/remora
RUN ["npm", "i"]
ENTRYPOINT [ "npx", "hardhat", "run", "/opt/remora/scripts/testEvents.ts" ]