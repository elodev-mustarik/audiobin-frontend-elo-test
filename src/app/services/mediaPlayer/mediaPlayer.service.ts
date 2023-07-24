import {Injectable} from '@angular/core';
import {
  HttpClient,
  HttpRequest,
  HttpEvent,
  HttpEventType,
  HttpHeaders,
  HttpErrorResponse,
  HttpHandler,
  HttpResponse,
} from '@angular/common/http';
import {lastValueFrom, Observable, Subject} from 'rxjs';
import {first, map, startWith} from 'rxjs/operators';

import {Mp3ParserService} from '../mp3Parser/mp3Parser.service';
import {S3File} from '../../interfaces/S3File.interface';

import type LibAVJS from 'libav.js';

declare let LibAV: LibAVJS.LibAVWrapper;

@Injectable()
export class MediaPlayerService {
  constructor(private http: HttpClient, private mp3ParserService: Mp3ParserService) {
    this.init();
    this.initMasterGain();
  }

  audio_context_samplerate = 48000;

  files: S3File[] = [];

  libav: any;
  bitrate: number = 0;
  // nbRegionsReadyToStream: number = 0;

  public isPlaying = false;
  public volume = 80;
  public slider_offset = 0;
  public slider_position = 0.0;
  public max_duration = 0.0;
  public position_value = '0:00 / 0:00';
  public init_time = 0.0;

  public downloadDisabled = true;
  public playdisabled = true;
  public actiondisabled = true;
  public deletedisabled = true;
  public got_audio_files = false;
  public got_video_files = false;

  public play_icon = 'play_arrow';

  public intervalID: any = null;

  ctx = new window.AudioContext(); //{sampleRate: this.audio_context_samplerate});
  masterGainNode = this.ctx.createGain();
  masterCompressorNode = this.ctx.createDynamicsCompressor();

  async init() {
    this.libav = await LibAV.LibAV();
  }

  initMasterGain() {

    // Setting up a master Limiter (compressor with ratio at max) to avoid clipping.
    this.masterGainNode.gain.value = 0.8; // 80 %
    this.masterCompressorNode.threshold.value = -2;
    this.masterCompressorNode.knee.value = 20;
    this.masterCompressorNode.ratio.value = 20;
    this.masterCompressorNode.attack.value = 0.006;
    this.masterCompressorNode.release.value = 0.05;
    this.masterGainNode.connect(this.masterCompressorNode);
    this.masterCompressorNode.connect(this.ctx.destination);
  }

  /* Transport Functions */

  /* =================== */

  async showTimer() {
    let current_position = 0.0;
    if (!this.isPlaying) {
      // console.log(this.slider_position);

      if (this.max_duration === 0) {
        this.slider_position = 0;
      } else {
        current_position = (this.max_duration * this.slider_position) / 1000;
        this.slider_position = (current_position * 1000) / this.max_duration;
        // console.log(this.slider_position);
      }

      // Seek Video to the current position.
      if (this.got_video_files) {
        this.files.forEach((file: S3File) => {
          if (file.checked && file.isVideo) {
            let video_element = document.getElementById(file.key) as HTMLVideoElement;
            video_element.currentTime = current_position;
          }
        });
      }

      this.position_value =
        this.getMinutesAndSeconds(this.slider_position) +
        ' / ' +
        this.getMinutesAndSeconds(this.max_duration);
    } else {
      if (this.got_video_files) {
        this.files.forEach((file: S3File) => {
          if (file.checked && file.isVideo) {
            let video_element = document.getElementById(file.key) as HTMLVideoElement;
            current_position = video_element.currentTime;
            this.slider_position = (current_position * 1000) / this.max_duration;
          }
        });
        this.position_value =
          this.getMinutesAndSeconds(current_position) +
          ' / ' +
          this.getMinutesAndSeconds(this.max_duration);
      }
      if (this.got_audio_files) {
        if (this.ctx.currentTime - this.init_time >= this.max_duration) {
          await this.stop().then(() => {
            this.slider_offset = 0;
            this.slider_position = 0;
            this.showTimer();
          });
          return;
        }

        if (this.max_duration > 0) {
          this.slider_position =
            ((this.ctx.currentTime - this.init_time) * 1000) / this.max_duration;
        } else {
          this.slider_position = 0;
        }

        current_position = this.ctx.currentTime - this.init_time;
        this.position_value =
          this.getMinutesAndSeconds(current_position) +
          ' / ' +
          this.getMinutesAndSeconds(this.max_duration);

        // Sync Video to the best of our ability.
        if (this.got_video_files) {
          this.files.forEach((file: S3File) => {
            if (file.checked) {
              if (file.isVideo) {
                let video_element = document.getElementById(file.key) as HTMLVideoElement;
                if (
                  video_element.currentTime < current_position - 0.5 ||
                  video_element.currentTime > current_position + 0.5
                ) {
                  video_element.currentTime = current_position;
                }
              }
            }
          });
        }
      } else {
        if (this.got_video_files) {

          // Sync other videos with the first one //
          let first_video: HTMLVideoElement;
          const result: S3File[] = this.files.filter(file => file.checked && file.isVideo);

          result.forEach((file: S3File) => {
            let video_element = document.getElementById(file.key) as HTMLVideoElement;

            if (!first_video) {
              console.log('Found first video');
              first_video = video_element;
            } else {
              if (
                video_element.currentTime < first_video.currentTime - 0.3 ||
                video_element.currentTime > first_video.currentTime + 0.3
              ) {
                video_element.currentTime = first_video.currentTime;
              }
            }

          });
        }
      }
    }
  }

