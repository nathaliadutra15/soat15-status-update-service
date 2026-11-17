export default () => ({
  auth: {
    authorizationServerUrl: process.env.AUTHORIZATION_SERVER_URL,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  database: {
    mongoUri: process.env.MONGO_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'secret',
  },
  queue: {
    rmq_url: process.env.RMQ_URL,
    status: process.env.STATUS_QUEUE_NAME,
  },
  requestedService: {
    url: process.env.REQUESTED_SERVICE_URL,
  },
});
