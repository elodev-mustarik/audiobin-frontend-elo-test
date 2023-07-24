import {Component, OnInit, Input} from '@angular/core';
import {S3File} from '../../interfaces/S3File.interface';

import streamSaver from 'streamsaver';
import {downloadZip} from 'client-zip';
import {MatDialog} from '@angular/material/dialog';

import {ActivatedRoute} from '@angular/router';
import {environment} from '../../../environments/environment';
import {LegacyProgressSpinnerMode as ProgressSpinnerMode} from '@angular/material/legacy-progress-spinner';
import {Meta, Title} from '@angular/platform-browser';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
})
export class PlayerComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private title: Title,
    private meta: Meta
  ) {}

  @Input() public doCommerce: boolean = false;
  @Input() callSelectFile!: (key: string) => void;
  @Input() mainFiles!: S3File[];
  @Input() tags: string[] = [];
  @Input() usedAsComponent: boolean = false;

  userId: string = '';
  projectId: string = '';

  projectInfo: any = [];
  contents: any = [];
  reportPositionID: any = null;

  cart_contents: any = [];

  progressMaskVisibility: 'hidden' | 'visible' = 'hidden';
  progress_text = 'working...';
  progress_indeterminate: ProgressSpinnerMode = 'indeterminate';
  progress_determinate: ProgressSpinnerMode = 'determinate';
  progress_mode = this.progress_indeterminate;
  progress_value = 0;
  progress_current_file = '';

  async ngOnInit(): Promise<void> {
    if (!this.usedAsComponent) {
      this.progress_text = 'Loading the Playlist';
      this.progressMaskVisibility = 'visible';

      this.route.queryParams.subscribe(async params => {
        // console.log('params', params);

        if (!params.uid || !params.id) {
          return;
        }

        this.userId = params.uid;
        this.projectId = params.id;
        // console.log(this.userId);
        // console.log(this.projectId);

        if (this.userId === '' || this.projectId === '') {
          return;
        }

        // here we collect the shared playlist project info.
        let p_url = environment.apiURL + 'getProjectInfo/' + this.projectId;
        // console.log('p_url', p_url);

        const p_response = await fetch(p_url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        const p_json = await p_response.json();
        // console.log('p_json',p_json);
        this.projectInfo = p_json.project[0];

        // set meta tags for sharing the links....
        this.title.setTitle(this.projectInfo[7]);

        this.meta.updateTag({name: 'description', content: this.projectInfo[7]});
        this.meta.updateTag({name: 'og:title', property: 'og:title', content: this.projectInfo[1]});
        this.meta.updateTag({
          name: 'og:description',
          property: 'og:description',
          content: this.projectInfo[7],
        });

        //  Here we collect the shared playlist contents.
        let url = environment.apiURL + 'getPlaylistContents/' + this.projectId + '/' + this.userId;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        const json = await response.json();
        // console.log(json);
        this.contents = json.contents;

        for (let i = 0; i < this.contents.length; i++) {
          let tagset = this.contents[i].tag_set;
          // console.log(tagset);
          for (let i = 0; i < tagset.length; i++) {
            let tag = tagset[i].Key;
            // console.log(tag);
            if (!this.tags.includes(tag)) {
              this.tags.push(tag);
            }
          }
        }
        this.tags.sort();

        for (let i = 0; i < this.contents.length; i++) {
          let file = this.contents[i];

          if (file.is_audio) {
            file.audio = new Audio();
            this.reportPosition(file);
          }
          if (file.is_image) {
            // console.log('file image url is ', file.signed_url);
          }
        }
        this.progressMaskVisibility = 'hidden';
      });
    }
  }

  async donatePage() {
    window.open('https://www.paypal.com/donate?hosted_button_id=H6T7HMMHSE6S4', '_new');
  }

  async loadFiles(): Promise<void> {
    // console.log("loadFiles");
    // console.log("files length", files.length);
    this.contents = [];

    for (let i = 0; i < this.mainFiles.length; i++) {
      let file = this.mainFiles[i];
      let s3url = '';
      let _audio = new Audio();
      if (file.isImage) {
        // console.log('file is image')
        s3url = file.s3ImageUrl;
      }
      if (file.isAudio) {
        // console.log('file is audio')
        s3url = file.s3Mp3Url;
        _audio.src = s3url;
      }
      if (file.isAudio || file.isImage) {
        this.contents.push({
          index: i,
          key: file.key,
          file_name: file.filename,
          duration: file.duration,
          tag_set: file.tagset,
          is_audio: file.isAudio,
          is_image: file.isImage,
          signed_url: s3url,
          audio: _audio,
          slider_position: 0,
          time_display: '',
          icon: 'play_arrow',
          icon_class: 'play-button',
          card_class: 'file-card',
          position_slider_class: 'position-slider-hidden',
          checked: file.checked,
        });
      }
    }

    this.contents.forEach((file: any) => {
      if (file.is_audio) {
        // file.audio.src = file.signed_url;
        this.reportPosition(file);
      }
    });
    // console.log(this.contents.length);
  }

  checkForTag(file: any, tag: string) {
    for (let i = 0; i < file.tag_set.length; i++) {
      if (file.tag_set[i].Key === tag) {
        return true;
      }
    }
  }

  async sliderChange(file: any, slider: any) {
    // console.log("target",target);
    // console.log('slider value', target.value);
    if (file.audio.src === '') {
      file.audio.addEventListener('canplay', () => {
        // file.slider_position = file.audio.duration * (parseInt(target.value) / 1000);
        file.audio.currentTime = file.audio.duration * (parseInt(slider.value) / 1000);
        file.time_display = this.getTimeDisplay(file);
      });
      file.audio.src = file.signed_url;
    } else {
      file.audio.currentTime = file.audio.duration * (parseInt(slider.value) / 1000);
      file.time_display = this.getTimeDisplay(file);
    }
  }

  playFile(file: any) {
    if (file.audio.paused) {
      this.contents.forEach((file: any) => {
        if (file.is_audio) {
          file.audio.pause();
          file.icon = 'play_arrow';
          file.card_class = 'file-card';
          file.position_slider_class = 'position-slider-hidden';
          file.icon_class = 'play-button';
        }
      });

      file.audio.addEventListener('ended', (event: any) => {
        console.log('ended');
        clearInterval(this.reportPositionID);
        file.icon = 'play_arrow';
        file.card_class = 'file-card';
        file.position_slider_class = 'position-slider-hidden';
        file.icon_class = 'play-button';
        file.time_display = '0.00 / ' + this.getMinutesAndSeconds(file.duration);
        this.playNextFile(file);
      });

      file.audio.addEventListener('error', (event: any) => {
        console.log('error', event);
      });

      if (file.audio.src === '') {
        console.log("file.audio.src === '' ");

        file.audio.addEventListener('canplay', () => {
          console.log('canplay');
          file.audio.play();
        });

        file.audio.src = file.signed_url;
      } else {
        console.log('file.audio.src ', file.audio.src);
        console.log('about to play');
        file.audio.play();
      }

      file.icon = 'pause';
      file.card_class = 'file-card-selected';
      file.position_slider_class = 'position-slider-shown';
      file.icon_class = 'playing';
      clearInterval(this.reportPositionID);
      this.reportPositionID = setInterval(() => this.reportPosition(file), 500);
    } else {
      file.audio.pause();
      clearInterval(this.reportPositionID);
      file.icon = 'play_arrow';
      file.card_class = 'file-card';
      file.icon_class = 'play-button';
    }
  }

  playNextFile(file: any) {
    let next_index = file.index + 1;
    console.log('playNextFile', next_index);
    if (next_index < this.contents.length) {
      if (file.tag_set.length && this.contents[next_index].tag_set.length) {
        if (this.contents[next_index].tag_set[0].Key === file.tag_set[0].Key) {
          this.playFile(this.contents[next_index]);
        }
      } else {
        this.playFile(this.contents[next_index]);
      }
    }
  }

  chooseFile(key: string, checked: boolean) {
    console.log('chooseFile', checked);
    for (const file of this.contents) {
      if (file.key === key) {
        file.checked = checked;
      }
    }
  }

  selectFile(file: any) {
    this.callSelectFile(file.key);
  }

  buyFile(file: any) {
    if (!this.cart_contents.includes(file)) this.cart_contents.push(file);
  }

  clearCart() {
    this.cart_contents = [];
  }

  reportPosition(file: any) {
    file.slider_position = this.getSliderPosition(file);
    file.time_display = this.getTimeDisplay(file);
  }

  getSliderPosition(file: any) {
    return (file.audio.currentTime / file.audio.duration) * 1000;
  }

  getTimeDisplay(file: any) {
    return (
      this.getMinutesAndSeconds(file.audio.currentTime) +
      ' / ' +
      this.getMinutesAndSeconds(file.audio.duration || file.duration)
    );
  }

  getMinutesAndSeconds(time: number) {
    let mind = time % (60 * 60);
    let minutes = Math.floor(mind / 60);
    let sec_d = mind % 60;
    let seconds = Math.ceil(sec_d);
    let seconds_str = '0' + seconds;
    seconds_str = seconds_str.slice(-2);
    return minutes + ':' + seconds_str;
  }

  async downloadCart() {
    let files: any = [];

    for (let i = 0; i < this.cart_contents.length; i++) {
      let file = this.cart_contents[i];
      files.push({name: file.file_name, input: await fetch(file.signed_url)});
    }

    if (files.length)
      await downloadZip(files).body?.pipeTo(streamSaver.createWriteStream('Playlist Files.zip'));
  }
}