  getMinutesAndSeconds(time: number) {
    var mind = time % (60 * 60);
    var minutes = Math.floor(mind / 60);
    var secd = mind % 60;
    var seconds = Math.ceil(secd);
    var secondsstr = '0' + seconds;
    secondsstr = secondsstr.slice(-2);
    return minutes + ':' + secondsstr;
  }

  async sliderChange(slider: any) {
    if (this.isPlaying) {
      // console.log('stopping playing from slider change');

      await this.stop().then(() => {
        this.slider_position = slider.value;
        this.slider_offset = (this.slider_position * this.max_duration) / 1000;
        // console.log('ready for playing from slider change');
        this.play();
      });
    } else {
      this.slider_offset = (slider.value * this.max_duration) / 1000;

      // let current_position = (this.max_duration * slider.value) / 1000;
      // this.position_value =
      //     this.getMinutesAndSeconds(current_position) +
      //     ' / ' +
      //     this.getMinutesAndSeconds(this.max_duration);
      this.showTimer();
    }
  }

  volumeChange(slider: any) {
    // console.log(slider.value);
    this.masterGainNode.gain.value = slider.value / 100;
  }

  cardMuteClick(event: any) {
    event.stopPropagation();
  }

  cardMuteChange(checker: any, file: S3File) {
    let video_element = document.getElementById(file.key) as HTMLVideoElement;
    file.volume = checker.checked ? 1 : 0;
    video_element.muted = checker.checked ? false : true;
  }

  async getFileDuration(file: S3File) {
    if (file.isAudio) {
      // Create a non-dom allocated Audio element
      // let au = document.createElement('audio');
      //
      // // Define the URL of the MP3 audio file
      // // Once the metadata has been loaded, display the duration in the console
      // au.addEventListener('loadedmetadata', function() {
      //   // Obtain the duration in seconds of the audio file (with milliseconds as well, a float value)
      //   file.duration = au.duration;
      //   console.log('The duration of the song is of: ' + file.duration + ' seconds');
      // }, true);
      //
      // console.log(file.s3Mp3Url);
      // au.src = file.s3Mp3Url;


    }

    if (file.isVideo) {
      let video_element = document.getElementById(file.key) as HTMLVideoElement;
      if (video_element.duration > this.max_duration) {
        this.max_duration = video_element.duration;
      }
    }
  }

  async getMaxDuration(): Promise<void> {
    // console.log("getMaxDuration ", this.files.length);
    this.max_duration = 0.0;
    this.got_audio_files = false;
    this.got_video_files = false;
    for (let file of this.files) {
      if (file.checked) {
        await this.getFileDuration(file);
        await this.fetchMP3Header(file);

        if (file.isAudio) {
          if (file.duration > this.max_duration) {
            this.max_duration = file.duration;
          }
          this.got_audio_files = true;
        }
        if (file.isVideo) {
          this.got_video_files = true;
        }
      }
      this.playdisabled = !(this.got_audio_files || this.got_video_files);
    }
    this.showTimer();
    // console.log('getMaxDuration finished', this.got_audio_files);
  }

