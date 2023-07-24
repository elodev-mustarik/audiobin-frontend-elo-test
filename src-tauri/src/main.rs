#![cfg_attr(
    all(not(debug_assertions), target_os = "macOS"),
    windows_subsystem = "macOS"
)]

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            download,
            open_docs,
            open_recorder,
            is_recorder_installed
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use chrono::Utc;
use dirs;
// use execute::Execute;
use futures_util::StreamExt;
use reqwest::Client;
use std::cmp::min;
use std::env;
use std::fs::File;
use std::io::Write;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use tauri::http::header::ACCEPT;

#[tauri::command]
async fn download(url: String, path: String, token: String) -> Result<(), String> {
    println!("downloadedurl => {}", url);
    let desk_dir: Option<PathBuf> = dirs::desktop_dir();

    let dir_path = desk_dir.expect("REASON").as_path().display().to_string();
    let save_path = dir_path + "/" + &path;
    println!("path => {}", path);
    println!("token => {}", token);

    // std::fs::create_dir_all("~/Desktop/Download").expect("Download");

    let start_time = Utc::now();
    println!("start_time => {}", start_time.to_rfc3339());
    let client = Client::new();
    let res = client
        .get(&url)
        .header("Authorization", token)
        .header(ACCEPT, "application/octet-stream")
        .send()
        .await
        .or(Err(format!("error `{}` ", &url)))?;
    let total_size = res.content_length().ok_or(format!("error `{}` ", &url))?;

    let mut file = File::create(&save_path).or(Err(format!(" `{}` ", &path)))?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();
    while let Some(item) = stream.next().await {
        let chunk = item.or(Err(format!("error `{}` format", &path)))?;
        file.write(&chunk)
            .or(Err(format!("error `{}` chunk", &path)))?;
        downloaded = min(downloaded + (chunk.len() as u64), total_size);
        // let duration = start_time.elapsed().as_secs_f64();
        // let speed = if duration > 0.0 {
        //     Some(downloaded as f64 / duration / 1024.0 / 1024.0)
        // } else {
        //     None
        // };
        println!("downloaded => {}", downloaded);
        println!("total_size => {}", total_size);

        // progress_value =  String.from((downloaded / total_size) as f64);

        // println!("speed => {:?}", speed);
    }

    return Ok(());
}

#[tauri::command]
async fn open_docs(handle: tauri::AppHandle) {
    println!("Command Called open_docsin tauri");
    let _docs_window = tauri::WindowBuilder::new(
        &handle,
        "external",   /* the unique window label */
        tauri::WindowUrl::App("chat.html".into()), 
    )
    .always_on_top(false)
    .visible(true)
    .title("SoftCollab Contact")
    .resizable(false)
    .inner_size(400.0, 600.0)
    .build()
    .unwrap();
}

#[tauri::command]
async fn open_recorder() {
    // (handle: tauri::AppHandles)
    println!("Command Called open_recorder in tauri");

    let mut ffmpeg_path: &str = "";
    if cfg!(target_os = "macos") {
        ffmpeg_path = "/Applications/SoftCollab Recorder.app/Contents/MacOS/SoftCollab Recorder"
    }

    println!("File_name: {}", ffmpeg_path);

    let _command = Command::new(ffmpeg_path).spawn().expect("Child process failed to start.");
    
    
    // command.arg("-i");
    // command.arg("/path/to/media-file");
    // command.arg("/path/to/output-file");

    // if let Some(exit_code) = command.execute().unwrap() {
    //     if exit_code == 0 {
    //         println!("Ok.");
    //     } else {
    //         eprintln!("Failed.");
    //     }
    // } else {
    //     eprintln!("Interrupted!");
    // }
}

#[tauri::command]
fn is_recorder_installed() -> bool {
    println!("Command Called open_recorder in tauri");

    let mut ffmpeg_path: &str = "";
    if cfg!(target_os = "macos") {
        ffmpeg_path = "/Applications/SoftCollab Recorder.app/Contents/MacOS/SoftCollab Recorder"
    }
    println!("File_name: {}", ffmpeg_path);

    let is_installed = Path::new(ffmpeg_path).exists();
    println!("is_installed: {}", is_installed);

    return is_installed;
}
