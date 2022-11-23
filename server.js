const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");
const ffmpeg = require("ffmpeg-static");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const fluent_ffmpeg = require("fluent-ffmpeg");
const contentDisposition = require("content-disposition");
const cp = require("child_process");
const app = express();
const port = 3000;
const path = require('path');

// code made by @megsystem, plz give credit :)

//setup ffmpeg fluent
fluent_ffmpeg.setFfmpegPath(ffmpegPath);

// setup server
app.use(cors());
app.use(express.json());
app.listen(port, () => console.log(`Server is running on port ${port}`));

// get start
app.get('/youtube', function(req, res) {
  try {
    res.sendFile(path.join(__dirname, '/src/index.html'));
  } catch(err) {
    console.log("error ", err);
  }
});

app.get('/', function(req, res) {
  res.send('Working in progress - giovanni giannone');
});

// download mp4
app.get("/mp4", async (req, res) => {
  const { url: url } = req.query;
  if (!ytdl.validateID(url) && !ytdl.validateURL(url)) {
    return res
      .status(400)
      .json({ success: false, error: "No valid YouTube Id!" });
  }
  try {
    // get name video
    let download = "video.mp4";
    await ytdl.getInfo(url).then((info) => {
      download = info.videoDetails.title + ".mp4";
    });
    res.setHeader("Content-disposition", contentDisposition(download));

    // get youtube video
    const audio = await ytdl(url, { quality: "highestaudio" });
    const video = await ytdl(url, { quality: "highestvideo" });

    // download in browser
    const ffmpegProcess = cp.spawn(
      ffmpeg,
      [
        "-i",
        `pipe:3`,
        "-i",
        `pipe:4`,
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "copy",
        "-c:a",
        "libmp3lame",
        "-crf",
        "27",
        "-preset",
        "veryfast",
        "-movflags",
        "frag_keyframe+empty_moov",
        "-f",
        "mp4",
        "-loglevel",
        "error",
        "-",
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "pipe", "pipe"],
      }
    );

    await video.pipe(ffmpegProcess.stdio[3]);
    await audio.pipe(ffmpegProcess.stdio[4]);
    await ffmpegProcess.stdio[1].pipe(res);

    let ffmpegLogs = "";

    ffmpegProcess.stdio[2].on("data", (chunk) => {
      ffmpegLogs += chunk.toString();
    });

    ffmpegProcess.on("exit", (exitCode) => {
      if (exitCode === 1) {
        console.error(ffmpegLogs);
      }
    });
  } catch (err) {
    console.log("error ", err);
    res.redirect(`http://${req.headers.host}?error=downloadError`);
  }
});

// download mp3
app.get("/mp3", async (req, res) => {
  const { url: url } = req.query;
  if (!ytdl.validateID(url) && !ytdl.validateURL(url)) {
    return res
      .status(400)
      .json({ success: false, error: "No valid YouTube Id!" });
  }
  try {
    // get youtube video
    let stream = await ytdl(url, {
      quality: "highestaudio",
    });

    // set info
    let download = "song.mp3";
    await ytdl.getInfo(url).then((info) => {
      download = info.videoDetails.title + ".mp3";
    });
    res.setHeader("Content-disposition", contentDisposition(download));

    // download in browser
    await fluent_ffmpeg(stream).audioBitrate(128).format("mp3").pipe(res, {
      end: true,
    });
  } catch (err) {
    console.log("error ", err);
    res.redirect(`http://${req.headers.host}?error=downloadError`);
  }
});