  async fetchMP3Header(file: S3File) {
    if (file.isAudio) {
      // console.log(2.1);

      file.firstEmpiricalChunk = await this.fetchChunk(file, 0, 1000);
      // console.log(2.2);
      file.id3V2Offset = this.mp3ParserService.getId3V2Offset(file.firstEmpiricalChunk);
      // console.log(2.3);

      // console.log('fetchmp3header -> id3V2Offset', file.id3V2Offset, file.filename);
      const firstFrameHeaderInfo = this.mp3ParserService.getFrameHeader(
        file.firstEmpiricalChunk.slice(file.id3V2Offset),
      );


      // console.log(2.4);

      const {samplesPerFrame, bitrate, frequency, padding} = firstFrameHeaderInfo;
      if (typeof frequency !== 'number') throw new Error('FF');
      this.bitrate = bitrate;
      // console.log(2.5);

      file.frameSize = this.mp3ParserService.getFrameSize(
        samplesPerFrame,
        bitrate,
        frequency,
        padding,
      );
      // console.log(2.6);

    }
  }

  async initLibAV() {
    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];
      const [encoder, filterGraph] = await Promise.all([
        this.libav.ff_init_decoder('mp3'),
        this.libav.ff_init_filter_graph(
          'anull',
          {
            sample_fmt: this.libav.AV_SAMPLE_FMT_S16P,
            channel_layout: 3,
          },
          {
            sample_fmt: this.libav.AV_SAMPLE_FMT_FLTP,
            channel_layout: 3,
            sample_rate: 48000,
          },
        ),
      ]);

