import os
import subprocess
import threading

import time
from datetime import datetime

from aws_buckets import liveupload_to_s3
from dotenv import load_dotenv

load_dotenv()

AF_ACCESS_KEY = os.getenv('AF_ACCESS_KEY')
AF_SECRET_KEY = os.getenv('AF_SECRET_KEY')
BUCKET_NAME = 'bucket-test-live-camera1'

today = datetime.now().strftime("%Y%m%d")

# Formatação rtsp://user:password@ip_address:port/cam/realmonitor?channel=1&subtype=0
url = 'rtsp://admin:Wt123456@192.168.1.162:554/cam/realmonitor?channel=1&subtype=0'

# Pasta do FFmpeg
ffmpeg_folder = os.path.join(os.getcwd(), 'liveCamTest/ffmpeg-essentials/bin')
ffmpeg_path = os.path.join(ffmpeg_folder, 'ffmpeg.exe')

# Pasta para Arquivos HLS e de Gravação
hls_folder = 'liveCamTest/liveCamHLS'
rec_folder = 'liveCamTest/liveCamRec'

# liveupload_to_s3(AF_ACCESS_KEY, AF_SECRET_KEY, compressed_name, 'bucket-teste-camera1', f'frontcam_{today}.mp4')
uploaded = set()
    
def hls_capture():  # Gravação ao vivo basicamente

    # Nome do arquivo de saída da playlist
    playlist = os.path.join(hls_folder, 'frontcam.m3u8')

    # Gerar HLS
    hls_command = [
        ffmpeg_path,
        '-i', url,
        '-vf', 'scale=640:360',
        '-r', '10',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-g', '50',
        '-sc_threshold', '0',
        '-f', 'hls',
        '-hls_time', '5',              # 5 segundos por segmento
        '-hls_list_size', '5',         # manter só os últimos 5 segmentos
        '-hls_flags', 'delete_segments',
        playlist
    ]

    subprocess.run(hls_command)

def rtsp_recording(): # Gravação geral pro BD
    segment_duration = 120 # Mantém em segundos

    # Nome do arquivo de saída da playlist
    recording = os.path.join(rec_folder, f'output_{today}_%03d.mp4')
    final_recording = os.path.join(rec_folder, f'frontcam_{today}.mp4')

    # Pasta para Arquivos de Gravação
    rec_command = [
        ffmpeg_path,
        '-i', url,
        '-vf', 'scale=640:360',
        '-r', '10',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-f', 'segment',
        '-segment_time', str(segment_duration),
        '-reset_timestamps', '1',
        recording
    ]

    process = subprocess.Popen(rec_command)

    last_checked = 0
    segment_index = 0

    try:
        while True:
            next_segment = os.path.join(rec_folder, f'output_{segment_index:03d}.mp4')
            if os.path.exists(next_segment):
                if not os.path.exists(final_recording):
                    os.rename(next_segment, final_recording)
                else:
                    temp_concat = os.path.join(rec_folder, 'temp_concat.mp4')
                    list_file = os.path.join(rec_folder, 'file_list.txt')

                    with open(list_file, 'w') as f:
                        f.write(f"file '{final_recording}'\n")
                        f.write(f"file '{next_segment}'\n")

                    concat_command = [
                        ffmpeg_path,
                        '-f', 'concat',
                        '-safe', '0',
                        '-i', list_file,
                        '-c', 'copy',
                        temp_concat
                    ]

                    subprocess.run(concat_command, check=True)

                    os.replace(temp_concat, final_recording)
                    os.remove(next_segment)
            else:
                time.sleep(1)

    finally:
        process.terminate()
        process.wait()

        for f in os.listdir(rec_folder):
            if f.startswith('output_') and f.endswith('.mp4'):
                os.remove(os.path.join(rec_folder, f))
        
        list_file = os.path.join(rec_folder, 'file_list.txt')
        if os.path.exists(list_file):
            os.remove(list_file)
    
try:
    print("[INFO] Iniciando segmentação HLS em paralelo a Gravação MP4 das imagens.")

    t1 = threading.Thread(target=hls_capture)
    #t2 = threading.Thread(target=rtsp_recording)

    t1.start()
    #t2.start()

    #t1.join()
    #t2.join()

    while True:
        files = os.listdir(hls_folder)
        for f in files:
            if f not in uploaded and not f.endswith('.tmp'):
                    liveupload_to_s3(AF_ACCESS_KEY, AF_SECRET_KEY, os.path.join(hls_folder, f), 'bucket-teste-live-camera1', f)
                    if not f.endswith('.m3u8'):
                        uploaded.add(f)

except KeyboardInterrupt:
    print("[AVISO] Encerrando segmentação e gravação.")