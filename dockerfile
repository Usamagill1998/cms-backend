FROM node:lts
WORKDIR /app
COPY . ./
# Install dependencies using yarn without the frozen-lockfile flag
RUN yarn install
CMD ["yarn", "start"]