      file.filterGraph = filterGraph;
      file.codecContextPointer = encoder[1];
      file.packetPointer = encoder[2];
      file.framePointer = encoder[3];
      file.filterGraph = filterGraph;
      if (file.packetPointer === 0) throw new Error();
      if (file.framePointer === 0) throw new Error('Could not allocate audio frame');
      if (file.codecContextPointer === 0) throw new Error('Codec not found');
    }
  }

  async fetchChunkAndIncrementRange(file: S3File) {
    if (!file.frameSize || !file.buffer_range_start) {
      console.log('line 703');
      console.log(file.frameSize, file.buffer_range_start);
      throw new Error('FF');
    }
    const chunkSize = file.frameSize * 100;
    const rangeStart = file.buffer_range_start;
    const rangeEnd = rangeStart + chunkSize;
    file.buffer_range_start = rangeEnd;
    const arrayBuffer = await this.fetchChunk(file, rangeStart, rangeEnd - 1);

    await (this.libav as any).ff_set_packet(file.packetPointer, new Uint8Array(arrayBuffer));
    return this.decode(file);
  }

  async fetchChunk(file: S3File, rangeStart: number, rangeEnd: number) {
    // if (!this.s3FileUrl) throw new Error('FF');

    if (rangeStart >= file.mp3filesize) return new ArrayBuffer(1);
    if (rangeEnd > file.mp3filesize) rangeEnd = file.mp3filesize;

    const headers = new HttpHeaders({
      range: `bytes=${rangeStart}-${rangeEnd}`,
    });
    const req = new HttpRequest('GET', file.s3Mp3Url, {
      headers: headers,
      responseType: 'arraybuffer',
    });
    return ((await lastValueFrom(this.http.request<ArrayBuffer>(req))) as HttpResponse<ArrayBuffer>)
      .body as ArrayBuffer;
  }

  async decode(file: S3File) {
    if (!this.libav) {
      console.log('line 343', file);
      throw new Error('FF');
    }
    if (
      !file.packetPointer ||
      !file.framePointer ||
      !file.codecContextPointer ||
      !file.filterGraph
    ) {
      console.log('line 353', file);
      throw new Error('FF');
    }
    const libav = this.libav;
    const packetPointer = file.packetPointer;
    const framePointer = file.framePointer;
    const codecContextPointer = file.codecContextPointer;
    const filterGraph = file.filterGraph;
    const frames: LibAVJS.Frame[] = [];
    const ret = await this.libav.avcodec_send_packet(codecContextPointer, packetPointer);
    if (ret < 0) return; // throw new Error('Error submitting the packet to the decoder');
    async function readFrame() {
      const ret = await libav.avcodec_receive_frame(codecContextPointer, framePointer);
      if (ret === -libav.EAGAIN || ret === libav.AVERROR_EOF) {
        return;
      } else if (ret < 0) {
        throw new Error('avcodec_receive_frame: ' + ret);
      }
      const frameObj = await libav.ff_copyout_frame(framePointer);
      if (!frameObj) throw new Error('FF');
      frames.push(frameObj);
      await readFrame();
    }

    await readFrame();
    return this.libav.ff_filter_multi(filterGraph[1], filterGraph[2], framePointer, frames);
  }

  queueFramesToPlay(file: S3File, frames: LibAVJS.Frame[]) {
    if (!this.isPlaying) return;
    // console.log('queueFramesToPlay', frames);
    if (!frames) return;

    const buffer = new AudioBuffer({
      numberOfChannels: 2,
      sampleRate: 48000,
      length: frames.reduce((acc, f) => acc + f.data[0].length, 0),
    });
    let offset = 0;
    for (const f of frames) {
      buffer.copyToChannel(f.data[0], 0, offset);
      buffer.copyToChannel(f.data[1], 1, offset);
      offset += f.data[0].length;
    }
    let absn = this.ctx.createBufferSource();
    absn.buffer = buffer;
    absn.onended = async () => {
      if (!this.isPlaying) return;
      const newFrames = await this.fetchChunkAndIncrementRange(file);
      this.queueFramesToPlay(file, newFrames);
      const absnIndex = file.source.indexOf(absn);
      file.source.splice(absnIndex, 1);
    };
    file.source.push(absn);
    absn.connect(this.masterGainNode);
    if (typeof file.nextStartTime !== 'number') throw new Error('FF');
    absn.start(file.nextStartTime);
    file.nextStartTime += buffer.duration;
  }

  async play() {
    if (!this.got_audio_files && !this.got_video_files) return;

    this.isPlaying = true;
    this.play_icon = 'pause';

    if (this.got_audio_files && !this.bitrate) {
      console.log('line 433');
      throw new Error('FF');
    }

    const current_position = (this.max_duration * this.slider_position) / 1000;
    // console.log('this.max_duration', this.max_duration);
    // console.log('this.slider_position', this.slider_position);

    const exactRangeStart =
      this.mp3ParserService.getBytesPerSecond(this.bitrate) * current_position;

    // console.log('rangeStart', exactRangeStart);
    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];

      if (file.checked && file.isAudio) {
        // console.log(file.frameSize, file.id3V2Offset, file)
        if (!file.frameSize || !file.id3V2Offset) throw Error('ff');

        file.buffer_range_start =
          file.id3V2Offset + (exactRangeStart - (exactRangeStart % file.frameSize));
        // file.preloadedFrames = [...(await this.fetchChunkAndIncrementRange(file))];
        file.preloadedFrames = await this.fetchChunkAndIncrementRange(file);
      }
    }

    this.init_time = this.ctx.currentTime - this.slider_offset;

    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];
      if (file.checked && file.isAudio) {
        file.nextStartTime = this.ctx.currentTime;
        this.queueFramesToPlay(file, file.preloadedFrames);
      }
    }

    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];
      if (file.checked && file.isAudio) {
        const frames = await this.fetchChunkAndIncrementRange(file);
        this.queueFramesToPlay(file, frames);
      }
    }

    this.startTimer();
    this.playVideos();
  }

  startTimer() {
    this.intervalID = setInterval(() => this.showTimer(), 250);
  }

  stopTimer() {
    clearInterval(this.intervalID);
    this.intervalID = null;
  }

  async stop(): Promise<void> {
    if (!this.isPlaying) return;
    if (!this.got_audio_files && !this.got_video_files) return;

    this.isPlaying = false;
    this.stopTimer();

    // console.log('stopping!');
    for (let i = 0; i < this.files.length; i++) {
      let file = this.files[i];
      if (file.checked && file.isAudio) {
        try {
          for (let i = 0; i < file.source.length; i++) {
            // console.log('stop source');
            file.source[i].stop();
            file.source[i].onended = null;
          }
          file.source = [];
        } catch (error) {
          console.log('file ' + file.index + ' src 0 already stopped');
        }
      }
    }
    this.play_icon = 'play_arrow';
    this.stopVideos();
    this.slider_offset = (this.slider_position * this.max_duration) / 1000;
    return;
  }

  playVideos() {
    // console.log("playVideos()");
    this.files.forEach(file => {
      if (file.checked && file.isVideo) {
        let video_element = document.getElementById(file.key) as HTMLVideoElement;
        video_element.muted = file.volume === 1 ? false : true;

        video_element.currentTime = this.slider_offset;
        video_element.play();
      }
    });
  }

  stopVideos() {
    this.files.forEach((file: S3File) => {
      if (file.checked && file.isVideo) {
        let video_element = document.getElementById(file.key) as HTMLVideoElement;
        video_element.pause();
      }
    });
  }
}
