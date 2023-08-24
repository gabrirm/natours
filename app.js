//core modules
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();
//we set pug a the view engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL MIDDLEWARES
// cors
// simple requests
app.use(cors());
// non simple requests (delete, update...)
app.options('*', cors());
// Securing HTTP headers
app.use(helmet());
// Further HELMET configuration for Security Policy (CSP)
const scriptSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://api.tiles.mapbox.com/',
  'https://api.mapbox.com/',
  'https://*.cloudflare.com',
  'https://js.stripe.com/v3/',
  'https://checkout.stripe.com'
];
const styleSrcUrls = [
  'https://unpkg.com/',
  'https://tile.openstreetmap.org',
  'https://fonts.googleapis.com/',
  'https://api.mapbox.com/',
  'https://api.tiles.mapbox.com/',
  'https://fonts.googleapis.com/',
  'https://www.myfonts.com/fonts/radomir-tinkov/gilroy/*',
  ' checkout.stripe.com'
];
const connectSrcUrls = [
  'https://unpkg.com',
  'https://tile.openstreetmap.org',
  'https://*.mapbox.com/',
  'https://*.cloudflare.com',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:52191',
  '*.stripe.com'
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

//set security http headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:', 'https:', 'ws:'],
      baseUri: ["'self'"],
      connectSrc: [
        "'self'",
        "'unsafe-inline'",
        'data:',
        'blob:',
        'https://*.stripe.com',
        'https://*.mapbox.com',
        'https://*.cloudflare.com/',
        'https://bundle.js:*',
        'ws://127.0.0.1:*/',
        ...connectSrcUrls
      ],
      scriptSrc: [
        "'self'",
        'https:',
        'http:',
        'blob:',
        'https://*.mapbox.com',
        'https://js.stripe.com',
        'https://m.stripe.network',
        'https://*.cloudflare.com',
        ...scriptSrcUrls
      ],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.tiles.mapbox.com',
        'https://api.mapbox.com',
        'https://events.mapbox.com',
        'https://m.stripe.network'
      ],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
      fontSrc: ["'self'", ...fontSrcUrls],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  })
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
//middleware to limit the number of requests
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 100 hundres req per 1 hour
  message: 'Too many requests from this IP. Please try again in an hour'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
// Parse data from url encoded forms
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Cookie parser from request
app.use(cookieParser());

// Data sanitization against NOSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());
// Prevent parameter pollution (duplicate parameters for ex.)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// compressing for res json and html compression
app.use(compression());

//serving static files
app.use(express.static(path.join(__dirname, 'public')));

// ROUTES
// mounting routes
app.use('/', viewRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//unhandled routes
//app.all covers get, post, update...
app.all('*', (req, res, next) => {
  //if we pass an argument to the next function, it'll automatically know that it's an error
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
//global error handling middleware
app.use(globalErrorHandler);

module.exports = app;
