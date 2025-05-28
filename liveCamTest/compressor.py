import subprocess
import os

ffmpeg_folder = os.path.join(os.getcwd(), 'liveCamTest/ffmpeg-essentials/bin')
ffmpeg_path = os.path.join(ffmpeg_folder, 'ffmpeg.exe')

def compress_video(input_path, output_path, resolution='640x360', fps=10, bitrate='500k'):
    command = [
        ffmpeg_path,
        '-i', input_path,
        '-r', str(fps),
        '-s', resolution,
        '-b:v', bitrate,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-y',
        output_path 
    ]

    try:
        subprocess.run(command, check=True)
        print(f"Vídeo comprimido com sucesso: {output_path}")

        return True
    except subprocess.CalledProcessError as e:
        print(f"Erro ao comprimir vídeo (arquivo corrompido?), traceback: {e}")

        return False