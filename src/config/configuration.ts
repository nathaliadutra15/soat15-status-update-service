
export default () => ({
  database: {
    mongoUri: process.env.MONGO_URI,
  },
    requestedService: {
    url: process.env.REQUESTED_SERVICE_URL,
  },
  auth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    authorizationServerUrl: process.env.AUTHORIZATION_SERVER_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'sssss',
    },
});
