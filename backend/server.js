const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createHandler } = require('graphql-http/lib/use/express');
const { ruruHTML } = require('ruru/server');
require('dotenv').config();

const schema = require('./graphql/schema');
const resolvers = require('./graphql/resolvers');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// JWT auth middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_hrms_secret_key_2026');
      req.user = decoded;
    } catch (err) {
      // Token expired or invalid, let context handler check
    }
  }
  next();
});

// GraphQL API handler
app.all('/graphql', createHandler({
  schema: schema,
  rootValue: resolvers,
  context: (req) => ({
    user: req.raw.user
  })
}));

// Serve Ruru GraphQL Playground at root
app.get('/', (req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.listen(PORT, () => {
  console.log(`HRMS Backend running at http://localhost:${PORT}/graphql`);
  console.log(`GraphQL Playground available at http://localhost:${PORT}/`);
});
