const mongoose = require('mongoose');

const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
//the line below has to be on this position bc we want it to read the code of the app once we configured the environment variables
const app = require('./app');

//handling uncaught exceptions. Must be placed here. Before any code executes
process.on('uncaughtException', err => {
  console.log(err.name, err.message);
  process.exit(1);
});

//mongodb connection
// we replace with the environment variables
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => {
    //we log that it is connected
    console.log('Database Connected');
  });

const port = process.env.PORT || 3000;
//start server
const server = app.listen(port, () => {
  console.log('App running');
  console.log(process.env.NODE_ENV);
});
//handling unhandled rejection globally
//by doing server.close() we give the server time to finish the pending requests
//so it doesn't close abruptly
process.on('unhandledRejection', err => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
