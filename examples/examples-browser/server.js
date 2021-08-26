const http = require("http")
const https = require("https")
const fs = require("fs")

const hostname = fs.readFileSync("/etc/letsencrypt/live/hostname", "utf8").split("\n").filter(Boolean)[0]
const privateKey = fs.readFileSync("/etc/letsencrypt/live/{hostname}/privkey.pem".replace("{hostname}", hostname))
const certificate = fs.readFileSync("/etc/letsencrypt/live/{hostname}/cert.pem".replace("{hostname}", hostname))
const ca = fs.readFileSync("/etc/letsencrypt/live/{hostname}/chain.pem".replace("{hostname}", hostname))
const credentials = { key: privateKey, cert: certificate, ca: ca }

const express = require('express')
const path = require('path')
const { get } = require('request')

const app = express()

const cfg = {
  HTTP_PORT: 3000,
  HTTPS_PORT: 3001
}

function simpleStringify (object){
  var simpleObject = {};
  for (var prop in object ){
    if (!object.hasOwnProperty(prop)){
      continue;
    }
    if (typeof(object[prop]) == 'object'){
      continue;
    }
    if (typeof(object[prop]) == 'function'){
      continue;
    }
    simpleObject[prop] = object[prop];
  }
  return JSON.stringify(simpleObject); // returns cleaned up JSON
};

// redirect HTTP to HTTPS
app.all('*', (req, res, next) => {
  let protocol = req.headers['x-forwarded-proto'] || req.protocol;

  if (protocol == 'https') {
    next();
  } else {
    let port = cfg.HTTPS_PORT;
    port = ( port == 80 || port == 443 ? '' : ':' + port )
    console.log("PORT" + port)

    let from = `${protocol}://${req.hostname}${port}${req.url}`;
    let to = `https://${req.hostname}${port}${req.url}`;

    // log and redirect
    console.log(`[${req.method}]: ${from} -> ${to}`);
    res.redirect(to);
  }
});

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const viewsDir = path.join(__dirname, 'views')
app.use(express.static(viewsDir))
app.use(express.static(path.join(__dirname, './public')))
app.use(express.static(path.join(__dirname, '../images')))
app.use(express.static(path.join(__dirname, '../media')))
app.use(express.static(path.join(__dirname, '../../weights')))
app.use(express.static(path.join(__dirname, '../../dist')))

app.get('/', (req, res) => res.redirect('/webcam_face_landmark_detection_webgl'))
// app.get('/face_detection', (req, res) => res.sendFile(path.join(viewsDir, 'faceDetection.html')))
// app.get('/face_landmark_detection', (req, res) => res.sendFile(path.join(viewsDir, 'faceLandmarkDetection.html')))
// app.get('/face_expression_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'faceExpressionRecognition.html')))
// app.get('/age_and_gender_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'ageAndGenderRecognition.html')))
// app.get('/face_extraction', (req, res) => res.sendFile(path.join(viewsDir, 'faceExtraction.html')))
// app.get('/face_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'faceRecognition.html')))
// app.get('/video_face_tracking', (req, res) => res.sendFile(path.join(viewsDir, 'videoFaceTracking.html')))
//app.get('/webcam_face_detection', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceDetection.html')))
//app.get('/webcam_face_landmark_detection', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceLandmarkDetection.html')))
app.get('/webcam_face_landmark_detection_webgl', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceLandmarkDetectionWebgl.html')))
app.get('/webcam_face_landmark_detection_cpu', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceLandmarkDetectionCpu.html')))
app.get('/webcam_face_landmark_detection_wasm', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceLandmarkDetectionWasm.html')))
app.get('/webcam_camshift_opencv', (req, res) => res.sendFile(path.join(viewsDir, 'webcamCamshiftOpenCV.html')))
// app.get('/webcam_face_expression_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'webcamFaceExpressionRecognition.html')))
// app.get('/webcam_age_and_gender_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'webcamAgeAndGenderRecognition.html')))
// app.get('/bbt_face_landmark_detection', (req, res) => res.sendFile(path.join(viewsDir, 'bbtFaceLandmarkDetection.html')))
// app.get('/bbt_face_similarity', (req, res) => res.sendFile(path.join(viewsDir, 'bbtFaceSimilarity.html')))
// app.get('/bbt_face_matching', (req, res) => res.sendFile(path.join(viewsDir, 'bbtFaceMatching.html')))
// app.get('/bbt_face_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'bbtFaceRecognition.html')))
// app.get('/batch_face_landmarks', (req, res) => res.sendFile(path.join(viewsDir, 'batchFaceLandmarks.html')))
// app.get('/batch_face_recognition', (req, res) => res.sendFile(path.join(viewsDir, 'batchFaceRecognition.html')))

app.post('/fetch_external_image', async (req, res) => {
  const { imageUrl } = req.body
  if (!imageUrl) {
    return res.status(400).send('imageUrl param required')
  }
  try {
    const externalResponse = await request(imageUrl)
    res.set('content-type', externalResponse.headers['content-type'])
    return res.status(202).send(Buffer.from(externalResponse.body))
  } catch (err) {
    return res.status(404).send(err.toString())
  }
})

http.createServer(app).listen(cfg.HTTP_PORT)
https.createServer(credentials, app).listen(cfg.HTTPS_PORT)
console.log('Listening on port ' + cfg.HTTP_PORT + '(http), ' + cfg.HTTPS_PORT + '(https)')

function request(url, returnBuffer = true, timeout = 10000) {
  return new Promise(function(resolve, reject) {
    const options = Object.assign(
      {},
      {
        url,
        isBuffer: true,
        timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
        }
      },
      returnBuffer ? { encoding: null } : {}
    )

    get(options, function(err, res) {
      if (err) return reject(err)
      return resolve(res)
    })
  })
}